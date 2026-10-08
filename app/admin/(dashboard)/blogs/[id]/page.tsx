import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { BlogForm } from '@/components/admin/blog-form';
import { ArrowLeft } from 'lucide-react';
import { Blog, BlogCategory } from '@/types';

export const revalidate = 0;

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [blogRes, catRes] = await Promise.all([
    supabase.from('blogs').select('*').eq('id', id).single(),
    supabase.from('blog_categories').select('*').order('name', { ascending: true }),
  ]);

  if (blogRes.error || !blogRes.data) {
    notFound();
  }

  const blog: Blog = blogRes.data as any;
  const categories: BlogCategory[] = catRes.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/blogs"
          className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Edit Blog Article</h1>
          <p className="text-xs text-zinc-400">{blog.title}</p>
        </div>
      </div>

      <BlogForm blog={blog} categories={categories} />
    </div>
  );
}
