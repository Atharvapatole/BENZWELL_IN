'use client';

import React, { useState, useMemo } from 'react';
import { Product, ProductCategory } from '@/types';
import { ProductCard } from '@/components/shop/product-card';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShopCatalogProps {
  initialProducts: Product[];
  categories: ProductCategory[];
  initialCategory?: string;
}

export function ShopCatalog({
  initialProducts,
  categories,
  initialCategory,
}: ShopCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((product) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = product.title.toLowerCase().includes(q);
          const matchDesc = product.description?.toLowerCase().includes(q);
          const matchShort = product.short_description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchShort) return false;
        }

        // Category filter
        if (selectedCategory !== 'all') {
          const cat = categories.find((c) => c.slug === selectedCategory);
          if (cat && product.category_id !== cat.id) return false;
        }

        // Product type filter
        if (selectedType !== 'all') {
          if (product.product_type !== selectedType) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = Number(a.sale_price || a.price);
        const priceB = Number(b.sale_price || b.price);

        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'popular') return (b.sales_count || 0) - (a.sales_count || 0);
        // Default: featured first
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [initialProducts, categories, searchQuery, selectedCategory, selectedType, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSortBy('featured');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || sortBy !== 'featured';

  return (
    <div className="space-y-8">
      {/* Controls Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search digital products, prompts, blueprints..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="newest">Sort: Newest</option>
              <option value="popular">Sort: Popular</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
              selectedCategory === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                selectedCategory === cat.slug
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Active Filter Clear Tag */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500">
            <span>Showing {filteredProducts.length} of {initialProducts.length} products</span>
            <button
              onClick={clearFilters}
              className="text-sky-500 font-semibold hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 p-8 rounded-3xl bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
          <p className="text-base font-semibold text-zinc-900 dark:text-white">No products found</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search criteria or clearing your filters to see more results.
          </p>
          <button
            onClick={clearFilters}
            className="mt-2 text-xs font-bold text-sky-500 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
