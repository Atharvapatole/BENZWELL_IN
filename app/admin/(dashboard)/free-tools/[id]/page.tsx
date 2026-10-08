import React from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { getFreeToolDetailAction } from '@/actions/free-tools';
import { createAdminClient } from '@/lib/supabase/admin';
import { FreeToolForm } from '@/components/admin/free-tool-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EditFreeToolPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditFreeToolPage({ params }: EditFreeToolPageProps) {
  await requireAdmin();
  const { id } = await params;
  const { tool, success } = await getFreeToolDetailAction(id);

  if (!success || !tool) {
    notFound();
  }

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
          Edit Free Tool: {tool.name}
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Update tool settings, questions, linked product recommendations, and conversion CTAs.
        </p>
      </div>

      <FreeToolForm initialData={tool} products={products || []} />
    </div>
  );
}
