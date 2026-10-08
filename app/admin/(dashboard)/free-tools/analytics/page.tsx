import React from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { getFreeToolAnalyticsAction, getFreeToolsListAction } from '@/actions/free-tools';
import { FreeToolsAnalyticsDashboard } from '@/components/admin/free-tools-analytics-dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminFreeToolsAnalyticsPage() {
  await requireAdmin();
  const [{ metrics, leads }, { tools }] = await Promise.all([
    getFreeToolAnalyticsAction('all'),
    getFreeToolsListAction(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <FreeToolsAnalyticsDashboard
        initialMetrics={metrics || {
          views: 0,
          starts: 0,
          completions: 0,
          leadCaptures: 0,
          ctaViews: 0,
          ctaClicks: 0,
          purchasesAttributed: 0,
          toolStartRate: 0,
          completionRate: 0,
          leadConversionRate: 0,
          ctaClickRate: 0,
        }}
        leads={leads || []}
        tools={(tools || []).map((t) => ({ id: t.id || t.slug, name: t.name, slug: t.slug }))}
      />
    </div>
  );
}
