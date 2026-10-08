'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';
import {
  ProductSchema,
  ProductCategorySchema,
  CouponSchema,
  BlogSchema,
  PageSchema,
} from '@/schemas';
import { sendOrderConfirmationEmail, sendGiftProductEmail } from '@/lib/email/resend';
import { getRazorpayClient } from '@/lib/razorpay';
import { generateOrderNumber } from '@/lib/utils';

/**
 * Log Admin Action
 */
async function logAdminAction(
  userId: string,
  userEmail: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, any>
) {
  try {
    const supabase = createAdminClient();
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      action,
      entity,
      entity_id: entityId || null,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// -----------------------------------------------------------------------------
// PRODUCT MANAGEMENT
// -----------------------------------------------------------------------------

export async function createProductAction(data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  const { data: newProd, error } = await adminClient
    .from('products')
    .insert({
      ...parsed.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !newProd) {
    return { success: false, error: error?.message || 'Failed to create product' };
  }

  await logAdminAction(user.id, profile.email, 'CREATE_PRODUCT', 'products', newProd.id, {
    title: newProd.title,
    price: newProd.price,
  });

  revalidatePath('/shop');
  revalidatePath(`/product/${newProd.slug}`);
  revalidatePath('/admin/products');

  return { success: true, product: newProd };
}

export async function updateProductAction(id: string, data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  const { data: updatedProd, error } = await adminClient
    .from('products')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedProd) {
    return { success: false, error: error?.message || 'Failed to update product' };
  }

  await logAdminAction(user.id, profile.email, 'UPDATE_PRODUCT', 'products', id, {
    title: updatedProd.title,
  });

  revalidatePath('/shop');
  revalidatePath(`/product/${updatedProd.slug}`);
  revalidatePath('/admin/products');

  return { success: true, product: updatedProd };
}

export async function deleteProductAction(id: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient.from('products').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'DELETE_PRODUCT', 'products', id);

  revalidatePath('/shop');
  revalidatePath('/admin/products');
  return { success: true };
}

export async function duplicateProductAction(id: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { data: original, error: fetchErr } = await adminClient
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !original) return { success: false, error: 'Product not found' };

  const { id: _, created_at: __, updated_at: ___, sales_count: ____, ...cloneData } = original;
  cloneData.title = `${cloneData.title} (Copy)`;
  cloneData.slug = `${cloneData.slug}-copy-${Math.floor(Math.random() * 1000)}`;
  cloneData.status = 'draft';

  const { data: newProd, error: insertErr } = await adminClient
    .from('products')
    .insert(cloneData)
    .select()
    .single();

  if (insertErr || !newProd) return { success: false, error: insertErr?.message };

  await logAdminAction(user.id, profile.email, 'DUPLICATE_PRODUCT', 'products', newProd.id);

  revalidatePath('/admin/products');
  return { success: true, product: newProd };
}

// -----------------------------------------------------------------------------
// CATEGORY MANAGEMENT
// -----------------------------------------------------------------------------

export async function createCategoryAction(data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = ProductCategorySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const { data: newCat, error } = await adminClient
    .from('product_categories')
    .insert(parsed.data)
    .select()
    .single();

  if (error || !newCat) return { success: false, error: error?.message };

  await logAdminAction(user.id, profile.email, 'CREATE_CATEGORY', 'categories', newCat.id);

  revalidatePath('/shop');
  revalidatePath('/admin/categories');
  return { success: true, category: newCat };
}

export async function updateCategoryAction(id: string, data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = ProductCategorySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const { data: updatedCat, error } = await adminClient
    .from('product_categories')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedCat) return { success: false, error: error?.message };

  await logAdminAction(user.id, profile.email, 'UPDATE_CATEGORY', 'categories', id);

  revalidatePath('/shop');
  revalidatePath('/admin/categories');
  return { success: true, category: updatedCat };
}

export async function deleteCategoryAction(id: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient.from('product_categories').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'DELETE_CATEGORY', 'categories', id);

  revalidatePath('/shop');
  revalidatePath('/admin/categories');
  return { success: true };
}

// -----------------------------------------------------------------------------
// ORDER MANAGEMENT
// -----------------------------------------------------------------------------

export async function updateOrderStatusAction(orderId: string, status: string, paymentStatus?: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const updatePayload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus) {
    updatePayload.payment_status = paymentStatus;
  }

  const { error } = await adminClient.from('orders').update(updatePayload).eq('id', orderId);
  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'UPDATE_ORDER_STATUS', 'orders', orderId, {
    status,
    paymentStatus,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export async function resendOrderEmailAction(orderId: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { data: order, error } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (error || !order) return { success: false, error: 'Order not found' };

  await sendOrderConfirmationEmail({
    email: order.customer_email,
    customerName: order.customer_name || 'Customer',
    orderNumber: order.order_number,
    totalAmount: order.total,
    items: (order.order_items || []).map((i: any) => ({
      productName: i.product_name_snapshot,
      price: i.price_snapshot,
    })),
  });

  await logAdminAction(user.id, profile.email, 'RESEND_ORDER_EMAIL', 'orders', orderId);

  return { success: true, message: 'Order confirmation email resent successfully' };
}

// -----------------------------------------------------------------------------
// CUSTOMER MANAGEMENT
// -----------------------------------------------------------------------------

export async function toggleCustomerStatusAction(customerId: string, isDisabled: boolean) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient
    .from('profiles')
    .update({ is_disabled: isDisabled, updated_at: new Date().toISOString() })
    .eq('id', customerId);

  if (error) return { success: false, error: error.message };

  await logAdminAction(
    user.id,
    profile.email,
    isDisabled ? 'DISABLE_CUSTOMER' : 'ENABLE_CUSTOMER',
    'customers',
    customerId
  );

  revalidatePath('/admin/customers');
  return { success: true };
}

// -----------------------------------------------------------------------------
// COUPON MANAGEMENT
// -----------------------------------------------------------------------------

export async function createCouponAction(data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = CouponSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const { data: newCoupon, error } = await adminClient
    .from('coupons')
    .insert(parsed.data)
    .select()
    .single();

  if (error || !newCoupon) return { success: false, error: error?.message };

  await logAdminAction(user.id, profile.email, 'CREATE_COUPON', 'coupons', newCoupon.id, {
    code: newCoupon.code,
  });

  revalidatePath('/admin/coupons');
  return { success: true, coupon: newCoupon };
}

export async function deleteCouponAction(id: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient.from('coupons').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'DELETE_COUPON', 'coupons', id);

  revalidatePath('/admin/coupons');
  return { success: true };
}

// -----------------------------------------------------------------------------
// REVIEW MANAGEMENT
// -----------------------------------------------------------------------------

export async function updateReviewStatusAction(reviewId: string, status: 'approved' | 'rejected' | 'pending') {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient
    .from('reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'MODERATE_REVIEW', 'reviews', reviewId, { status });

  revalidatePath('/admin/reviews');
  return { success: true };
}

// -----------------------------------------------------------------------------
// BLOG MANAGEMENT
// -----------------------------------------------------------------------------

export async function createBlogAction(data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = BlogSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const { data: newBlog, error } = await adminClient
    .from('blogs')
    .insert({
      ...parsed.data,
      published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !newBlog) return { success: false, error: error?.message };

  await logAdminAction(user.id, profile.email, 'CREATE_BLOG', 'blogs', newBlog.id, {
    title: newBlog.title,
  });

  revalidatePath('/blog');
  revalidatePath('/admin/blogs');
  return { success: true, blog: newBlog };
}

export async function updateBlogAction(id: string, data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = BlogSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const { data: updatedBlog, error } = await adminClient
    .from('blogs')
    .update({
      ...parsed.data,
      published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedBlog) return { success: false, error: error?.message };

  await logAdminAction(user.id, profile.email, 'UPDATE_BLOG', 'blogs', id);

  revalidatePath('/blog');
  revalidatePath(`/blog/${updatedBlog.slug}`);
  revalidatePath('/admin/blogs');
  return { success: true, blog: updatedBlog };
}

export async function deleteBlogAction(id: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient.from('blogs').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'DELETE_BLOG', 'blogs', id);

  revalidatePath('/blog');
  revalidatePath('/admin/blogs');
  return { success: true };
}

// -----------------------------------------------------------------------------
// VISUAL PAGE BUILDER CMS
// -----------------------------------------------------------------------------

export async function savePageAction(data: any) {
  const { user, profile, adminClient } = await requireAdmin();

  const parsed = PageSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const { data: savedPage, error } = await adminClient
    .from('pages')
    .upsert(
      {
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (error || !savedPage) return { success: false, error: error?.message };

  await logAdminAction(user.id, profile.email, 'SAVE_PAGE', 'pages', savedPage.id, {
    slug: savedPage.slug,
    status: savedPage.status,
  });

  revalidatePath(`/${savedPage.slug}`);
  revalidatePath('/admin/pages');
  return { success: true, page: savedPage };
}

// -----------------------------------------------------------------------------
// SITE SETTINGS MANAGEMENT
// -----------------------------------------------------------------------------

export async function updateSiteSettingsAction(key: string, value: any, category: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient
    .from('site_settings')
    .upsert(
      {
        key,
        value,
        category,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'key' }
    );

  if (error) return { success: false, error: error.message };

  await logAdminAction(user.id, profile.email, 'UPDATE_SETTINGS', 'site_settings', key);

  revalidatePath('/');
  revalidatePath('/admin/settings');
  return { success: true };
}

// -----------------------------------------------------------------------------
// ORDER ID VERIFICATION & LIVE RAZORPAY AUDIT
// -----------------------------------------------------------------------------

export async function lookupOrderForVerificationAction(query: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const q = query.trim();
  if (!q) return { success: false, error: 'Please enter an Order ID or Payment ID to verify.' };

  // 1. Search by order_number (e.g. BW-123456), razorpay_order_id, razorpay_payment_id, or UUID
  let queryBuilder = supabase
    .from('orders')
    .select(`
      *,
      order_items(*, product:products(id, title, slug, main_image, product_type)),
      customer_entitlements(*),
      payments(*),
      creator_commissions(*)
    `)
    .or(`order_number.ilike.%${q}%,razorpay_order_id.eq.${q},razorpay_payment_id.eq.${q},id.eq.${q.length === 36 ? q : '00000000-0000-0000-0000-000000000000'}`);

  const { data: orders, error } = await queryBuilder;

  if (error || !orders || orders.length === 0) {
    return { success: false, error: `No order found matching "${q}".` };
  }

  const order = orders[0];

  // Fetch download logs for entitlements
  const entitlementIds = (order.customer_entitlements || []).map((e: any) => e.id);
  let downloadLogs: any[] = [];
  if (entitlementIds.length > 0) {
    const { data: dLogs } = await supabase
      .from('downloads')
      .select('*')
      .in('entitlement_id', entitlementIds)
      .order('downloaded_at', { ascending: false });
    downloadLogs = dLogs || [];
  }

  return {
    success: true,
    order: {
      ...order,
      download_logs: downloadLogs,
    },
    matchesCount: orders.length,
  };
}

export async function verifyOrderWithRazorpayLiveAction(orderId: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { data: order, error } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { success: false, error: 'Order not found in database.' };
  }

  const razorpay = await getRazorpayClient();
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay API credentials are not configured on this environment.',
    };
  }

  try {
    let rzpOrderData: any = null;
    let rzpPaymentData: any = null;

    if (order.razorpay_order_id) {
      try {
        rzpOrderData = await razorpay.orders.fetch(order.razorpay_order_id);
      } catch (e: any) {
        console.warn('Razorpay order fetch warning:', e.message);
      }
    }

    if (order.razorpay_payment_id) {
      try {
        rzpPaymentData = await razorpay.payments.fetch(order.razorpay_payment_id);
      } catch (e: any) {
        console.warn('Razorpay payment fetch warning:', e.message);
      }
    } else if (order.razorpay_order_id) {
      try {
        const paymentsList: any = await razorpay.orders.fetchPayments(order.razorpay_order_id);
        if (paymentsList?.items && paymentsList.items.length > 0) {
          rzpPaymentData = paymentsList.items[0];
        }
      } catch (e: any) {
        console.warn('Razorpay fetch payments warning:', e.message);
      }
    }

    const isCaptured = rzpPaymentData?.status === 'captured';

    // If live payment is captured on Razorpay but pending in database, fulfill atomically
    if (isCaptured && order.status !== 'fulfilled' && order.status !== 'paid') {
      await adminClient
        .from('orders')
        .update({
          status: 'fulfilled',
          payment_status: 'captured',
          razorpay_payment_id: rzpPaymentData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Create permanent entitlements
      const items = order.order_items || [];
      for (const item of items) {
        if (item.product_id) {
          await adminClient.from('customer_entitlements').upsert(
            {
              user_id: order.user_id,
              product_id: item.product_id,
              order_id: order.id,
              download_limit: 10,
              downloads_used: 0,
              is_active: true,
            },
            { onConflict: 'user_id,product_id,order_id' }
          );
        }
      }
    }

    await logAdminAction(user.id, profile.email, 'VERIFY_ORDER_RAZORPAY_LIVE', 'orders', order.id, {
      rzpPaymentId: rzpPaymentData?.id || null,
      status: rzpPaymentData?.status || 'unknown',
    });

    revalidatePath(`/admin/orders`);
    revalidatePath(`/admin/orders/${order.id}`);

    return {
      success: true,
      orderStatus: isCaptured ? 'fulfilled' : order.status,
      rzpOrder: rzpOrderData,
      rzpPayment: rzpPaymentData,
      message: isCaptured
        ? 'Payment verified as CAPTURED with live Razorpay API.'
        : `Live Razorpay status: ${rzpPaymentData?.status || 'Payment pending or not initiated'}`,
    };
  } catch (err: any) {
    console.error('Razorpay live verification exception:', err);
    return {
      success: false,
      error: err?.message || 'Failed to query live Razorpay API.',
    };
  }
}

// -----------------------------------------------------------------------------
// GIFT PRODUCT / MANUAL GRANT TO CUSTOMER
// -----------------------------------------------------------------------------

export async function giftProductAction({
  customerId,
  productId,
  giftReason,
  adminNote,
  messageToCustomer,
}: {
  customerId: string;
  productId: string;
  giftReason?: string;
  adminNote?: string;
  messageToCustomer?: string;
}) {
  try {
    const { user, profile, adminClient } = await requireAdmin();

    if (!customerId || !productId) {
      return { success: false, error: 'Customer ID and Product ID are required.' };
    }

    // 1. Fetch target customer
    const { data: customer, error: custErr } = await adminClient
      .from('profiles')
      .select('id, email, full_name, phone')
      .eq('id', customerId)
      .single();

    if (custErr || !customer) {
      return { success: false, error: 'Customer not found.' };
    }

    // 2. Fetch target product
    const { data: product, error: prodErr } = await adminClient
      .from('products')
      .select('id, title, slug, price, sale_price, download_limit, download_expiry_days')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      return { success: false, error: 'Product not found.' };
    }

    const orderNumber = generateOrderNumber();
    const effectivePrice = product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : Number(product.price);

    // 3. Create Gift Order in Database
    const { data: giftOrder, error: orderErr } = await adminClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        order_type: 'admin_gift',
        user_id: customer.id,
        customer_email: customer.email,
        customer_email_snapshot: customer.email,
        customer_name: customer.full_name || 'Customer',
        customer_name_snapshot: customer.full_name || 'Customer',
        customer_phone: customer.phone || null,
        customer_phone_snapshot: customer.phone || null,
        product_id: product.id,
        product_name_snapshot: product.title,
        product_slug_snapshot: product.slug,
        product_price_snapshot: effectivePrice,
        subtotal: 0,
        subtotal_amount: 0,
        discount: 0,
        discount_amount: 0,
        total: 0,
        final_amount: 0,
        currency: 'INR',
        status: 'fulfilled',
        payment_status: 'gifted',
        fulfillment_status: 'delivered',
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        gift_reason: giftReason?.trim() || 'Admin Courtesy Grant',
        admin_note: adminNote?.trim() || null,
        gift_message: messageToCustomer?.trim() || null,
        gifted_by: user.id,
      })
      .select()
      .single();

    if (orderErr || !giftOrder) {
      console.error('Failed to create gift order:', orderErr);
      return { success: false, error: orderErr?.message || 'Failed to create gift order record.' };
    }

    // 4. Create Order Item Snapshot
    await adminClient.from('order_items').insert({
      order_id: giftOrder.id,
      product_id: product.id,
      product_name_snapshot: product.title,
      price_snapshot: 0,
      quantity: 1,
    });

    // 5. Create / Upsert Customer Entitlement
    const downloadLimit = product.download_limit || 10;
    const expiryDays = product.download_expiry_days || 365;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: entErr } = await adminClient
      .from('customer_entitlements')
      .upsert(
        {
          user_id: customer.id,
          product_id: product.id,
          order_id: giftOrder.id,
          download_limit: downloadLimit,
          downloads_used: 0,
          expires_at: expiresAt,
          is_active: true,
          is_gift: true,
          gift_message: messageToCustomer?.trim() || null,
          gifted_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id,order_id' }
      );

    if (entErr) {
      console.error('Failed to grant entitlement for gift:', entErr);
    }

    // 6. Log Audit Action
    await logAdminAction(user.id, profile.email, 'GIFT_PRODUCT', 'orders', giftOrder.id, {
      orderNumber,
      customerId: customer.id,
      customerEmail: customer.email,
      productId: product.id,
      productTitle: product.title,
      giftReason,
    });

    // 7. Send Gift Notification Email asynchronously
    sendGiftProductEmail({
      toEmail: customer.email,
      customerName: customer.full_name || 'Valued Creator',
      productName: product.title,
      message: messageToCustomer || undefined,
    }).catch((e) => console.error('Error sending gift email:', e));

    revalidatePath('/admin/orders');
    revalidatePath('/admin/customers');
    revalidatePath('/account/downloads');

    return {
      success: true,
      orderNumber,
      orderId: giftOrder.id,
      message: `Successfully gifted "${product.title}" to ${customer.email}. Order #${orderNumber} generated.`,
    };
  } catch (err: any) {
    console.error('giftProductAction error in admin.ts:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while gifting product.' };
  }
}

// -----------------------------------------------------------------------------
// RECONCILE / REPAIR ORDER ENTITLEMENT
// -----------------------------------------------------------------------------

export async function reconcileOrderEntitlementAction(orderId: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { data: order, error } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { success: false, error: 'Order not found.' };
  }

  if (order.status !== 'paid' && order.status !== 'fulfilled' && order.payment_status !== 'paid' && order.payment_status !== 'captured' && order.payment_status !== 'gifted') {
    return {
      success: false,
      error: `Order payment status is ${order.payment_status}. Entitlements can only be granted for verified paid or gifted orders.`,
    };
  }

  let entitlementsCreated = 0;
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

      const { error: upsertErr } = await adminClient.from('customer_entitlements').upsert(
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

      if (!upsertErr) entitlementsCreated++;
    }
  }

  // Update order fulfillment/delivery status
  await adminClient
    .from('orders')
    .update({
      fulfillment_status: 'delivered',
      delivery_status: 'delivered',
      delivered_at: order.delivered_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  await logAdminAction(user.id, profile.email, 'RECONCILE_ENTITLEMENT', 'orders', order.id, {
    orderNumber: order.order_number,
    entitlementsCreated,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/account/downloads');

  return {
    success: true,
    message: `Reconciled ${entitlementsCreated} digital entitlement(s) for Order #${order.order_number}.`,
  };
}

// -----------------------------------------------------------------------------
// REVOKE ENTITLEMENT ACTION
// -----------------------------------------------------------------------------

export async function revokeEntitlementAction(entitlementId: string, orderId?: string, reason?: string) {
  const { user, profile, adminClient } = await requireAdmin();

  const { error } = await adminClient
    .from('customer_entitlements')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entitlementId);

  if (error) return { success: false, error: error.message };

  if (orderId) {
    await adminClient
      .from('orders')
      .update({
        fulfillment_status: 'revoked',
        admin_note: reason ? `Revoked: ${reason}` : 'Access revoked by admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }

  await logAdminAction(user.id, profile.email, 'REVOKE_ENTITLEMENT', 'customer_entitlements', entitlementId, {
    orderId,
    reason,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/account/downloads');
  return { success: true, message: 'Entitlement successfully revoked.' };
}

// -----------------------------------------------------------------------------
// GET FULL ORDER DETAILS FOR MODAL / DETAIL VIEW
// -----------------------------------------------------------------------------

export async function getOrderDetailsAction(orderId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const cleanId = orderId?.trim() || '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

  let query = supabase
    .from('orders')
    .select(`
      *,
      user:profiles(id, full_name, email, phone, created_at),
      order_items(*, product:products(id, title, slug, main_image, price, sale_price, product_type)),
      customer_entitlements(*),
      payments(*),
      creator_commissions(*)
    `);

  if (isUuid) {
    query = query.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
  } else {
    query = query.eq('order_number', cleanId);
  }

  const { data: order, error } = await query.maybeSingle();

  if (error || !order) {
    return { success: false, error: 'Order details not found.' };
  }

  // Fetch download logs
  const entitlementIds = (order.customer_entitlements || []).map((e: any) => e.id);
  let downloadLogs: any[] = [];
  if (entitlementIds.length > 0) {
    const { data: dLogs } = await supabase
      .from('downloads')
      .select('*')
      .in('entitlement_id', entitlementIds)
      .order('downloaded_at', { ascending: false });
    downloadLogs = dLogs || [];
  }

  // Fetch audit logs for this order
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity', 'orders')
    .eq('entity_id', order.id)
    .order('created_at', { ascending: false });

  return {
    success: true,
    order: {
      ...order,
      download_logs: downloadLogs,
      audit_logs: auditLogs || [],
    },
  };
}
