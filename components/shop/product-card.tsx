'use client';

import React from 'react';
import Link from 'next/link';
import { Star, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const isInCart = items.some((item) => item.product.id === product.id);

  const price = Number(product.price);
  const salePrice = product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : null;
  const effectivePrice = salePrice !== null ? salePrice : price;
  const discountPercentage = salePrice !== null && price > 0 ? Math.round(((price - salePrice) / price) * 100) : 0;

  return (
    <div className="group relative flex flex-col rounded-3xl border border-zinc-200/80 bg-white/70 p-4 shadow-glass backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-glass-lg dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:hover:border-zinc-700">
      {/* Product Image / Visual Area */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {product.product_type}
            </span>
          </div>
        )}

        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <div className="absolute top-3 left-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
            {discountPercentage}% OFF
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md capitalize">
          {product.category?.name || product.product_type}
        </div>
      </Link>

      {/* Product Information */}
      <div className="flex flex-1 flex-col pt-4">
        {/* Rating */}
        <div className="flex items-center gap-1 text-xs text-amber-500 mb-1.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {product.rating ? Number(product.rating).toFixed(1) : '5.0'}
          </span>
          <span className="text-zinc-400">
            ({product.review_count || 0})
          </span>
        </div>

        {/* Title */}
        <Link href={`/product/${product.slug}`} className="group-hover:text-sky-500 transition-colors">
          <h3 className="font-bold text-base text-zinc-900 dark:text-white line-clamp-1">
            {product.title}
          </h3>
        </Link>

        {/* Short Description */}
        {product.short_description && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {product.short_description}
          </p>
        )}

        {/* Price & Action Row */}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white">
                {formatCurrency(effectivePrice)}
              </span>
              {salePrice !== null && (
                <span className="text-xs text-zinc-400 line-through">
                  {formatCurrency(price)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => addItem(product)}
            disabled={isInCart}
            className={`flex items-center justify-center rounded-xl p-2.5 transition-all active:scale-95 ${
              isInCart
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-sm'
            }`}
            title={isInCart ? 'In Cart' : 'Add to Cart'}
          >
            {isInCart ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
