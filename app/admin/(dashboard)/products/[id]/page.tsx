import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProductForm } from '@/components/admin/product-form';
import { ArrowLeft } from 'lucide-react';
import { Product, ProductCategory, ProductFile } from '@/types';

export const revalidate = 0;

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [productRes, categoriesRes, filesRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('product_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('product_files').select('*').eq('product_id', id).order('created_at', { ascending: true }),
  ]);

  if (productRes.error || !productRes.data) {
    notFound();
  }

  const product: Product = productRes.data as any;
  const categories: ProductCategory[] = categoriesRes.data || [];
  const initialFiles: ProductFile[] = filesRes.data || [];

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
          <h1 className="text-2xl font-extrabold text-white">Edit Product</h1>
          <p className="text-xs text-zinc-400">{product.title}</p>
        </div>
      </div>

      <ProductForm product={product} categories={categories} initialFiles={initialFiles} />
    </div>
  );
}
