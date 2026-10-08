import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { BlogForm } from '@/components/admin/blog-form';
import { ArrowLeft } from 'lucide-react';
import { BlogCategory } from '@/types';

export const revalidate = 0;

export default async function NewBlogPage() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from('blog_categories')
    .select('*')
    .order('name', { ascending: true });

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
          <h1 className="text-2xl font-extrabold text-white">Write Blog Article</h1>
          <p className="text-xs text-zinc-400">Publish organic guides and industry playbooks.</p>
        </div>
      </div>

      <BlogForm categories={categories || []} />
    </div>
  );
}
