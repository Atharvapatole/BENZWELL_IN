import React from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { getFreeToolsListAction } from '@/actions/free-tools';
import { FreeToolsManager } from '@/components/admin/free-tools-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminFreeToolsPage() {
  await requireAdmin();
  const { tools } = await getFreeToolsListAction();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <FreeToolsManager initialTools={tools || []} />
    </div>
  );
}
