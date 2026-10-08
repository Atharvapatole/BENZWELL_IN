import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProductForm } from '@/components/admin/product-form';
import { ArrowLeft } from 'lucide-react';
import { ProductCategory } from '@/types';

export const revalidate = 0;

export default async function NewProductPage() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Create Digital Product</h1>
          <p className="text-xs text-zinc-400">Publish a new resource, playbook, course, or template.</p>
        </div>
      </div>

      <ProductForm categories={categories || []} />
    </div>
  );
}
