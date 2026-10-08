'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveFreeToolAction } from '@/actions/free-tools';
import {
  Wrench,
  Sparkles,
  Layers,
  Tag,
  FileText,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface FreeToolFormProps {
  initialData?: any;
  products: Array<{ id: string; title: string; slug: string; price: number; sale_price?: number }>;
}

export function FreeToolForm({ initialData, products }: FreeToolFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    short_description: initialData?.short_description || '',
    description: initialData?.description || '',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    product_id: initialData?.product_id || '',
    cta_heading: initialData?.cta_heading || 'Want the complete expert checklist before making your decision?',
    cta_description: initialData?.cta_description || 'Get instant access to the complete BenzWell Guide with full verification templates and legal warning signs.',
    cta_button_text: initialData?.cta_button_text || 'Get the Complete Guide',
    coupon_code: initialData?.coupon_code || '',
    lead_capture_enabled: initialData?.lead_capture_enabled ?? true,
    tool_type: initialData?.tool_type || 'interactive_checklist',
    deployment_method: initialData?.deployment_method || 'built_in',
    status: initialData?.status || 'draft',
    github_repo: initialData?.github_repo || '',
    github_branch: initialData?.github_branch || 'main',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await saveFreeToolAction(formData);
      if (res.success) {
        setSuccess('Free Tool saved successfully!');
        router.push('/admin/free-tools');
      } else {
        setError(res.error || 'Failed to save tool');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/free-tools"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Free Tools</span>
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{formData.id ? 'Save Changes' : 'Create Free Tool'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. BASIC INFORMATION */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5 pb-4 border-b border-zinc-800">
          <Wrench className="w-5 h-5 text-sky-400" />
          <span>Basic Tool Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Tool Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. AI Flat Buying Checklist"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              URL Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono">/free-tools/</span>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="flat-ai"
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Short Description (Hero Section)
          </label>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            placeholder="Evaluate your property purchase risks, RERA compliance, and title safety in 2 minutes."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Full Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed overview of what this free tool evaluates and how it helps prospective buyers..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Tool Type
            </label>
            <select
              value={formData.tool_type}
              onChange={(e) => setFormData({ ...formData, tool_type: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="interactive_checklist">Interactive AI Checklist</option>
              <option value="ai_assessment">AI Due Diligence Assessment</option>
              <option value="calculator">Financial & Hidden Cost Calculator</option>
              <option value="custom_nextjs">Custom Next.js App</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="draft">Draft (Private)</option>
              <option value="live">Live (Public)</option>
              <option value="disabled">Disabled (Maintenance)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Lead Capture
            </label>
            <label className="flex items-center gap-3 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.lead_capture_enabled}
                onChange={(e) => setFormData({ ...formData, lead_capture_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-sky-500 bg-zinc-900 border-zinc-700"
              />
              <span className="text-xs font-bold text-zinc-300">
                {formData.lead_capture_enabled ? 'Enabled (Name & Email)' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT RECOMMENDATION & CONVERSION CTA */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5 pb-4 border-b border-zinc-800">
          <ShoppingBag className="w-5 h-5 text-sky-400" />
          <span>Product Recommendation & Conversion CTA</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Linked BenzWell Digital Product
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="">-- No Product Linked --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (₹{p.sale_price || p.price})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Special Discount / Coupon Code (Optional)
            </label>
            <input
              type="text"
              value={formData.coupon_code}
              onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
              placeholder="e.g. FLAT20 or TOOLVIP"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono uppercase focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            CTA Box Heading
          </label>
          <input
            type="text"
            value={formData.cta_heading}
            onChange={(e) => setFormData({ ...formData, cta_heading: e.target.value })}
            placeholder="Want the complete checklist with all questions you should ask before buying a flat?"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            CTA Description
          </label>
          <textarea
            rows={2}
            value={formData.cta_description}
            onChange={(e) => setFormData({ ...formData, cta_description: e.target.value })}
            placeholder="Why this complete product solves the user's biggest problems..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              CTA Button Text
            </label>
            <input
              type="text"
              value={formData.cta_button_text}
              onChange={(e) => setFormData({ ...formData, cta_button_text: e.target.value })}
              placeholder="Get the Complete Guide"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 3. SEO METADATA */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5 pb-4 border-b border-zinc-800">
          <Globe className="w-5 h-5 text-sky-400" />
          <span>SEO & Social Metadata</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              SEO Meta Title
            </label>
            <input
              type="text"
              value={formData.seo_title}
              onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
              placeholder="AI Flat Buying Checklist & Due Diligence Tool | BenzWell"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              SEO Meta Description
            </label>
            <input
              type="text"
              value={formData.seo_description}
              onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
              placeholder="Free interactive tool to audit builder credibility, RERA approvals, and title risks."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
