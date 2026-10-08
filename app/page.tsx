import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProductCard } from '@/components/shop/product-card';
import { BlockRenderer } from '@/components/builder/block-renderer';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Download,
  ArrowRight,
  Star,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Product, ProductCategory, Blog, Page } from '@/types';

export const revalidate = 60; // ISR revalidate every 60 seconds

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; token_hash?: string; type?: string; next?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};

  // If Supabase redirects an OAuth code directly to the Site URL root (/), forward to /auth/callback to establish session
  if (resolvedParams?.code) {
    const nextParam = resolvedParams.next ? `&next=${encodeURIComponent(resolvedParams.next)}` : '';
    redirect(`/auth/callback?code=${encodeURIComponent(resolvedParams.code)}${nextParam}`);
  }

  // If Supabase redirects an email confirmation token_hash to the Site URL root (/), forward to /auth/callback
  if (resolvedParams?.token_hash && resolvedParams?.type) {
    const nextParam = resolvedParams.next ? `&next=${encodeURIComponent(resolvedParams.next)}` : '';
    redirect(
      `/auth/callback?token_hash=${encodeURIComponent(resolvedParams.token_hash)}&type=${encodeURIComponent(
        resolvedParams.type
      )}${nextParam}`
    );
  }

  const supabase = await createClient();

  // 1. Check if a custom homepage has been designed and published via Admin Page Builder
  let customPage: Page | null = null;
  try {
    const { data: pageData } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', 'home')
      .eq('status', 'published')
      .single();
    if (pageData) {
      customPage = pageData;
    }
  } catch (e) {
    // Fall back to native template
  }

  // 2. Fetch categories, featured products, and latest blogs
  let categories: ProductCategory[] = [];
  let featuredProducts: Product[] = [];
  let latestBlogs: Blog[] = [];

  try {
    const [catRes, prodRes, blogRes] = await Promise.all([
      supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select('*, category:product_categories(name)')
        .eq('status', 'published')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('blogs')
        .select('*, category:blog_categories(name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (catRes.data) categories = catRes.data;
    if (prodRes.data) featuredProducts = prodRes.data as any;
    if (blogRes.data) latestBlogs = blogRes.data as any;
  } catch (e) {
    console.error('Error fetching homepage data:', e);
  }

  // If custom page builder content exists, render via BlockRenderer
  if (customPage && customPage.content_json?.sections?.length > 0) {
    return (
      <div className="w-full">
        {customPage.content_json.sections.map((section) => (
          <BlockRenderer
            key={section.id}
            block={section}
            products={featuredProducts}
            categories={categories}
            blogs={latestBlogs}
          />
        ))}
      </div>
    );
  }

  // Default Luxury Apple-Glass Homepage
  return (
    <div className="w-full space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-8">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold shadow-glass-sm animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Digital Products Made for Everyday Life.</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.08]">
              Digital Products Built for{' '}
              <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Better Work
              </span>
              , Learning & Growth.
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              Discover practical ebooks, playbooks, frameworks, masterclasses, and digital resources designed to help you move faster and create better.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto shadow-lg" asChild>
                <Link href="/shop" className="flex items-center gap-2">
                  <span>Explore Products</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="glass" className="w-full sm:w-auto" asChild>
                <Link href="/shop#categories">Browse Categories</Link>
              </Button>
            </div>

            {/* Trust Micro-Row */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Instant Download Access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Encrypted Razorpay Checkout</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Verified High-Value Resources</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
              Curated Collections
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-1">
              Explore by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1 mt-4 md:mt-0"
          >
            <span>View all products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="group p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl hover:-translate-y-1 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-sky-500 transition-colors">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
              Best Sellers & New Releases
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-1">
              Featured Products
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1 mt-4 md:mt-0"
          >
            <span>Browse complete catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center p-16 rounded-3xl bg-white/50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-800">
            <h4 className="font-semibold text-zinc-900 dark:text-white">Catalog Initializing</h4>
            <p className="text-xs text-zinc-500 mt-1">
              New digital blueprints and masterclasses will appear here once published.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/shop">Explore Catalog</Link>
            </Button>
          </div>
        )}
      </section>

      {/* 4. WHY BENZWELL VALUE PROPOSITIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-900 text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              The BenzWell Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Crafted for Action, Not Fluff.
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Every digital asset on BenzWell is vetted for real-world impact. No theoretical filler — only actionable playbooks, zero-friction templates, and battle-tested workflows designed to generate immediate results.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 relative z-10">
            <div className="p-6 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Zero Friction Delivery</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Download your assets instantly on checkout. Available forever inside your account.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Protected & Verified</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Secure 256-bit encryption for payment and signed storage URLs for private downloads.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">Continuous Updates</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Free access to new iterations, revisions, and bonus materials as resources expand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LATEST EDITORIAL INSIGHTS */}
      {latestBlogs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
                Editorial & Insights
              </span>
              <h2 className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-1">
                Latest from BenzWell Blog
              </h2>
            </div>
            <Link
              href="/blog"
              className="text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1 mt-4 md:mt-0"
            >
              <span>View all articles</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestBlogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blog/${blog.slug}`}
                className="group p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl hover:-translate-y-1 transition-all flex flex-col"
              >
                {blog.featured_image && (
                  <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-4 bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={blog.featured_image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-sky-500 transition-colors line-clamp-2">
                  {blog.title}
                </h3>
                {blog.excerpt && (
                  <p className="text-xs text-zinc-500 mt-2 line-clamp-3 leading-relaxed">
                    {blog.excerpt}
                  </p>
                )}
                <div className="mt-auto pt-4 text-xs font-semibold text-sky-500 flex items-center gap-1">
                  <span>Read article</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. FAQ SECTION */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-500">FAQ</span>
          <h2 className="text-3xl font-extrabold text-zinc-950 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How do I download my purchases?',
              a: 'Directly after Razorpay payment verification, all digital downloads are instantly unlocked in your BenzWell dashboard under "My Account > Downloads". You will also receive an email confirmation.',
            },
            {
              q: 'Are payments secure?',
              a: 'Yes, all payments are processed through Razorpay using bank-grade 256-bit encryption. We support UPI (GPay, PhonePe, Paytm), Cards, and Net Banking.',
            },
            {
              q: 'Can I re-download files if I change devices?',
              a: 'Yes! Your purchased resources remain tied to your BenzWell account for perpetual access anytime you sign in.',
            },
            {
              q: 'What if I need help with a product?',
              a: 'Our support team is available at info@benzwell.in to assist you with any questions or product walkthroughs.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass-sm backdrop-blur-md"
            >
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>{item.q}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2.5 pl-6 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-white/90 to-white/60 dark:from-zinc-900/90 dark:to-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass-lg backdrop-blur-2xl space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
            Find Your Next Digital Resource
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Elevate your workflow with curated digital assets, frameworks, and playbooks. Instant access upon checkout.
          </p>
          <div className="pt-2">
            <Button size="lg" className="shadow-lg" asChild>
              <Link href="/shop" className="flex items-center gap-2">
                <span>Explore BenzWell Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
