import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { Product, ProductCategory } from '@/types';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop Digital Products, Blueprints & Masterclasses',
  description: 'Explore the complete BenzWell digital catalog of ebooks, AI prompt suites, frameworks, Notion systems, and courses.',
};

export const revalidate = 30; // 30s ISR

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const initialCategory = resolvedParams.category;

  const supabase = await createClient();

  let products: Product[] = [];
  let categories: ProductCategory[] = [];

  try {
    const [prodRes, catRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:product_categories(name, slug)')
        .eq('status', 'published')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);

    if (prodRes.data) products = prodRes.data as any;
    if (catRes.data) categories = catRes.data;
  } catch (err) {
    console.error('Error fetching shop data:', err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
          BenzWell Catalog
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          Explore Digital Products
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Instant access digital playbooks, prompts, templates, and courses engineered for results.
        </p>
      </div>

      {/* Catalog Grid with Dynamic Filters */}
      <ShopCatalog
        initialProducts={products}
        categories={categories}
        initialCategory={initialCategory}
      />
    </div>
  );
}
