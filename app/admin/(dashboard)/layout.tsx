import React from 'react';
import { requireAdmin, AdminAuthorizationError } from '@/lib/auth/admin';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BenzWell Control Center (Admin)',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error: any) {
    if (error instanceof AdminAuthorizationError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin/login');
      }
      redirect('/admin/unauthorized');
    }
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen flex bg-[#0c0d12] text-zinc-100 selection:bg-sky-500/20 selection:text-sky-300">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0c0d12]">{children}</main>
      </div>
    </div>
  );
}
