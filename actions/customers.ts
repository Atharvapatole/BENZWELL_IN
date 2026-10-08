'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { sendGiftProductEmail } from '@/lib/email/resend';
import { revalidatePath } from 'next/cache';

/**
 * Admin: Get comprehensive 360 details for a customer
 */
export async function getCustomerDetailsAction(customerId: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // 1. Fetch Profile
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (profError || !profile) {
      return { success: false, error: 'Customer not found' };
    }

    // 2. Fetch Orders & Order Items
    const { data: orders } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    // 3. Fetch Entitlements (Purchased + Gifted)
    const { data: entitlements } = await supabase
      .from('customer_entitlements')
      .select('*, product:products(*), order:orders(order_number, total_amount, status)')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    // 4. Fetch Downloads log
    const { data: downloads } = await supabase
      .from('downloads')
      .select('*, product:products(title)')
      .eq('user_id', customerId)
      .order('downloaded_at', { ascending: false })
      .limit(30);

    // 5. Fetch Customer Reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, product:products(title, slug)')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    // Calculate customer specific metrics
    const paidOrders = (orders || []).filter((o) => o.status === 'paid' || o.status === 'fulfilled');
    const totalSpent = paidOrders.reduce((sum, o) => sum + (parseFloat(o.total) || parseFloat(o.total_amount) || 0), 0);

    let customerProductsPurchased = 0;
    paidOrders.forEach((o: any) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((item: any) => {
          customerProductsPurchased += Number(item.quantity || 1);
        });
      } else {
        customerProductsPurchased += 1;
      }
    });

    if (customerProductsPurchased === 0 && entitlements) {
      customerProductsPurchased = entitlements.length;
    }

    // Compute Global Ranking across all customers
    const { data: allPaidOrders } = await supabase
      .from('orders')
      .select('user_id, order_items(quantity)')
      .in('status', ['paid', 'fulfilled']);

    const purchaseCountByUser: Record<string, number> = {};
    (allPaidOrders || []).forEach((ord: any) => {
      if (!ord.user_id) return;
      let count = 0;
      if (ord.order_items && ord.order_items.length > 0) {
        ord.order_items.forEach((it: any) => {
          count += Number(it.quantity || 1);
        });
      } else {
        count = 1;
      }
      purchaseCountByUser[ord.user_id] = (purchaseCountByUser[ord.user_id] || 0) + count;
    });

    const sortedUserIds = Object.keys(purchaseCountByUser).sort(
      (a, b) => purchaseCountByUser[b] - purchaseCountByUser[a]
    );

    const userRankIndex = sortedUserIds.indexOf(customerId);
    const globalRank = userRankIndex >= 0 ? userRankIndex + 1 : sortedUserIds.length + 1;

    return {
      success: true,
      profile,
      orders: orders || [],
      entitlements: entitlements || [],
      downloads: downloads || [],
      reviews: reviews || [],
      metrics: {
        totalSpent,
        totalOrders: (orders || []).length,
        productsPurchased: customerProductsPurchased,
        globalRank,
      },
    };
  } catch (err: any) {
    console.error('getCustomerDetailsAction error:', err);
    return { success: false, error: err?.message || 'Failed to fetch customer details' };
  }
}

/**
 * Admin: Gift a digital product to a customer without payment
 */
export async function giftProductAction({
  customerId,
  productId,
  message,
}: {
  customerId: string;
  productId: string;
  message?: string;
}) {
  try {
    const { user, profile: adminProfile } = await requireAdmin();
    const supabase = createAdminClient();

    if (!customerId || !productId) {
      return { success: false, error: 'Customer ID and Product ID are required.' };
    }

    // 1. Fetch customer and product details
    const [custRes, prodRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('id', customerId).single(),
      supabase.from('products').select('id, title, download_limit, download_expiry_days').eq('id', productId).single(),
    ]);

    if (!custRes.data) return { success: false, error: 'Customer profile not found.' };
    if (!prodRes.data) return { success: false, error: 'Product not found.' };

    const customer = custRes.data;
    const product = prodRes.data;
    const defaultMsg = 'Congratulations, you have got a Gift!';
    const giftMessage = message?.trim() || defaultMsg;

    // 2. Calculate expiration date if applicable
    let expiresAt: string | null = null;
    if (product.download_expiry_days && product.download_expiry_days > 0) {
      const exp = new Date();
      exp.setDate(exp.getDate() + product.download_expiry_days);
      expiresAt = exp.toISOString();
    }

    // 3. Upsert / Insert Entitlement
    const { data: entitlement, error: entError } = await supabase
      .from('customer_entitlements')
      .insert({
        user_id: customerId,
        product_id: productId,
        download_limit: product.download_limit || 10,
        downloads_used: 0,
        expires_at: expiresAt,
        is_active: true,
        is_gift: true,
        gift_message: giftMessage,
        gifted_by: user.id,
        metadata: { gifted_at: new Date().toISOString(), admin_email: adminProfile.email },
      })
      .select()
      .single();

    if (entError) {
      // If already exists, update to active
      await supabase
        .from('customer_entitlements')
        .update({
          is_active: true,
          is_gift: true,
          gift_message: giftMessage,
          gifted_by: user.id,
        })
        .match({ user_id: customerId, product_id: productId });
    }

    // 4. Create in-app Notification for customer
    await supabase.from('notifications').insert({
      user_id: customerId,
      type: 'gift',
      title: 'You Received a Gift! 🎁',
      message: `${giftMessage} (${product.title})`,
      is_read: false,
      related_product_id: productId,
      metadata: {
        productTitle: product.title,
        giftMessage,
        giftedAt: new Date().toISOString(),
      },
    });

    // 5. Dispatch Gift Email via Resend from info@benzwell.in
    await sendGiftProductEmail({
      toEmail: customer.email,
      customerName: customer.full_name || 'Customer',
      productName: product.title,
      message: giftMessage,
    });

    // 6. Audit Log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: adminProfile.email,
      action: 'GIFT_PRODUCT',
      entity: 'customer_entitlements',
      entity_id: entitlement?.id || productId,
      metadata: {
        customerId,
        customerEmail: customer.email,
        productId,
        productTitle: product.title,
        message: giftMessage,
      },
    });

    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath('/admin/customers');
    return { success: true };
  } catch (err: any) {
    console.error('giftProductAction error:', err);
    return { success: false, error: err?.message || 'Failed to gift product.' };
  }
}

/**
 * Customer: Get unread notifications for celebration & notification badge
 */
export async function getCustomerNotificationsAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, notifications: [] };

    const adminDb = createAdminClient();
    const { data: notifs, error } = await adminDb
      .from('notifications')
      .select('*, product:products(id, title, main_image)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return { success: false, notifications: [] };

    return { success: true, notifications: notifs || [] };
  } catch {
    return { success: false, notifications: [] };
  }
}

/**
 * Customer: Mark notification as read
 */
export async function markNotificationReadAction(notificationId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const adminDb = createAdminClient();
    await adminDb
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    return { success: true };
  } catch {
    return { success: false };
  }
}
