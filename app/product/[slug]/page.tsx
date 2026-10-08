import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Product, Review } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProductActions } from '@/components/shop/product-actions';
import { ProductCard } from '@/components/shop/product-card';
import {
  Star,
  CheckCircle2,
  FileText,
  Clock,
  DownloadCloud,
  Layers,
  ArrowLeft,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Metadata } from 'next';

export const revalidate = 30; // 30s ISR

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('title, short_description, main_image, seo_title, seo_description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!product) {
    return { title: 'Product Not Found | BENZWELL' };
  }

  return {
    title: product.seo_title || product.title,
    description: product.seo_description || product.short_description || undefined,
    openGraph: {
      title: product.seo_title || product.title,
      description: product.seo_description || product.short_description || undefined,
      images: product.main_image ? [{ url: product.main_image }] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Fetch Product details
  const { data: product, error } = await supabase
    .from('products')
    .select('*, category:product_categories(id, name, slug)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !product) {
    notFound();
  }

  // 2. Fetch approved reviews and related products
  const [reviewsRes, relatedRes] = await Promise.all([
    supabase
      .from('reviews')
      .select('*, user:profiles(full_name)')
      .eq('product_id', product.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('*, category:product_categories(name)')
      .eq('category_id', product.category_id)
      .neq('id', product.id)
      .eq('status', 'published')
      .limit(4),
  ]);

  const reviews: Review[] = reviewsRes.data || [];
  const relatedProducts: Product[] = (relatedRes.data as any) || [];

  const price = Number(product.price);
  const salePrice = product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : null;
  const effectivePrice = salePrice !== null ? salePrice : price;
  const discountPercentage = salePrice !== null && price > 0 ? Math.round(((price - salePrice) / price) * 100) : 0;

  // Schema.org Product Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.main_image || undefined,
    description: product.short_description || product.description,
    sku: product.sku || product.id,
    offers: {
      '@type': 'Offer',
      price: effectivePrice,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 5,
      reviewCount: reviews.length || 1,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* JSON-LD for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/shop" className="hover:text-zinc-900 dark:hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Catalog</span>
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="hover:text-zinc-900 dark:hover:text-white capitalize"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-xs">
          {product.title}
        </span>
      </div>

      {/* Product Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Gallery / Image Left (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-800 shadow-glass-lg">
            {product.main_image ? (
              <img
                src={product.main_image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8 text-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800">
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                  {product.product_type}
                </span>
              </div>
            )}
            {discountPercentage > 0 && (
              <div className="absolute top-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                {discountPercentage}% OFF
              </div>
            )}
          </div>

          {/* Additional Gallery Items if present */}
          {Array.isArray(product.gallery) && product.gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {product.gallery.map((img: string, idx: number) => (
                <div
                  key={idx}
                  className="aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Purchase Box Right (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
          {/* Category & Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
              {product.category?.name || product.product_type}
            </span>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {Number(product.rating || 5).toFixed(1)}
              </span>
              <span className="text-zinc-400">({reviews.length} reviews)</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white leading-snug">
            {product.title}
          </h1>

          {/* Pricing */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-zinc-950 dark:text-white">
              {formatCurrency(effectivePrice)}
            </span>
            {salePrice !== null && (
              <span className="text-base text-zinc-400 line-through">
                {formatCurrency(price)}
              </span>
            )}
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {product.short_description}
            </p>
          )}

          {/* Interactive Buy / Add to Cart Actions */}
          <ProductActions product={product} />

          {/* File Snapshot Properties */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 space-y-1">
              <div className="text-zinc-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Format</span>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {product.file_info?.format || 'PDF / ZIP Resources'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 space-y-1">
              <div className="text-zinc-400 flex items-center gap-1">
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Access</span>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-white">
                Instant / Lifetime Access
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Deep Dive (What's Included, Who It's For, Full Description) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
        <div className="lg:col-span-8 space-y-10">
          {/* What's Included */}
          {Array.isArray(product.what_is_included) && product.what_is_included.length > 0 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-4">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-500" />
                <span>What&apos;s Included in this Resource</span>
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {product.what_is_included.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Description */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
              Full Overview
            </h3>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>

          {/* Customer Reviews */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                Customer Reviews ({reviews.length})
              </h3>
              <div className="flex items-center gap-1 text-sm text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{Number(product.rating || 5).toFixed(1)} / 5.0</span>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4 divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-white">
                          {rev.user?.full_name || 'Verified Customer'}
                        </span>
                        {rev.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium">
                            <UserCheck className="w-3 h-3" />
                            <span>Verified Purchaser</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {formatDate(rev.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>

                    {rev.title && (
                      <h5 className="font-bold text-xs text-zinc-900 dark:text-white">
                        {rev.title}
                      </h5>
                    )}

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                No reviews yet. Verified purchasers can leave reviews from their customer dashboard.
              </p>
            )}
          </div>
        </div>

        {/* Who It's For Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {Array.isArray(product.who_is_it_for) && product.who_is_it_for.length > 0 && (
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-4">
              <h4 className="font-bold text-sm text-zinc-950 dark:text-white">
                Who Is This For?
              </h4>
              <ul className="space-y-2.5">
                {product.who_is_it_for.map((target: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                    <span>{target}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Delivery & Security Guarantee */}
          <div className="p-6 rounded-3xl bg-zinc-950 text-white space-y-3">
            <h4 className="font-bold text-sm text-white">BenzWell Guarantee</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every digital resource comes with instant file delivery, lifetime customer access, and verified documentation.
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-12 space-y-8 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">
              Related Digital Products
            </h3>
            <Link href="/shop" className="text-xs font-semibold text-sky-500 hover:underline">
              View All &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
