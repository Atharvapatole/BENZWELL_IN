import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate, sanitizeHtml } from '@/lib/utils';
import { ArrowLeft, User, Calendar, BookOpen, Share2 } from 'lucide-react';
import { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: blog } = await supabase
    .from('blogs')
    .select('title, excerpt, featured_image, seo_title, seo_description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!blog) return { title: 'Article Not Found | BENZWELL' };

  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || blog.excerpt || undefined,
    openGraph: {
      title: blog.seo_title || blog.title,
      description: blog.seo_description || blog.excerpt || undefined,
      images: blog.featured_image ? [{ url: blog.featured_image }] : [],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: blog, error } = await supabase
    .from('blogs')
    .select('*, category:blog_categories(name, slug)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !blog) {
    notFound();
  }

  // Schema.org Article Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    image: blog.featured_image || undefined,
    description: blog.excerpt,
    author: {
      '@type': 'Person',
      name: blog.author_name,
    },
    datePublished: blog.published_at || blog.created_at,
    dateModified: blog.updated_at,
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back Button */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Articles</span>
      </Link>

      {/* Article Header */}
      <div className="space-y-4">
        {blog.category && (
          <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
            {blog.category.name}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-[1.15]">
          {blog.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-6">
          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
            <User className="w-4 h-4 text-zinc-400" />
            <span>{blog.author_name}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>{formatDate(blog.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {blog.featured_image && (
        <div className="aspect-[16/9] w-full rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass-lg">
          <img src={blog.featured_image} alt={blog.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-zinc dark:prose-invert max-w-none text-base leading-relaxed whitespace-pre-line py-4"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(blog.content) }}
      />

      {/* Article Footer & Author Box */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl flex items-center justify-between mt-12">
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-zinc-950 dark:text-white">
            Written by {blog.author_name}
          </h4>
          <p className="text-xs text-zinc-500">
            BenzWell Editorial Team focuses on digital commerce, frameworks, and AI systems.
          </p>
        </div>

        <Link
          href="/shop"
          className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-opacity"
        >
          Explore Store
        </Link>
      </div>
    </article>
  );
}
