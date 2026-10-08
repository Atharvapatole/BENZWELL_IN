import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  TrendingUp,
  DownloadCloud,
  Shield,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // Query actual database metrics
  const [ordersRes, profilesRes, productsRes, auditRes] = await Promise.all([
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, role').eq('role', 'customer'),
    supabase.from('products').select('id, title, status, sales_count, price').eq('status', 'published'),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const allOrders = ordersRes.data || [];
  const paidOrders = allOrders.filter(
    (o) =>
      (o.status === 'paid' || o.status === 'fulfilled' || o.payment_status === 'captured' || o.payment_status === 'paid') &&
      o.order_type !== 'admin_gift' &&
      o.payment_status !== 'gifted'
  );
  const totalRevenue = paidOrders.reduce((acc, o) => acc + Number(o.total || o.final_amount || 0), 0);
  const totalCustomers = profilesRes.data?.length || 0;
  const publishedProducts = productsRes.data || [];
  const recentOrders = allOrders.slice(0, 6);
  const auditLogs = auditRes.data || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Control Center Overview
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            Real-time ecommerce analytics, order fulfillment, and system activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="px-4 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-md active:scale-[0.98]"
          >
            + Create Product
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-xs text-zinc-400">{paidOrders.length} paid transactions</p>
        </div>

        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {allOrders.length}
          </div>
          <p className="text-xs text-zinc-400">{paidOrders.length} fulfilled orders</p>
        </div>

        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Customers</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalCustomers}
          </div>
          <p className="text-xs text-zinc-400">Verified customer accounts</p>
        </div>

        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Active Products</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {publishedProducts.length}
          </div>
          <p className="text-xs text-zinc-400">Published in public store</p>
        </div>
      </div>

      {/* Grid: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Orders (8 cols) */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-sky-400" />
              <span>Recent Orders</span>
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-300 uppercase tracking-wider font-bold">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3.5 font-bold text-white">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-sky-400 hover:underline">
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 text-zinc-200 truncate max-w-[160px] font-medium">
                        {order.customer_email}
                      </td>
                      <td className="py-3.5 text-zinc-300">{formatDate(order.created_at)}</td>
                      <td className="py-3.5 font-bold text-white">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                            order.status === 'fulfilled' || order.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-6 text-center">No orders recorded yet.</p>
          )}
        </div>

        {/* Top Products & Audit Logs (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Products */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Catalog Snapshot</span>
            </h3>

            {publishedProducts.length > 0 ? (
              <div className="space-y-3">
                {publishedProducts.slice(0, 5).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/80 last:border-0">
                    <span className="text-zinc-200 font-medium truncate max-w-[180px]">
                      {prod.title}
                    </span>
                    <span className="font-bold text-white">{formatCurrency(prod.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No active products published.</p>
            )}
          </div>

          {/* Audit Logs */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>Security Audit</span>
              </h3>
              <Link href="/admin/audit-logs" className="text-xs font-semibold text-sky-400 hover:underline">
                View All
              </Link>
            </div>

            {auditLogs.length > 0 ? (
              <div className="space-y-2.5">
                {auditLogs.map((log) => (
                  <div key={log.id} className="text-xs border-b border-zinc-800/80 pb-2 last:border-0">
                    <p className="font-semibold text-zinc-200">{log.action}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {log.user_email || 'System'} • {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No recent security events.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
