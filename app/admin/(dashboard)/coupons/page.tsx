import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { CouponsManager } from '@/components/admin/coupons-manager';
import { Coupon } from '@/types';

export const revalidate = 0;

export default async function AdminCouponsPage() {
  const supabase = createAdminClient();
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  const couponList: Coupon[] = (coupons as any) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Coupons & Discounts
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Create percentage and fixed-amount coupon codes validated server-side during checkout.
        </p>
      </div>

      <CouponsManager initialCoupons={couponList} />
    </div>
  );
}
