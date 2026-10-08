import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteProductAction, duplicateProductAction } from '@/actions/admin';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Package,
  Search,
} from 'lucide-react';
import { Product } from '@/types';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from('products')
    .select('*, category:product_categories(name)')
    .order('created_at', { ascending: false });

  const productList: Product[] = (products as any) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Digital Products ({productList.length})
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            Manage product listings, pricing, files, download limits, and visibility.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs transition-all shadow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Product</span>
        </Link>
      </div>

      {/* Products Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        {productList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-300 uppercase tracking-wider font-bold">
                  <th className="pb-3.5">Product</th>
                  <th className="pb-3.5">Category</th>
                  <th className="pb-3.5">Type</th>
                  <th className="pb-3.5">Price</th>
                  <th className="pb-3.5">Status</th>
                  <th className="pb-3.5">Sales</th>
                  <th className="pb-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {productList.map((prod) => (
                  <tr key={prod.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xs text-white">
                          {prod.main_image ? (
                            <img src={prod.main_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{prod.product_type[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/products/${prod.id}`}
                            className="font-bold text-white hover:text-sky-300 transition-colors line-clamp-1 max-w-[220px]"
                          >
                            {prod.title}
                          </Link>
                          <span className="text-xs text-zinc-400 font-mono">{prod.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-zinc-200 font-medium">
                      {prod.category?.name || 'Uncategorized'}
                    </td>

                    <td className="py-4 text-zinc-300 capitalize font-medium">
                      {prod.product_type}
                    </td>

                    <td className="py-4 font-extrabold text-white text-sm">
                      {formatCurrency(prod.price)}
                      {prod.sale_price !== null && (
                        <span className="block text-xs text-emerald-400 font-semibold">
                          Sale: {formatCurrency(prod.sale_price)}
                        </span>
                      )}
                    </td>

                    <td className="py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                          prod.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : prod.status === 'draft'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>

                    <td className="py-4 text-zinc-200 font-bold text-sm">
                      {prod.sales_count || 0}
                    </td>

                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {prod.status === 'published' && (
                          <Link
                            href={`/product/${prod.slug}`}
                            target="_blank"
                            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="View live product"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}

                        <Link
                          href={`/admin/products/${prod.id}`}
                          className="p-2 rounded-lg text-zinc-300 hover:text-sky-300 hover:bg-zinc-800 transition-colors"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <form
                          action={async () => {
                            'use server';
                            await duplicateProductAction(prod.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Duplicate product"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </form>

                        <form
                          action={async () => {
                            'use server';
                            await deleteProductAction(prod.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="p-2 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <Package className="w-10 h-10 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No products created yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Get started by creating your first ebook, template, or course masterclass.
            </p>
            <Link
              href="/admin/products/new"
              className="inline-block px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs mt-2 hover:bg-zinc-200"
            >
              + Create First Product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
