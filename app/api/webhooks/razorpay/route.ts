import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { sendOrderConfirmationEmail, sendAdminNewSaleEmail } from '@/lib/email/resend';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // 1. Verify Webhook Cryptographic Signature
    try {
      const isValid = await verifyRazorpayWebhookSignature({
        rawBody,
        signature,
      });

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    } catch (err) {
      console.error('Webhook signature verification exception:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.event_id || `${event.event}_${event.created_at || Date.now()}`;
    const eventType = event.event;
    const payload = event.payload;

    const supabase = createAdminClient();

    // 2. Idempotency Check: Ignore duplicate events
    const { data: existingEvent } = await supabase
      .from('razorpay_webhook_events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    // Record the webhook event to prevent duplicate fulfillment
    await supabase.from('razorpay_webhook_events').insert({
      id: eventId,
      event_type: eventType,
      payload: event,
    });

    // 3. Process Events
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentEntity = payload.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id || payload.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (!rzpOrderId) {
        return NextResponse.json({ error: 'No order reference found in payload' }, { status: 400 });
      }

      // Fetch order from database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('razorpay_order_id', rzpOrderId)
        .maybeSingle();

      if (orderError || !order) {
        console.warn(`Webhook: Order not found for Razorpay Order ID: ${rzpOrderId}`);
        return NextResponse.json({ status: 'order_not_found' }, { status: 200 });
      }

      // Generate or reuse 5-minute fulfillment token
      let fulfillmentToken = '';
      const { data: existingToken } = await supabase
        .from('order_fulfillment_tokens')
        .select('token, expires_at')
        .eq('order_id', order.id)
        .maybeSingle();

      if (existingToken && new Date(existingToken.expires_at) > new Date()) {
        fulfillmentToken = existingToken.token;
      } else {
        fulfillmentToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabase.from('order_fulfillment_tokens').upsert(
          {
            order_id: order.id,
            token: fulfillmentToken,
            expires_at: tokenExpiresAt,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'order_id' }
        );
      }

      // If not already fulfilled, fulfill order
      if (order.status !== 'fulfilled' && order.status !== 'paid') {
        // Record payment
        await supabase.from('payments').insert({
          order_id: order.id,
          payment_gateway: 'razorpay',
          transaction_id: paymentId || `rzp_${Date.now()}`,
          amount: order.total,
          currency: order.currency || 'INR',
          status: 'captured',
          raw_response: payload,
        });

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'fulfilled',
            payment_status: 'paid',
            fulfillment_status: 'delivered',
            delivery_status: 'delivered',
            delivered_at: new Date().toISOString(),
            razorpay_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        // Grant customer entitlements
        const items = order.order_items || [];
        for (const item of items) {
          if (item.product_id) {
            const { data: prod } = await supabase
              .from('products')
              .select('download_limit, download_expiry_days')
              .eq('id', item.product_id)
              .maybeSingle();

            const downloadLimit = prod?.download_limit || 10;
            const expiryDays = prod?.download_expiry_days || 365;
            const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

            await supabase.from('customer_entitlements').upsert(
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

        // Record creator commission if applicable
        if (order.creator_name_snapshot && order.creator_commission_amount) {
          await supabase.from('creator_commissions').upsert(
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

        // Asynchronously dispatch confirmation & admin sale emails (non-blocking)
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
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: paymentId,
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
            verificationStatus: 'Webhook Verified & Captured',
          }),
        ]).catch((e) => console.error('Webhook async email dispatch error:', e));
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const failureReason = paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed or declined by customer bank';

      if (rzpOrderId) {
        await supabase
          .from('orders')
          .update({
            status: 'failed',
            payment_status: 'payment_failed',
            fulfillment_status: 'failed',
            payment_failed_at: new Date().toISOString(),
            failure_reason: failureReason,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', rzpOrderId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
