import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DownloadButton } from '@/components/shop/download-button';
import {
  ShoppingBag,
  Download,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default async function AccountOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();

  // Fetch recent orders & entitlements
  const [ordersRes, entitlementsRes] = await Promise.all([
    adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    adminClient
      .from('customer_entitlements')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const recentOrders = ordersRes.data || [];
  const entitlements = entitlementsRes.data || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-2">
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
          Welcome to your BenzWell Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 max-w-xl leading-relaxed">
          Access your purchased digital frameworks, masterclasses, and downloads anytime.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-white">
              {entitlements.length}
            </span>
            <p className="text-xs text-zinc-500 font-medium">Unlocked Digital Products</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-zinc-950 dark:text-white">
              {recentOrders.length}
            </span>
            <p className="text-xs text-zinc-500 font-medium">Completed Orders</p>
          </div>
        </div>
      </div>

      {/* Available Downloads Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-sky-500" />
            <span>Available Downloads</span>
          </h2>
          {entitlements.length > 0 && (
            <Link
              href="/account/downloads"
              className="text-xs font-semibold text-sky-500 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {entitlements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entitlements.map((ent) => (
              <div
                key={ent.id}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                    {ent.products?.title || 'Digital Product'}
                  </h4>
                  <p className="text-[11px] text-zinc-400 capitalize mt-0.5">
                    {ent.products?.product_type || 'Digital Resource'} • Purchased {formatDate(ent.created_at)}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Downloads: {ent.downloads_used} / {ent.download_limit}
                  </span>
                  <DownloadButton
                    entitlementId={ent.id}
                    productTitle={ent.products?.title || 'Product'}
                    downloadsUsed={ent.downloads_used}
                    downloadLimit={ent.download_limit}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <p className="text-xs text-zinc-500">You haven&apos;t purchased any digital resources yet.</p>
            <Link
              href="/shop"
              className="inline-block text-xs font-semibold text-sky-500 hover:underline"
            >
              Explore Catalog &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            <span>Recent Orders</span>
          </h2>
          {recentOrders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-xs font-semibold text-sky-500 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {recentOrders.length > 0 ? (
          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {recentOrders.map((order) => (
              <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Order #{order.order_number}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatDate(order.created_at)} • {order.order_items?.length || 1} item(s)
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    {formatCurrency(order.total)}
                  </span>
                  <div className="text-[11px] font-semibold text-emerald-600 capitalize">
                    {order.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 text-center py-6">No order records found.</p>
        )}
      </div>
    </div>
  );
}
