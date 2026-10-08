import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CheckoutForm } from '@/components/shop/checkout-form';
import { Button } from '@/components/ui/button';
import { Lock, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | BENZWELL',
  description: 'Complete your purchase securely via Razorpay on BenzWell.',
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const adminClient = createAdminClient();
    const { data: p } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = p;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-500">
          <Lock className="w-3.5 h-3.5" />
          <span>Encrypted Checkout</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-1">
          Complete Your Order
        </h1>
      </div>

      {/* Guest Check: If not logged in, enforce authentication */}
      {!user ? (
        <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-500 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
              Account Required for Checkout
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              To ensure lifetime access and instant delivery of your digital products, please sign in or create a verified account to continue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button size="lg" className="flex-1" asChild>
              <Link href="/login?redirect=/checkout">Sign In</Link>
            </Button>
            <Button size="lg" variant="glass" className="flex-1" asChild>
              <Link href="/register?redirect=/checkout">Create Account</Link>
            </Button>
          </div>
        </div>
      ) : profile && !profile.is_verified ? (
        /* Email Verification Check */
        <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-amber-200 dark:border-amber-900/80 shadow-glass backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
              Email Verification Required
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Please verify your email address (<strong>{user.email}</strong>) to activate your account and proceed with order placement.
            </p>
          </div>

          <Button size="lg" className="w-full" asChild>
            <Link href={`/verify-email?email=${encodeURIComponent(user.email || '')}&redirect=/checkout`}>
              Enter Verification Code &rarr;
            </Link>
          </Button>
        </div>
      ) : (
        /* Authenticated & Verified Checkout Form */
        <CheckoutForm user={user} profile={profile} />
      )}
    </div>
  );
}
