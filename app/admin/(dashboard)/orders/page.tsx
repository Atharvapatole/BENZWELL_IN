import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrdersManager } from '@/components/admin/orders-manager';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();

  const [ordersRes, customersRes, productsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(*), customer_entitlements(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, email, full_name, phone')
      .order('full_name', { ascending: true })
      .limit(500),
    supabase
      .from('products')
      .select('id, title, price, sale_price, product_type, status')
      .eq('status', 'published')
      .order('title', { ascending: true }),
  ]);

  const orderList = ordersRes.data || [];
  const customerList = customersRes.data || [];
  const productList = productsRes.data || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <OrdersManager
        initialOrders={orderList}
        customers={customerList}
        products={productList as any}
      />
    </div>
  );
}

