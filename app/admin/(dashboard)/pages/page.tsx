import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, ExternalLink, FileText, Layers } from 'lucide-react';
import { Page } from '@/types';

export const revalidate = 0;

export default async function AdminPagesPage() {
  const supabase = createAdminClient();

  // Ensure default system pages exist (Home, About, Contact, FAQ, etc.)
  const defaultPages = [
    { title: 'Homepage', slug: 'home', status: 'published' },
    { title: 'About Us', slug: 'about', status: 'published' },
    { title: 'Contact Support', slug: 'contact', status: 'published' },
    { title: 'Frequently Asked Questions', slug: 'faq', status: 'published' },
  ];

  for (const dp of defaultPages) {
    await supabase.from('pages').upsert(
      {
        title: dp.title,
        slug: dp.slug,
        status: dp.status,
        content_json: { sections: [] },
      },
      { onConflict: 'slug', ignoreDuplicates: true }
    );
  }

  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: true });

  const pageList: Page[] = (pages as any) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Visual Page Builder CMS ({pageList.length})
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            Build and edit landing pages using the controlled block-based visual canvas.
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        <div className="divide-y divide-zinc-800/80">
          {pageList.map((p) => (
            <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">{p.title}</h4>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700">
                    /{p.slug === 'home' ? '' : p.slug}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                      p.status === 'published'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  Last updated {formatDate(p.updated_at)} • {p.content_json?.sections?.length || 0} block section(s)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={p.slug === 'home' ? '/' : `/${p.slug}`}
                  target="_blank"
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="View Live Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <Link
                  href={`/admin/pages/${p.id}`}
                  className="px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Open Builder</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
