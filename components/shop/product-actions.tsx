'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Zap, Check, ShieldCheck } from 'lucide-react';
import { trackEcommerceEvent } from '@/components/marketing/analytics';

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const isInCart = items.some((i) => i.product.id === product.id);

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem(product);
    trackEcommerceEvent('AddToCart', {
      content_name: product.title,
      content_ids: [product.id],
      content_type: 'product',
      value: Number(product.sale_price || product.price),
      currency: 'INR',
    });
    setTimeout(() => setIsAdding(false), 400);
  };

  const handleBuyNow = () => {
    addItem(product);
    trackEcommerceEvent('InitiateCheckout', {
      content_name: product.title,
      content_ids: [product.id],
      value: Number(product.sale_price || product.price),
      currency: 'INR',
    });
    router.push('/checkout');
  };

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          variant={isInCart ? 'secondary' : 'primary'}
          onClick={handleAddToCart}
          className="flex-1 shadow-md"
        >
          {isInCart ? (
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              <span>Added to Cart</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Add to Cart</span>
            </span>
          )}
        </Button>

        <Button
          size="lg"
          variant="glass"
          onClick={handleBuyNow}
          className="flex-1 border-zinc-900/20 dark:border-white/20 font-bold"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-500" />
            <span>Buy Now</span>
          </span>
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Instant download delivered to your account upon purchase.</span>
      </div>
    </div>
  );
}
