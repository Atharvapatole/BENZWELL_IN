'use client';

import React from 'react';
import Link from 'next/link';
import { PageBlock, Product, ProductCategory, Blog } from '@/types';
import { sanitizeHtml, formatCurrency, cn } from '@/lib/utils';
import { ProductCard } from '@/components/shop/product-card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ShieldCheck, Download, Zap, HelpCircle } from 'lucide-react';

interface BlockRendererProps {
  block: PageBlock;
  products?: Product[];
  categories?: ProductCategory[];
  blogs?: Blog[];
}

export function BlockRenderer({ block, products = [], categories = [], blogs = [] }: BlockRendererProps) {
  const { type, props = {}, styles = {}, children = [] } = block;

  const styleObject: React.CSSProperties = {
    paddingTop: styles.paddingTop,
    paddingBottom: styles.paddingBottom,
    marginTop: styles.marginTop,
    marginBottom: styles.marginBottom,
    backgroundColor: styles.backgroundColor,
    color: styles.textColor,
    borderColor: styles.borderColor,
    borderRadius: styles.borderRadius,
    textAlign: styles.align,
  };

  switch (type) {
    case 'section':
      return (
        <section
          style={styleObject}
          className={cn(
            'w-full py-12 md:py-20 relative overflow-hidden',
            styles.glassEffect && 'backdrop-blur-xl bg-white/40 dark:bg-zinc-950/40 border-y border-zinc-200/50 dark:border-zinc-800/50'
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children.map((child) => (
              <BlockRenderer
                key={child.id}
                block={child}
                products={products}
                categories={categories}
                blogs={blogs}
              />
            ))}
          </div>
        </section>
      );

    case 'container':
      return (
        <div style={styleObject} className="max-w-5xl mx-auto w-full space-y-6">
          {children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              products={products}
              categories={categories}
              blogs={blogs}
            />
          ))}
        </div>
      );

    case 'hero':
      return (
        <div style={styleObject} className="text-center max-w-3xl mx-auto py-12 md:py-20 space-y-6">
          {props.badge && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{props.badge}</span>
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
            {props.headline || 'Digital Products Built for Better Work, Learning & Growth.'}
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {props.subheadline || 'Discover practical ebooks, guides, templates, courses and digital resources designed to help you move faster and create better.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {props.ctaText && (
              <Button size="lg" variant="primary" asChild>
                <Link href={props.ctaLink || '/shop'}>{props.ctaText}</Link>
              </Button>
            )}
            {props.secondaryCtaText && (
              <Button size="lg" variant="glass" asChild>
                <Link href={props.secondaryCtaLink || '/shop'}>{props.secondaryCtaText}</Link>
              </Button>
            )}
          </div>
        </div>
      );

    case 'heading': {
      const Tag = (props.level || 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return (
        <Tag
          style={styleObject}
          className={cn(
            'font-bold tracking-tight text-zinc-950 dark:text-white',
            props.level === 'h1' && 'text-3xl md:text-5xl',
            props.level === 'h2' && 'text-2xl md:text-4xl',
            props.level === 'h3' && 'text-xl md:text-2xl',
            props.level === 'h4' && 'text-lg md:text-xl'
          )}
        >
          {props.text}
        </Tag>
      );
    }

    case 'paragraph':
      return (
        <p style={styleObject} className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
          {props.text}
        </p>
      );

    case 'image':
      return (
        <div style={styleObject} className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass my-6">
          <img src={props.url} alt={props.alt || ''} className="w-full h-auto object-cover" />
        </div>
      );

    case 'button':
      return (
        <div style={styleObject}>
          <Button variant={props.variant || 'primary'} size={props.size || 'md'} asChild>
            <Link href={props.link || '#'}>{props.text || 'Learn More'}</Link>
          </Button>
        </div>
      );

    case 'product_grid': {
      const displayProducts = products.length > 0 ? products.slice(0, props.limit || 8) : [];
      return (
        <div style={styleObject} className="my-8">
          {props.title && (
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{props.title}</h3>
                {props.subtitle && <p className="text-sm text-zinc-500 mt-1">{props.subtitle}</p>}
              </div>
              <Link href="/shop" className="text-sm font-semibold text-sky-500 hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          {displayProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl">
              <p className="text-sm text-zinc-500">Products will appear here once published.</p>
            </div>
          )}
        </div>
      );
    }

    case 'category_grid': {
      const displayCategories = categories.length > 0 ? categories : [];
      return (
        <div style={styleObject} className="my-8">
          {props.title && (
            <div className="text-center max-w-xl mx-auto mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{props.title}</h3>
              {props.subtitle && <p className="text-sm text-zinc-500 mt-2">{props.subtitle}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className="group p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-md hover:-translate-y-1 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-sm mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-sky-500 transition-colors">
                  {cat.name}
                </h4>
                {cat.description && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    case 'testimonials': {
      const testimonialsList = props.items || [
        {
          name: 'Alex R.',
          role: 'Full-Stack Developer',
          text: 'BenzWell digital frameworks cut my development timeline in half. Extremely detailed and battle-tested.',
          rating: 5,
        },
        {
          name: 'Sarah K.',
          role: 'Startup Founder',
          text: 'The financial models and investor pitch decks are worth 10x the price. Exceptional quality.',
          rating: 5,
        },
        {
          name: 'Vikram S.',
          role: 'AI Product Lead',
          text: 'The AI prompts and automation blueprints are cutting-edge. Highly recommend for any serious creator.',
          rating: 5,
        },
      ];

      return (
        <div style={styleObject} className="my-12">
          {props.title && (
            <div className="text-center max-w-xl mx-auto mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{props.title}</h3>
              {props.subtitle && <p className="text-sm text-zinc-500 mt-2">{props.subtitle}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonialsList.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-4"
              >
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: item.rating || 5 }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <h5 className="font-semibold text-xs text-zinc-900 dark:text-white">{item.name}</h5>
                  <p className="text-[11px] text-zinc-500">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'faq': {
      const faqList = props.items || [
        {
          q: 'How do I receive my purchased digital products?',
          a: 'Immediately after completing your Razorpay checkout, your products are unlocked in your BenzWell account dashboard under "Downloads". You will also receive an email confirmation.',
        },
        {
          q: 'What payment methods are supported?',
          a: 'We accept all major UPI apps (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, and digital wallets via our secure Razorpay integration.',
        },
        {
          q: 'Can I re-download files if I lose them?',
          a: 'Yes! Your purchased files are securely stored in your account so you can re-download them anytime.',
        },
        {
          q: 'Do you offer updates for courses and templates?',
          a: 'Yes, when creators update files or add bonus resources, updated versions automatically become available in your account download center.',
        },
      ];

      return (
        <div style={styleObject} className="max-w-3xl mx-auto my-12 space-y-4">
          {props.title && (
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{props.title}</h3>
            </div>
          )}
          {faqList.map((item: any, idx: number) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass-sm backdrop-blur-md"
            >
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>{item.q}</span>
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 pl-6 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      );
    }

    case 'blog_grid': {
      const displayBlogs = blogs.length > 0 ? blogs.slice(0, props.limit || 3) : [];
      return (
        <div style={styleObject} className="my-12">
          {props.title && (
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{props.title}</h3>
                {props.subtitle && <p className="text-sm text-zinc-500 mt-1">{props.subtitle}</p>}
              </div>
              <Link href="/blog" className="text-sm font-semibold text-sky-500 hover:underline flex items-center gap-1">
                <span>All Articles</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayBlogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blog/${blog.slug}`}
                className="group p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl hover:-translate-y-1 transition-all flex flex-col"
              >
                {blog.featured_image && (
                  <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-4 bg-zinc-100 dark:bg-zinc-800">
                    <img src={blog.featured_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <h4 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-sky-500 transition-colors line-clamp-2">
                  {blog.title}
                </h4>
                {blog.excerpt && (
                  <p className="text-xs text-zinc-500 mt-2 line-clamp-3 leading-relaxed">
                    {blog.excerpt}
                  </p>
                )}
                <div className="mt-auto pt-4 text-xs font-semibold text-sky-500 flex items-center gap-1">
                  <span>Read full guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      );
    }

    case 'spacer':
      return <div style={{ height: props.height || '32px' }} />;

    case 'divider':
      return <hr style={styleObject} className="border-t border-zinc-200/80 dark:border-zinc-800/80 my-8" />;

    case 'rich_text':
      return (
        <div
          style={styleObject}
          className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.html || '') }}
        />
      );

    case 'custom_html':
      return (
        <div
          style={styleObject}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.html || '') }}
        />
      );

    default:
      return null;
  }
}
