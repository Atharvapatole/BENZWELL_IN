import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Blog, BlogCategory } from '@/types';
import { formatDate } from '@/lib/utils';
import { Sparkles, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog & Editorial Insights | BENZWELL',
  description: 'In-depth blueprints, strategy breakdowns, and guides on AI workflows, digital product creation, and productivity.',
};

export const revalidate = 60; // 60s ISR

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: selectedCategorySlug } = await searchParams;
  const supabase = await createClient();

  let blogs: Blog[] = [];
  let categories: BlogCategory[] = [];

  try {
    let query = supabase
      .from('blogs')
      .select('*, category:blog_categories(name, slug)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (selectedCategorySlug) {
      const { data: cat } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', selectedCategorySlug)
        .single();
      if (cat) {
        query = query.eq('category_id', cat.id);
      }
    }

    const [bRes, cRes] = await Promise.all([
      query,
      supabase.from('blog_categories').select('*').order('name', { ascending: true }),
    ]);

    if (bRes.data) blogs = bRes.data as any;
    if (cRes.data) categories = cRes.data;
  } catch (err) {
    console.error('Error fetching blog index:', err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
          Editorial & Insights
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          The BenzWell Journal
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Deep-dives into high-leverage digital systems, creator monetization, and AI automation.
        </p>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          <Link
            href="/blog"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              !selectedCategorySlug
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            All Articles
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog?category=${cat.slug}`}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategorySlug === cat.slug
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Blogs Grid */}
      {blogs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/blog/${blog.slug}`}
              className="group rounded-3xl border border-zinc-200/80 bg-white/70 dark:border-zinc-800/80 dark:bg-zinc-900/70 shadow-glass backdrop-blur-xl hover:-translate-y-1 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all p-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {blog.featured_image ? (
                  <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={blog.featured_image}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] w-full rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center text-zinc-400">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="font-semibold text-sky-500 capitalize">
                      {blog.category?.name || 'Article'}
                    </span>
                    <span>•</span>
                    <span>{formatDate(blog.created_at)}</span>
                  </div>

                  <h3 className="font-bold text-lg text-zinc-950 dark:text-white group-hover:text-sky-500 transition-colors line-clamp-2">
                    {blog.title}
                  </h3>

                  {blog.excerpt && (
                    <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                      {blog.excerpt}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>By {blog.author_name}</span>
                <span className="font-semibold text-sky-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">No articles found</p>
          <p className="text-xs text-zinc-500">
            Check back soon for new editorial analyses and frameworks.
          </p>
        </div>
      )}
    </div>
  );
}
