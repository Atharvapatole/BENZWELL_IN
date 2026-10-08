import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils';
import { deleteBlogAction } from '@/actions/admin';
import { Plus, Edit, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import { Blog } from '@/types';

export const revalidate = 0;

export default async function AdminBlogsPage() {
  const supabase = createAdminClient();

  const { data: blogs } = await supabase
    .from('blogs')
    .select('*, category:blog_categories(name)')
    .order('created_at', { ascending: false });

  const blogList: Blog[] = (blogs as any) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Blog & Editorial Posts ({blogList.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Write guides, strategies, tutorials, and organic marketing content.
          </p>
        </div>

        <Link
          href="/admin/blogs/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl space-y-4">
        {blogList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Author</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {blogList.map((blog) => (
                  <tr key={blog.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-4 font-bold text-white max-w-[280px]">
                      <Link href={`/admin/blogs/${blog.id}`} className="hover:text-sky-400 line-clamp-1">
                        {blog.title}
                      </Link>
                      <span className="text-[11px] text-zinc-500">/{blog.slug}</span>
                    </td>

                    <td className="py-4 text-zinc-300">
                      {blog.category?.name || 'Uncategorized'}
                    </td>

                    <td className="py-4 text-zinc-400">{blog.author_name}</td>

                    <td className="py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          blog.status === 'published'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {blog.status}
                      </span>
                    </td>

                    <td className="py-4 text-zinc-400">{formatDate(blog.created_at)}</td>

                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {blog.status === 'published' && (
                          <Link
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="View public post"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        <Link
                          href={`/admin/blogs/${blog.id}`}
                          className="p-1.5 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit post"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>

                        <form
                          action={async () => {
                            'use server';
                            await deleteBlogAction(blog.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Delete post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-white">No blog articles yet</p>
            <p className="text-xs text-zinc-400">
              Publish organic editorial guides to boost search traffic and customer acquisition.
            </p>
            <Link
              href="/admin/blogs/new"
              className="inline-block px-4 py-2 rounded-xl bg-sky-500 text-zinc-950 font-bold text-xs mt-2"
            >
              + Create First Article
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
