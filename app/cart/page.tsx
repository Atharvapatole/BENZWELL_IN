'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { validateCoupon } from '@/actions/checkout';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Tag,
  Check,
  Loader2,
} from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, subtotal, couponCode, setCouponCode } = useCart();
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    setCouponMessage(null);

    const productIds = items.map((i) => i.product.id);
    const result = await validateCoupon(couponInput, subtotal, productIds);

    setIsValidatingCoupon(false);
    if (result.valid) {
      setCouponCode(couponInput.toUpperCase().trim());
      setCouponDiscount(result.discountAmount);
      setCouponMessage(`✓ ${result.message} (-${formatCurrency(result.discountAmount)})`);
    } else {
      setCouponMessage(`✕ ${result.message}`);
      setCouponDiscount(0);
    }
  };

  const finalTotal = Math.max(0, subtotal - couponDiscount);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 mx-auto flex items-center justify-center text-zinc-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Your Cart is Empty</h1>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Explore our curated catalog of ebooks, templates, and courses designed to elevate your craft.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/shop">Browse Catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-white">Shopping Cart</h1>
        <p className="text-sm text-zinc-500 mt-1">Review your digital items before checkout.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl border border-zinc-200/80 bg-white/70 dark:border-zinc-800/80 dark:bg-zinc-900/70 shadow-glass backdrop-blur-xl divide-y divide-zinc-200/60 dark:divide-zinc-800/60 p-6">
            {items.map(({ product }) => {
              const effectivePrice =
                product.sale_price !== null && product.sale_price !== undefined
                  ? Number(product.sale_price)
                  : Number(product.price);

              return (
                <div key={product.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold uppercase text-zinc-400">
                    {product.main_image ? (
                      <img src={product.main_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{product.product_type}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${product.slug}`} className="hover:underline">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white truncate">
                        {product.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5 capitalize">
                      {product.category?.name || product.product_type} • Instant Digital Delivery
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-extrabold text-base text-zinc-900 dark:text-white">
                        {formatCurrency(effectivePrice)}
                      </span>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-xs text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
            <Link href="/shop" className="text-sky-500 font-semibold hover:underline">
              &larr; Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary & Coupon Box (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Order Summary</h2>

          {/* Coupon Form */}
          <form onSubmit={handleApplyCoupon} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Discount code"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-xs uppercase font-medium focus:outline-none"
              />
              <Button type="submit" size="sm" variant="secondary" isLoading={isValidatingCoupon}>
                Apply
              </Button>
            </div>
            {couponMessage && (
              <p
                className={`text-xs font-medium ${
                  couponMessage.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {couponMessage}
              </p>
            )}
          </form>

          {/* Breakdown */}
          <div className="space-y-3 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-sm">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {couponDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span>Digital Delivery</span>
              <span className="text-emerald-600 font-semibold">Free</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-lg font-extrabold text-zinc-950 dark:text-white">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <Button size="lg" className="w-full shadow-lg" asChild>
            <Link href="/checkout" className="flex items-center justify-center gap-2">
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>256-bit encrypted checkout via Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
