import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ThankYouRedirect } from '@/components/shop/thank-you-redirect';
import { CheckCircle2, ShieldCheck, Sparkles, Download, ArrowRight, Package } from 'lucide-react';

export const revalidate = 0;

interface ThankYouPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; order?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from('products')
    .select('title')
    .eq('slug', slug)
    .maybeSingle();

  return {
    title: `Thank You for Your Purchase | ${product?.title || 'BENZWELL'}`,
    description: 'Thank you for your order on BenzWell. Access your purchased digital deliverables instantly.',
  };
}

export default async function ThankYouProductPage({
  params,
  searchParams,
}: ThankYouPageProps) {
  const { slug } = await params;
  const { token, order } = await searchParams;

  const supabase = createAdminClient();

  // 1. Fetch product details by slug
  const { data: product } = await supabase
    .from('products')
    .select('id, title, slug, main_image, price, sale_price, product_type, short_description')
    .eq('slug', slug)
    .maybeSingle();

  const productTitle = product?.title || 'Your Digital Product';
  const productImage = product?.main_image || '/placeholder-product.png';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="w-full max-w-2xl mx-auto space-y-8 text-center">
        {/* Success Confirmation Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-glass-sm animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Payment Confirmed • Immediate Access</span>
        </div>

        {/* Main Glass Thank You Card */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-2xl backdrop-blur-xl space-y-8 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Product Image Display */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-2xl overflow-hidden bg-[#0e1017] border border-zinc-700/80 shadow-xl flex items-center justify-center p-2 group">
            {product?.main_image ? (
              <img
                src={product.main_image}
                alt={productTitle}
                className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-600/20 flex items-center justify-center">
                <Package className="w-12 h-12 text-sky-400" />
              </div>
            )}
          </div>

          {/* Core Copy Specified */}
          <div className="space-y-3 max-w-lg mx-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Thank you for your purchase
            </h1>
            <p className="text-base font-bold text-sky-400">
              {productTitle}
            </p>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
              You will be automatically redirected to the Product Download page using a unique link. Please wait...
            </p>
          </div>

          {/* Automatic Client Redirect & Product Download Button */}
          <ThankYouRedirect token={token} productSlug={slug} />

          {/* Trust and Reassurance Micro-Row */}
          <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permanent Entitlement Saved in Account</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Instant Signed Download Access</span>
            </div>
          </div>
        </div>

        {/* Secondary Navigation */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link
            href="/account/downloads"
            className="text-zinc-400 hover:text-white transition-colors underline"
          >
            Go to My Downloads
          </Link>
          <span className="text-zinc-600">•</span>
          <Link
            href="/shop"
            className="text-zinc-400 hover:text-white transition-colors underline"
          >
            Explore More Digital Products
          </Link>
        </div>
      </div>
    </div>
  );
}
