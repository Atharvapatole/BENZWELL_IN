'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types';

export function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('id, title, slug, price, sale_price, short_description, main_image, product_type, category_id, category:product_categories(name)')
          .eq('status', 'published')
          .ilike('title', `%${query.trim()}%`)
          .limit(6);

        if (!error && data) {
          setResults(data as any);
        }
      } catch (e) {
        console.error('Search query error', e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative mx-auto max-w-2xl transform overflow-hidden rounded-3xl bg-white/95 dark:bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 transition-all">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
          <Search className="w-5 h-5 text-zinc-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search digital products, guides, courses, prompts..."
            className="w-full bg-transparent text-base sm:text-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
            autoFocus
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 ml-2" />
          ) : (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results / Quick Suggestions */}
        <div className="mt-4 max-h-96 overflow-y-auto">
          {query.trim().length >= 2 && results.length === 0 && !isLoading && (
            <div className="text-center py-10">
              <p className="text-sm text-zinc-500">No products found for &ldquo;{query}&rdquo;</p>
              <Link
                href="/shop"
                onClick={onClose}
                className="mt-3 inline-block text-xs font-semibold text-sky-500 hover:underline"
              >
                Browse full catalog &rarr;
              </Link>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 py-1">
                Products ({results.length})
              </p>
              {results.map((product) => {
                const effectivePrice =
                  product.sale_price !== null && product.sale_price !== undefined
                    ? Number(product.sale_price)
                    : Number(product.price);

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                        {product.main_image ? (
                          <img src={product.main_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{product.product_type[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-sky-500 transition-colors">
                          {product.title}
                        </h4>
                        <p className="text-xs text-zinc-500 capitalize">
                          {product.category?.name || product.product_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 pl-4">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        {formatCurrency(effectivePrice)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Popular Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'AI & Prompts', slug: 'ai-prompts' },
                  { label: 'Business & Finance', slug: 'business-finance' },
                  { label: 'Productivity Systems', slug: 'productivity-systems' },
                  { label: 'Ebooks & Guides', slug: 'ebooks-guides' },
                  { label: 'Courses', slug: 'courses-masterclasses' },
                ].map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/shop?category=${cat.slug}`}
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>{cat.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
