import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { signOutAction } from '@/actions/auth';
import {
  LayoutDashboard,
  ShoppingBag,
  Download,
  Settings,
  LogOut,
  ShieldCheck,
  User,
  Headphones,
} from 'lucide-react';
import { CelebrationModal } from '@/components/shop/celebration-modal';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Dashboard | BENZWELL',
  description: 'Manage your BenzWell orders, digital entitlements, and downloads.',
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/account');
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Nav (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* User Profile Card */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center font-bold text-base">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                {profile?.full_name || 'Valued Customer'}
              </h3>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            {profile?.is_verified && (
              <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Account</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="p-3 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-1">
            <Link
              href="/account"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-400" />
              <span>Dashboard Overview</span>
            </Link>

            <Link
              href="/account/orders"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
              <span>Order History</span>
            </Link>

            <Link
              href="/account/downloads"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>My Downloads</span>
            </Link>

            <Link
              href="/account/support"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <Headphones className="w-4 h-4 text-zinc-400" />
              <span>Support Tickets</span>
            </Link>

            <Link
              href="/account/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>Account Settings</span>
            </Link>

            <form action={signOutAction} className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>

        {/* Content Area (9 cols) */}
        <div className="lg:col-span-9">
          <CelebrationModal />
          {children}
        </div>
      </div>
    </div>
  );
}
