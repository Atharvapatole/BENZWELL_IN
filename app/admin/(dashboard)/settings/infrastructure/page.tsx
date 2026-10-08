import React from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { getInfrastructureConfigAction } from '@/actions/infrastructure';
import { InfrastructureManager } from '@/components/admin/infrastructure-manager';
import Link from 'next/link';
import { ChevronRight, Server, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminInfrastructurePage() {
  await requireAdmin();
  const { configs, lastAppwriteWebhook } = await getInfrastructureConfigAction();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-1">
            <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/admin/settings" className="hover:text-white transition-colors">Settings</Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-sky-400">Infrastructure</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Server className="w-7 h-7 text-sky-400" />
            <span>Infrastructure & Cloud Services</span>
          </h1>
        </div>

        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>General Settings</span>
        </Link>
      </div>

      <InfrastructureManager
        initialConfigs={configs}
        lastAppwriteWebhook={lastAppwriteWebhook}
      />
    </div>
  );
}
