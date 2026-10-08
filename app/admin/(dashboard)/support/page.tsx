import React from 'react';
import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { SupportManager } from '@/components/admin/support-manager';

export const metadata: Metadata = {
  title: 'Support Center | BenzWell Admin',
  description: 'Manage customer support inquiries, AI tickets, and customer issues.',
};

export default async function AdminSupportPage() {
  await requireAdmin();

  return <SupportManager />;
}
