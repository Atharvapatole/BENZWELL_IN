import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { CategoriesManager } from '@/components/admin/categories-manager';
import { ProductCategory } from '@/types';

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const categoryList: ProductCategory[] = categories || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Product Categories
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Organize your digital products into collections and navigation categories.
        </p>
      </div>

      <CategoriesManager initialCategories={categoryList} />
    </div>
  );
}
