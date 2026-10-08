import React from 'react';
import { getAnalyticsDataAction } from '@/actions/analytics';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';

export const revalidate = 0; // Dynamic server rendering for real-time accurate financial data

export default async function AdminAnalyticsPage() {
  const initialData = await getAnalyticsDataAction({ range: 'all' });

  return (
    <div className="w-full">
      <AnalyticsDashboard initialData={initialData} />
    </div>
  );
}
