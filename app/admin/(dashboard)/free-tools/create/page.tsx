import React from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { FreeToolForm } from '@/components/admin/free-tool-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminCreateFreeToolPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, title, slug, price, sale_price')
    .eq('status', 'published')
    .order('title');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create Lead Generation Free Tool
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Build interactive checklists, risk assessments, and calculators to attract qualified customers.
        </p>
      </div>

      <FreeToolForm products={products || []} />
    </div>
  );
}
