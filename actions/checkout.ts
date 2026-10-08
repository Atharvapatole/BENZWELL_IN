'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient, getRazorpayCredentials } from '@/lib/razorpay';
import { generateOrderNumber } from '@/lib/utils';
import { CreateOrderSchema } from '@/schemas';

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  code?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  creatorName?: string | null;
  creatorCommissionType?: 'percentage' | 'fixed' | null;
  creatorCommissionValue?: number | null;
  message: string;
}

/**
 * Validate a coupon server-side against the subtotal and items
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  productIds: string[] = []
): Promise<CouponValidationResult> {
  if (!code || !code.trim()) {
    return { valid: false, discountAmount: 0, message: 'Coupon code cannot be empty' };
  }

  const supabase = createAdminClient();
  const normalizedCode = code.toUpperCase().trim();

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    return { valid: false, discountAmount: 0, message: 'Invalid or inactive coupon code' };
  }

  // 1. Check validity dates
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, discountAmount: 0, message: 'Coupon is not active yet' };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, discountAmount: 0, message: 'Coupon has expired' };
  }

  // 2. Check total usage limit
  if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
    return { valid: false, discountAmount: 0, message: 'Coupon usage limit has been reached' };
  }

  // 3. Check minimum order amount
  if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Minimum order amount of ₹${coupon.min_order_amount} required for this coupon`,
    };
  }

  // 4. Calculate discount
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
    if (coupon.max_discount_amount && discountAmount > Number(coupon.max_discount_amount)) {
      discountAmount = Number(coupon.max_discount_amount);
    }
  } else if (coupon.discount_type === 'fixed') {
    discountAmount = Math.min(Number(coupon.discount_value), subtotal);
  }

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    discountAmount: Math.round(discountAmount * 100) / 100,
    creatorName: coupon.creator_name || null,
    creatorCommissionType: coupon.creator_commission_type || null,
    creatorCommissionValue: coupon.creator_commission_value ? Number(coupon.creator_commission_value) : null,
    message: 'Coupon applied successfully',
  };
}

/**
 * Create order and initialize Razorpay order securely server-side
 */
export async function createCheckoutOrder(
  cartItems: { productId: string; quantity: number }[],
  couponCode?: string | null,
  customerDetails?: { fullName: string; email: string; phone: string }
) {
  // 1. Ensure user is authenticated (Guest checkout not allowed)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Authentication required. Please create an account or sign in to complete your purchase.',
      requiresAuth: true,
    };
  }

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: 'Your cart is empty' };
  }

  const adminClient = createAdminClient();

  // 2. Fetch true product prices and info from database
  const productIds = cartItems.map((i) => i.productId);
  const { data: dbProducts, error: prodError } = await adminClient
    .from('products')
    .select('id, title, price, sale_price, status, slug')
    .in('id', productIds)
    .eq('status', 'published');

  if (prodError || !dbProducts || dbProducts.length === 0) {
    return { success: false, error: 'Selected products could not be verified' };
  }

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // 3. Calculate authoritative subtotal
  let subtotal = 0;
  const orderItemSnapshots: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }> = [];

  for (const item of cartItems) {
    const dbProd = productMap.get(item.productId);
    if (!dbProd) {
      return { success: false, error: `Product not available for purchase` };
    }

    const effectivePrice = dbProd.sale_price !== null && dbProd.sale_price !== undefined
      ? Number(dbProd.sale_price)
      : Number(dbProd.price);

    const qty = Math.max(1, item.quantity || 1);
    subtotal += effectivePrice * qty;

    orderItemSnapshots.push({
      productId: dbProd.id,
      productName: dbProd.title,
      price: effectivePrice,
      quantity: qty,
    });
  }

  // 4. Validate coupon if provided & calculate creator snapshots
  let discount = 0;
  let appliedCouponId: string | null = null;
  let couponCodeSnapshot: string | null = null;
  let creatorNameSnapshot: string | null = null;
  let discountTypeSnapshot: string | null = null;
  let discountValueSnapshot: number | null = null;
  let creatorCommissionTypeSnapshot: string | null = null;
  let creatorCommissionValueSnapshot: number | null = null;
  let creatorCommissionAmountSnapshot: number | null = null;

  if (couponCode) {
    const couponValidation = await validateCoupon(couponCode, subtotal, productIds);
    if (couponValidation.valid && couponValidation.couponId) {
      discount = couponValidation.discountAmount;
      appliedCouponId = couponValidation.couponId;
      couponCodeSnapshot = couponValidation.code || null;
      creatorNameSnapshot = couponValidation.creatorName || null;
      discountTypeSnapshot = couponValidation.discountType || null;
      discountValueSnapshot = couponValidation.discountValue || null;
      creatorCommissionTypeSnapshot = couponValidation.creatorCommissionType || null;
      creatorCommissionValueSnapshot = couponValidation.creatorCommissionValue || null;
    }
  }

  const finalTotal = Math.max(0, subtotal - discount);

  // Calculate creator commission amount from final total
  if (creatorNameSnapshot && creatorCommissionValueSnapshot) {
    if (creatorCommissionTypeSnapshot === 'percentage') {
      creatorCommissionAmountSnapshot = Math.round(((finalTotal * creatorCommissionValueSnapshot) / 100) * 100) / 100;
    } else {
      creatorCommissionAmountSnapshot = Math.min(creatorCommissionValueSnapshot, finalTotal);
    }
  }

  const firstItem = orderItemSnapshots[0];
  const firstDbProd = firstItem ? productMap.get(firstItem.productId) : null;
  const primaryProductSlug = firstDbProd?.slug || 'digital-product';
  const primaryProductId = firstItem?.productId || null;
  const primaryProductName = firstItem?.productName || null;
  const primaryProductPrice = firstItem?.price || null;

  const orderNumber = generateOrderNumber();

  // 5. Create Order in Database with historical snapshots
  const { data: newOrder, error: orderError } = await adminClient
    .from('orders')
    .insert({
      order_number: orderNumber,
      order_type: 'razorpay_purchase',
      user_id: user.id,
      customer_email: user.email || customerDetails?.email || '',
      customer_email_snapshot: user.email || customerDetails?.email || '',
      customer_name: customerDetails?.fullName || user.user_metadata?.full_name || '',
      customer_name_snapshot: customerDetails?.fullName || user.user_metadata?.full_name || '',
      customer_phone: customerDetails?.phone || user.user_metadata?.phone || null,
      customer_phone_snapshot: customerDetails?.phone || user.user_metadata?.phone || null,
      product_id: primaryProductId,
      product_name_snapshot: primaryProductName,
      product_slug_snapshot: primaryProductSlug,
      product_price_snapshot: primaryProductPrice,
      subtotal,
      subtotal_amount: subtotal,
      discount,
      discount_amount: discount,
      total: finalTotal,
      final_amount: finalTotal,
      currency: 'INR',
      status: 'pending',
      payment_status: 'unpaid',
      fulfillment_status: 'not_available',
      delivery_status: 'pending',
      coupon_id: appliedCouponId,
      coupon_code: couponCodeSnapshot,
      coupon_code_snapshot: couponCodeSnapshot,
      creator_name_snapshot: creatorNameSnapshot,
      discount_type: discountTypeSnapshot,
      discount_value: discountValueSnapshot,
      creator_commission_type: creatorCommissionTypeSnapshot,
      creator_commission_value: creatorCommissionValueSnapshot,
      creator_commission_amount: creatorCommissionAmountSnapshot,
    })
    .select('id, order_number, total, currency')
    .single();

  if (orderError || !newOrder) {
    console.error('Order creation error:', orderError);
    return { success: false, error: 'Could not initialize order. Please try again.' };
  }

  // 6. Insert Order Items Snapshots
  const itemsToInsert = orderItemSnapshots.map((item) => ({
    order_id: newOrder.id,
    product_id: item.productId,
    product_name_snapshot: item.productName,
    price_snapshot: item.price,
    quantity: item.quantity,
  }));

  await adminClient.from('order_items').insert(itemsToInsert);

  // 7. If total is 0 (e.g. 100% coupon), fulfill immediately without payment gateway
  if (finalTotal === 0) {
    await adminClient
      .from('orders')
      .update({
        status: 'fulfilled',
        payment_status: 'captured',
        fulfillment_status: 'delivered',
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', newOrder.id);

    // Grant customer entitlements
    for (const item of orderItemSnapshots) {
      await adminClient.from('customer_entitlements').insert({
        user_id: user.id,
        product_id: item.productId,
        order_id: newOrder.id,
        download_limit: 10,
        downloads_used: 0,
      });
    }

    const { randomBytes } = await import('crypto');
    const fulfillmentToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await adminClient.from('order_fulfillment_tokens').upsert(
      {
        order_id: newOrder.id,
        token: fulfillmentToken,
        expires_at: tokenExpiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );

    const firstItem = orderItemSnapshots[0];
    const firstDbProd = firstItem ? productMap.get(firstItem.productId) : null;
    const primaryProductSlug = firstDbProd?.slug || 'digital-product';

    return {
      success: true,
      freeOrder: true,
      orderId: newOrder.id,
      orderNumber: newOrder.order_number,
      fulfillmentToken,
      productSlug: primaryProductSlug,
    };
  }

  // 8. Create Razorpay Order
  const { keyId } = await getRazorpayCredentials();
  const razorpay = await getRazorpayClient();
  if (!razorpay) {
    return {
      success: false,
      error: 'Online payments are currently unavailable. Please try again later.',
    };
  }

  try {
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(finalTotal * 100), // Amount in paise
      currency: 'INR',
      receipt: newOrder.order_number,
      notes: {
        orderId: newOrder.id,
        userId: user.id,
        orderNumber: newOrder.order_number,
      },
    });

    // Update order with razorpay_order_id
    await adminClient
      .from('orders')
      .update({
        razorpay_order_id: rzpOrder.id,
        status: 'payment_processing',
      })
      .eq('id', newOrder.id);

    return {
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.order_number,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      customerEmail: user.email,
      customerName: customerDetails?.fullName || user.user_metadata?.full_name || '',
      customerPhone: customerDetails?.phone || '',
    };
  } catch (rzpErr: any) {
    console.error('Razorpay order creation failed:', rzpErr);
    return {
      success: false,
      error: 'Payment gateway initialization failed. Please try again later.',
    };
  }
}
