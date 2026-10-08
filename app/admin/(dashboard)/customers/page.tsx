import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { CustomersManager, CustomerStatsItem } from '@/components/admin/customers-manager';

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const supabase = createAdminClient();

  // 1. Fetch all customer profiles, paid orders with items, and active entitlements
  const [profilesRes, ordersRes, entitlementsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, user_id, total, status, payment_status, order_items(quantity)')
      .in('status', ['paid', 'fulfilled']),
    supabase
      .from('customer_entitlements')
      .select('user_id, product_id')
      .eq('is_active', true),
  ]);

  const profiles = profilesRes.data || [];
  const paidOrders = ordersRes.data || [];
  const entitlements = entitlementsRes.data || [];

  // 2. Aggregate metrics strictly based on real Supabase data
  const customerStats: CustomerStatsItem[] = profiles.map((p) => {
    const userPaidOrders = paidOrders.filter((o) => o.user_id === p.id);
    const totalSpent = userPaidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    // Sum total product quantity purchased across paid orders
    let totalProductsPurchased = 0;
    userPaidOrders.forEach((o: any) => {
      if (o.order_items && o.order_items.length > 0) {
        o.order_items.forEach((item: any) => {
          totalProductsPurchased += Number(item.quantity || 1);
        });
      } else {
        totalProductsPurchased += 1;
      }
    });

    // Fallback to active entitlements count if order_items not populated
    const userEntitlementsCount = entitlements.filter((e) => e.user_id === p.id).length;
    if (totalProductsPurchased === 0 && userEntitlementsCount > 0) {
      totalProductsPurchased = userEntitlementsCount;
    }

    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      role: p.role || 'customer',
      is_verified: p.is_verified || false,
      is_disabled: p.is_disabled || false,
      created_at: p.created_at,
      ordersCount: userPaidOrders.length,
      totalSpent,
      totalProductsPurchased,
      globalRank: 1, // Will be computed in CustomersManager
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Customer Management & Rankings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 mt-1">
          Review customer profiles, purchase metrics, and real-time product purchase rankings.
        </p>
      </div>

      <CustomersManager initialCustomers={customerStats} />
    </div>
  );
}
