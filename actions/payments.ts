'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { sendOrderConfirmationEmail, sendAdminNewSaleEmail } from '@/lib/email/resend';
import crypto from 'crypto';

export async function verifyPaymentAndFulfillOrder({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Please sign in' };
  }

  // 1. Verify Razorpay cryptographic signature server-side
  let isValid = false;
  try {
    isValid = await verifyRazorpayPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
  } catch (err) {
    console.error('Signature verification error:', err);
    return { success: false, error: 'Payment signature verification failed' };
  }

  if (!isValid) {
    return { success: false, error: 'Invalid payment cryptographic signature' };
  }

  const adminClient = createAdminClient();

  // 2. Fetch order and verify existence
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('*, order_items(*, product:products(slug, title))')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Order record not found' };
  }

  const primaryProductSlug = order.order_items?.[0]?.product?.slug || 'digital-product';

  // 3. Generate or retrieve 5-Minute Cryptographic Fulfillment Token
  let fulfillmentToken = '';
  const { data: existingToken } = await adminClient
    .from('order_fulfillment_tokens')
    .select('token, expires_at')
    .eq('order_id', order.id)
    .maybeSingle();

  if (existingToken && new Date(existingToken.expires_at) > new Date()) {
    fulfillmentToken = existingToken.token;
  } else {
    fulfillmentToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await adminClient.from('order_fulfillment_tokens').upsert(
      {
        order_id: order.id,
        token: fulfillmentToken,
        expires_at: tokenExpiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );
  }

  // Idempotency check: If already fulfilled, return token and productSlug immediately
  if (order.status === 'paid' || order.status === 'fulfilled') {
    return {
      success: true,
      orderNumber: order.order_number,
      fulfillmentToken,
      productSlug: primaryProductSlug,
    };
  }

  // 4. Record Payment in Database
  await adminClient.from('payments').insert({
    order_id: order.id,
    payment_gateway: 'razorpay',
    transaction_id: razorpayPaymentId,
    amount: order.total,
    currency: order.currency || 'INR',
    status: 'captured',
    raw_response: {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    },
  });

  // 5. Update Order Status to Fulfilled & Delivered
  await adminClient
    .from('orders')
    .update({
      status: 'fulfilled',
      payment_status: 'paid',
      fulfillment_status: 'delivered',
      delivery_status: 'delivered',
      delivered_at: new Date().toISOString(),
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  // 6. Grant Permanent Customer Entitlements
  const items = order.order_items || [];
  for (const item of items) {
    if (item.product_id) {
      const { data: prod } = await adminClient
        .from('products')
        .select('download_limit, download_expiry_days')
        .eq('id', item.product_id)
        .single();

      const downloadLimit = prod?.download_limit || 10;
      const expiryDays = prod?.download_expiry_days || 365;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      await adminClient
        .from('customer_entitlements')
        .upsert(
          {
            user_id: order.user_id,
            product_id: item.product_id,
            order_id: order.id,
            download_limit: downloadLimit,
            downloads_used: 0,
            expires_at: expiresAt,
            is_active: true,
          },
          { onConflict: 'user_id,product_id,order_id' }
        );
    }
  }

  // 7. Record Creator Commission if creator snapshot exists
  if (order.creator_name_snapshot && order.creator_commission_amount) {
    await adminClient.from('creator_commissions').upsert(
      {
        order_id: order.id,
        coupon_id: order.coupon_id,
        creator_name: order.creator_name_snapshot,
        coupon_code: order.coupon_code_snapshot || 'CREATOR_PROMO',
        order_amount: order.total,
        commission_type: order.creator_commission_type || 'percentage',
        commission_value: order.creator_commission_value || 0,
        commission_amount: order.creator_commission_amount,
        status: 'pending',
      },
      { onConflict: 'order_id' }
    );
  }

  // 8. Record coupon usage
  if (order.coupon_id) {
    await adminClient.from('coupon_usage').insert({
      coupon_id: order.coupon_id,
      user_id: order.user_id,
      order_id: order.id,
    });

    const { data: cpn } = await adminClient
      .from('coupons')
      .select('times_used')
      .eq('id', order.coupon_id)
      .single();

    if (cpn) {
      await adminClient
        .from('coupons')
        .update({ times_used: (cpn.times_used || 0) + 1 })
        .eq('id', order.coupon_id);
    }
  }

  // 9. Dispatch Customer Confirmation & Admin New Sale Emails ASYNCHRONOUSLY (Non-blocking)
  Promise.allSettled([
    sendOrderConfirmationEmail({
      email: order.customer_email,
      customerName: order.customer_name || 'Valued Customer',
      orderNumber: order.order_number,
      totalAmount: order.total,
      items: items.map((i: any) => ({
        productName: i.product_name_snapshot,
        price: i.price_snapshot,
      })),
      fulfillmentToken,
      couponCode: order.coupon_code_snapshot,
    }),
    sendAdminNewSaleEmail({
      orderNumber: order.order_number,
      razorpayOrderId,
      razorpayPaymentId,
      customerName: order.customer_name || 'Customer',
      customerPhone: order.customer_phone || undefined,
      customerEmail: order.customer_email,
      items: items.map((i: any) => ({
        productName: i.product_name_snapshot,
        quantity: i.quantity || 1,
        price: i.price_snapshot,
      })),
      originalAmount: order.subtotal || order.total,
      discountAmount: order.discount || 0,
      finalAmount: order.total,
      couponCode: order.coupon_code_snapshot,
      creatorName: order.creator_name_snapshot,
      creatorCommissionAmount: order.creator_commission_amount,
    }),
  ]).catch((e) => console.error('Asynchronous email dispatch error:', e));

  // 10. Return immediately for ultra-fast customer redirect
  return {
    success: true,
    orderNumber: order.order_number,
    fulfillmentToken,
    productSlug: primaryProductSlug,
  };
}
