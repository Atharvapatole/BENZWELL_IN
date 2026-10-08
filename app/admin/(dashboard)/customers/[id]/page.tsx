import React from 'react';
import { notFound } from 'next/navigation';
import { getCustomerDetailsAction } from '@/actions/customers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Customer360 } from '@/components/admin/customer-360';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer 360 & Gifting | BenzWell Admin',
};

export const revalidate = 0;

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getCustomerDetailsAction(id);

  if (!res.success || !res.profile) {
    notFound();
  }

  // Fetch all published products for gifting dropdown
  const supabase = createAdminClient();
  const { data: prods } = await supabase
    .from('products')
    .select('id, title, price, slug')
    .eq('status', 'published')
    .order('title', { ascending: true });

  return (
    <Customer360
      customer={res.profile}
      orders={res.orders || []}
      entitlements={res.entitlements || []}
      downloads={res.downloads || []}
      reviews={res.reviews || []}
      metrics={res.metrics || { totalSpent: 0, totalOrders: 0, productsPurchased: 0 }}
      availableProducts={(prods as any) || []}
    />
  );
}
