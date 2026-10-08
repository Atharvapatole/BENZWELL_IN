'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createCheckoutOrder } from '@/actions/checkout';
import { verifyPaymentAndFulfillOrder } from '@/actions/payments';
import { validateCoupon } from '@/actions/checkout';
import {
  Lock,
  ShieldCheck,
  Zap,
  ShoppingBag,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
} from 'lucide-react';
import { trackEcommerceEvent } from '@/components/marketing/analytics';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutFormProps {
  user: any;
  profile: any;
}

export function CheckoutForm({ user, profile }: CheckoutFormProps) {
  const router = useRouter();
  const { items, subtotal, couponCode, setCouponCode, clearCart } = useCart();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || user?.user_metadata?.phone || '');

  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Validate coupon on mount if present
  useEffect(() => {
    if (couponCode && subtotal > 0) {
      validateCoupon(couponCode, subtotal, items.map((i) => i.product.id)).then((res) => {
        if (res.valid) {
          setCouponDiscount(res.discountAmount);
          setCouponMessage(`✓ ${res.message}`);
        }
      });
    }
  }, [couponCode, subtotal, items]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsApplyingCoupon(true);
    setCouponMessage(null);

    const productIds = items.map((i) => i.product.id);
    const result = await validateCoupon(couponInput, subtotal, productIds);

    setIsApplyingCoupon(false);
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

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!phone || phone.trim().length < 10) {
      setErrorMessage('Please provide a valid 10-digit phone number for order receipts.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order on server
      const cartPayload = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));

      const orderResult = await createCheckoutOrder(cartPayload, couponCode, {
        fullName,
        email,
        phone,
      });

      if (!orderResult.success) {
        setIsProcessing(false);
        if (orderResult.requiresAuth) {
          router.push(`/login?redirect=/checkout`);
          return;
        }
        setErrorMessage(orderResult.error || 'Failed to initialize order');
        return;
      }

      // 2. If 100% discount / free order, fulfill immediately
      if (orderResult.freeOrder) {
        clearCart();
        trackEcommerceEvent('Purchase', {
          transaction_id: orderResult.orderNumber,
          value: 0,
          currency: 'INR',
        });
        const targetSlug = orderResult.productSlug || items[0]?.product?.slug || 'digital-product';
        if (orderResult.fulfillmentToken) {
          router.push(`/thank-you/${targetSlug}?token=${orderResult.fulfillmentToken}`);
        } else {
          router.push(`/account/downloads?order=${orderResult.orderNumber}`);
        }
        return;
      }

      // 3. Open Razorpay Checkout Modal
      if (typeof window.Razorpay === 'undefined') {
        setIsProcessing(false);
        setErrorMessage('Razorpay SDK failed to load. Please check your internet connection and refresh.');
        return;
      }

      const options = {
        key: orderResult.keyId,
        amount: orderResult.amount,
        currency: orderResult.currency,
        name: 'BENZWELL',
        description: `Order #${orderResult.orderNumber}`,
        order_id: orderResult.razorpayOrderId,
        prefill: {
          name: fullName,
          email: email,
          contact: phone,
        },
        theme: {
          color: '#09090b',
        },
        handler: async function (response: any) {
          try {
            // Verify payment signature on server
            const fulfillment = await verifyPaymentAndFulfillOrder({
              orderId: orderResult.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (fulfillment.success) {
              clearCart();
              trackEcommerceEvent('Purchase', {
                transaction_id: fulfillment.orderNumber,
                value: finalTotal,
                currency: 'INR',
              });
              const targetSlug = fulfillment.productSlug || items[0]?.product?.slug || 'digital-product';
              if (fulfillment.fulfillmentToken) {
                router.push(`/thank-you/${targetSlug}?token=${fulfillment.fulfillmentToken}`);
              } else {
                router.push(`/account/downloads?order=${fulfillment.orderNumber}`);
              }
            } else {
              setErrorMessage(fulfillment.error || 'Payment verification failed');
              setIsProcessing(false);
            }
          } catch (err: any) {
            console.error('Payment fulfillment error:', err);
            setErrorMessage('Payment verification encounter an issue. If your card was charged, contact support.');
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setErrorMessage(resp.error?.description || 'Payment was declined. Please try another card or UPI.');
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err?.message || 'An error occurred during checkout');
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Customer & Billing Form (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-4">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-sky-500" />
              <span>Customer Details</span>
            </h2>
            <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full font-medium">
              Verified Account
            </span>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-zinc-400">Digital downloads are tied to this email.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <p className="text-[11px] text-zinc-400">Used for Razorpay transaction confirmation.</p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full shadow-lg"
                isLoading={isProcessing}
                disabled={items.length === 0}
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Pay {formatCurrency(finalTotal)} via Razorpay</span>
                </span>
              </Button>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>UPI, Cards, NetBanking, Wallets supported</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-500" />
              <span>Instant Digital Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary & Coupon (5 cols) */}
      <div className="lg:col-span-5 rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
        <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Order Summary</h3>

        {/* Items */}
        <div className="space-y-3 max-h-64 overflow-y-auto divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
          {items.map(({ product }) => {
            const price = Number(product.sale_price || product.price);
            return (
              <div key={product.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-zinc-900 dark:text-white truncate">{product.title}</p>
                  <p className="text-[11px] text-zinc-400 capitalize">{product.product_type} • Instant</p>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(price)}</span>
              </div>
            );
          })}
        </div>

        {/* Coupon Form */}
        <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-xs uppercase font-medium focus:outline-none"
            />
            <Button type="submit" size="sm" variant="secondary" isLoading={isApplyingCoupon}>
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

        {/* Totals */}
        <div className="space-y-2.5 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-sm">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Subtotal</span>
            <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(subtotal)}</span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Coupon Discount</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-xs">
            <span>Delivery</span>
            <span className="text-emerald-600 font-semibold">Instant Download</span>
          </div>

          <div className="flex justify-between pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-lg font-extrabold text-zinc-950 dark:text-white">
            <span>Total Payable</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
