'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  Play,
  CheckCircle2,
  Mail,
  Eye,
  MousePointerClick,
  ShoppingBag,
  TrendingUp,
  Download,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FreeToolsAnalyticsDashboardProps {
  initialMetrics: {
    views: number;
    starts: number;
    completions: number;
    leadCaptures: number;
    ctaViews: number;
    ctaClicks: number;
    purchasesAttributed: number;
    toolStartRate: number;
    completionRate: number;
    leadConversionRate: number;
    ctaClickRate: number;
  };
  leads: Array<{
    id: string;
    tool_slug: string;
    name: string;
    email: string;
    created_at: string;
  }>;
  tools: Array<{ id: string; name: string; slug: string }>;
}

export function FreeToolsAnalyticsDashboard({
  initialMetrics,
  leads,
  tools,
}: FreeToolsAnalyticsDashboardProps) {
  const [metrics] = useState(initialMetrics);
  const [leadsList] = useState(leads);

  const exportLeadsCsv = () => {
    if (leadsList.length === 0) return;
    const headers = 'ID,Name,Email,ToolSlug,CreatedAt\n';
    const rows = leadsList
      .map((l) => `"${l.id}","${l.name}","${l.email}","${l.tool_slug}","${l.created_at}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benzwell-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-1">
            <Link href="/admin/free-tools" className="hover:text-white transition-colors">Free Tools</Link>
            <span>/</span>
            <span className="text-sky-400">Analytics</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            <span>Free Tool Conversion & Lead Analytics</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportLeadsCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Leads (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Visitors (Views)', value: metrics.views, icon: Eye, color: 'text-zinc-300' },
          { label: 'Tool Starts', value: metrics.starts, icon: Play, color: 'text-sky-400' },
          { label: 'Completions', value: metrics.completions, icon: CheckCircle2, color: 'text-indigo-400' },
          { label: 'Leads Captured', value: metrics.leadCaptures, icon: Mail, color: 'text-emerald-400' },
          { label: 'CTA Views', value: metrics.ctaViews || metrics.completions, icon: Eye, color: 'text-amber-400' },
          { label: 'Product Clicks', value: metrics.ctaClicks, icon: MousePointerClick, color: 'text-sky-400' },
          { label: 'Purchases Attributed', value: metrics.purchasesAttributed, icon: ShoppingBag, color: 'text-emerald-400' },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">{card.label}</span>
              <card.icon className={cn('w-4 h-4', card.color)} />
            </div>
            <div className={cn('text-2xl font-extrabold', card.color)}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Conversion Funnel Rates Card */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Step-by-Step Funnel Conversion Efficiency</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="text-[11px] font-bold text-zinc-400 uppercase">Start Rate</div>
            <div className="text-xl font-extrabold text-sky-400 mt-1">{metrics.toolStartRate}%</div>
            <div className="text-[10px] text-zinc-500 mt-1">Visitors who begin questionnaire</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="text-[11px] font-bold text-zinc-400 uppercase">Completion Rate</div>
            <div className="text-xl font-extrabold text-indigo-400 mt-1">{metrics.completionRate}%</div>
            <div className="text-[10px] text-zinc-500 mt-1">Starters who finish all questions</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="text-[11px] font-bold text-zinc-400 uppercase">Lead Opt-In Rate</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">{metrics.leadConversionRate}%</div>
            <div className="text-[10px] text-zinc-500 mt-1">Completers who submit email</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="text-[11px] font-bold text-zinc-400 uppercase">Product CTA Click Rate</div>
            <div className="text-xl font-extrabold text-amber-400 mt-1">{metrics.ctaClickRate}%</div>
            <div className="text-[10px] text-zinc-500 mt-1">Completers who click product offer</div>
          </div>
        </div>
      </div>

      {/* Captured Leads Table */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Recent High-Intent Leads ({leadsList.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Source Tool</th>
                <th className="p-4 text-right pr-6">Capture Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {leadsList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    No leads captured yet.
                  </td>
                </tr>
              ) : (
                leadsList.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 pl-6 font-bold text-white">{lead.name}</td>
                    <td className="p-4 font-mono text-zinc-300">{lead.email}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-mono font-bold">
                        /free-tools/{lead.tool_slug}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 text-zinc-400">
                      {new Date(lead.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
