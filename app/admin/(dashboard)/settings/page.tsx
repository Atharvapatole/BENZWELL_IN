import React from 'react';
import { getAdminSettingsAction, getSystemStatusAction } from '@/actions/settings';
import { SettingsManager } from '@/components/admin/settings-manager';

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const [settingsRes, statusRes] = await Promise.all([
    getAdminSettingsAction(),
    getSystemStatusAction(),
  ]);

  const settingsMap = settingsRes.settings || {};
  const systemStatus = statusRes.status || {
    supabase: true,
    database: true,
    storage: false,
    storageMediaPublic: false,
    storageProductsPrivate: false,
    razorpay: false,
    resend: false,
    googleAuth: false,
    siteUrl: 'https://benzwell.in',
    emailDomain: 'benzwell.in',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          System Settings & Control Center
        </h1>
        <p className="text-xs text-zinc-300 mt-1">
          Configure platform parameters, credentials, payments, email delivery, and cloud storage.
        </p>
      </div>

      <SettingsManager initialSettings={settingsMap} systemStatus={systemStatus} />
    </div>
  );
}
