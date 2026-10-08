'use client';

import React from 'react';
import Link from 'next/link';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CartDrawer() {
  const { items, removeItem, subtotal, isCartOpen, setIsCartOpen, clearCart } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Your Cart</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">Your cart is empty</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Discover digital blueprints, masterclasses, and templates designed to elevate your craft.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2"
                >
                  <Link href="/shop">Browse Catalog</Link>
                </Button>
              </div>
            ) : (
              items.map(({ product }) => {
                const effectivePrice =
                  product.sale_price !== null && product.sale_price !== undefined
                    ? Number(product.sale_price)
                    : Number(product.price);

                return (
                  <div
                    key={product.id}
                    className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-start gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    {/* Thumbnail placeholder or image */}
                    <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase">
                      {product.main_image ? (
                        <img
                          src={product.main_image}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{product.product_type}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {product.title}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5 capitalize">
                        {product.category?.name || product.product_type} • Instant Download
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          {formatCurrency(effectivePrice)}
                        </span>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-zinc-400 hover:text-red-500 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Digital Delivery</span>
                  <span className="text-emerald-600 font-medium">Free / Instant</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-md active:scale-[0.99]"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit encrypted checkout via Razorpay</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
