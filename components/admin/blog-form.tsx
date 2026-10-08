'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBlogAction, updateBlogAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/utils';
import { Blog, BlogCategory } from '@/types';
import { AlertCircle, Save } from 'lucide-react';

interface BlogFormProps {
  blog?: Blog;
  categories: BlogCategory[];
}

export function BlogForm({ blog, categories }: BlogFormProps) {
  const router = useRouter();
  const isEditing = !!blog;

  const [title, setTitle] = useState(blog?.title || '');
  const [slug, setSlug] = useState(blog?.slug || '');
  const [authorName, setAuthorName] = useState(blog?.author_name || 'BenzWell Editorial Team');
  const [categoryId, setCategoryId] = useState(blog?.category_id || '');
  const [status, setStatus] = useState(blog?.status || 'draft');
  const [featuredImage, setFeaturedImage] = useState(blog?.featured_image || '');
  const [excerpt, setExcerpt] = useState(blog?.excerpt || '');
  const [content, setContent] = useState(blog?.content || '');
  const [seoTitle, setSeoTitle] = useState(blog?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(blog?.seo_description || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      title,
      slug,
      author_name: authorName,
      category_id: categoryId || null,
      status,
      featured_image: featuredImage || null,
      excerpt: excerpt || null,
      content,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      tags: [],
    };

    let res;
    if (isEditing && blog) {
      res = await updateBlogAction(blog.id, payload);
    } else {
      res = await createBlogAction(payload);
    }

    setIsLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to save blog post');
      return;
    }

    router.push('/admin/blogs');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-base font-bold text-white">Post Content</h3>

            <Input
              label="Article Title"
              required
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. How to Build Production AI Agents with Next.js"
            />

            <Input
              label="URL Slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. how-to-build-production-ai-agents"
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Short Excerpt (Snippet)
              </label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Hook summarizing the core takeaway of this article."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Article Body (Rich Text / HTML / Markdown)
              </label>
              <textarea
                rows={14}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write full article here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 font-mono"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-base font-bold text-white">SEO Search Snippet</h3>
            <Input
              label="SEO Title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Title tag for search engines"
            />
            <Input
              label="Meta Description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Meta description (160 chars)"
            />
          </div>
        </div>

        {/* Publishing Options (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-sm font-bold text-white">Publishing</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white capitalize focus:outline-none focus:border-sky-400 font-semibold"
              >
                <option value="draft">Draft (Unpublished)</option>
                <option value="published">Published (Live)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <Input
              label="Author Name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Featured Image URL"
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              placeholder="https://..."
            />

            <Button
              type="submit"
              size="lg"
              className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold mt-4 shadow-md"
              isLoading={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              <span>{isEditing ? 'Save Post' : 'Publish Article'}</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
