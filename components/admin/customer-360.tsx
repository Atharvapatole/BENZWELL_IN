'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { giftProductAction } from '@/actions/customers';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Product } from '@/types';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Gift,
  ShoppingBag,
  Download,
  Star,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  X,
  CreditCard,
  Trophy,
} from 'lucide-react';

interface Customer360Props {
  customer: any;
  orders: any[];
  entitlements: any[];
  downloads: any[];
  reviews: any[];
  metrics: {
    totalSpent: number;
    totalOrders: number;
    productsPurchased: number;
    globalRank?: number;
  };
  availableProducts: Product[];
}

export function Customer360({
  customer,
  orders,
  entitlements,
  downloads,
  reviews,
  metrics,
  availableProducts,
}: Customer360Props) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'downloads' | 'reviews'>('products');
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(availableProducts[0]?.id || '');
  const [giftMessage, setGiftMessage] = useState('Congratulations, you have got a Gift!');
  const [isGifting, setIsGifting] = useState(false);
  const [giftSuccess, setGiftSuccess] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setIsGifting(true);
    setGiftError(null);

    const res = await giftProductAction({
      customerId: customer.id,
      productId: selectedProductId,
      message: giftMessage,
    });

    setIsGifting(false);

    if (res.success) {
      setGiftSuccess(true);
      setTimeout(() => {
        setGiftSuccess(false);
        setIsGiftModalOpen(false);
        window.location.reload();
      }, 2000);
    } else {
      setGiftError(res.error || 'Failed to gift product');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>

        <Button
          size="sm"
          onClick={() => setIsGiftModalOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-md"
        >
          <Gift className="w-4 h-4 mr-1.5" />
          <span>Gift Product</span>
        </Button>
      </div>

      {/* Customer Header Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg flex-shrink-0">
              {customer.full_name?.charAt(0) || customer.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {customer.full_name || 'Customer Profile'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {customer.role || 'Customer'}
                </span>
                {customer.is_verified ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Unverified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1 text-zinc-300">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  {customer.email}
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {customer.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Registered: {formatDate(customer.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
            <div className="p-3.5 rounded-2xl bg-[#11131a] border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Spent</span>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                {formatCurrency(metrics.totalSpent)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#11131a] border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Orders</span>
              <p className="text-base font-extrabold text-white mt-0.5">{metrics.totalOrders}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#11131a] border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Products</span>
              <p className="text-base font-extrabold text-sky-400 mt-0.5">{metrics.productsPurchased}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#11131a] border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Global Rank</span>
              <p className="text-base font-extrabold text-amber-400 mt-0.5">
                #{metrics.globalRank || 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Purchased & Gifted Products ({entitlements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('downloads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'downloads'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Logs ({downloads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Customer Reviews ({reviews.length})</span>
        </button>
      </div>

      {/* Tab 1: Products & Entitlements */}
      {activeTab === 'products' && (
        <div className="rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass overflow-hidden">
          {entitlements.length > 0 ? (
            <div className="divide-y divide-zinc-800/80">
              {entitlements.map((ent) => (
                <div
                  key={ent.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.02]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">
                        {ent.product?.title || 'Digital Product'}
                      </h4>
                      {ent.is_gift ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          <span>Gifted</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Purchased
                        </span>
                      )}
                    </div>

                    {ent.gift_message && (
                      <p className="text-xs text-emerald-400 italic">
                        &ldquo;{ent.gift_message}&rdquo;
                      </p>
                    )}

                    <p className="text-[11px] text-zinc-400">
                      Granted on {formatDate(ent.created_at)} • Downloads Used:{' '}
                      <strong className="text-zinc-200">{ent.downloads_used || 0}</strong> /{' '}
                      {ent.download_limit || 10} • Expires:{' '}
                      {ent.expires_at ? formatDate(ent.expires_at) : 'Lifetime Access'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        ent.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {ent.is_active ? 'Active Entitlement' : 'Revoked'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-zinc-400 text-xs">
              No product entitlements found for this customer.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders with Snapshots */}
      {activeTab === 'orders' && (
        <div className="rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass overflow-hidden">
          {orders.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#11131a] text-zinc-400 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Coupon / Creator</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-white">
                      <Link href={`/admin/orders/${order.id}`} className="hover:text-sky-400 hover:underline">
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="p-4 text-zinc-400">{formatDate(order.created_at)}</td>
                    <td className="p-4 text-zinc-200">
                      {order.items?.map((i: any) => i.product_name_snapshot).join(', ') || 'Digital Products'}
                    </td>
                    <td className="p-4 text-zinc-300">
                      {order.coupon_code_snapshot ? (
                        <div>
                          <span className="font-mono text-xs text-sky-400 font-bold">{order.coupon_code_snapshot}</span>
                          {order.creator_name_snapshot && (
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              Creator: <strong className="text-zinc-200">{order.creator_name_snapshot}</strong>
                              {order.creator_commission_amount ? ` (₹${order.creator_commission_amount})` : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4 font-bold text-white">
                      {formatCurrency(parseFloat(order.total) || parseFloat(order.total_amount) || 0)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'paid' || order.status === 'fulfilled'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-zinc-400 text-xs">
              No orders placed by this customer yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Downloads */}
      {activeTab === 'downloads' && (
        <div className="rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass overflow-hidden">
          {downloads.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#11131a] text-zinc-400 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">Downloaded At</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {downloads.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 text-zinc-400 whitespace-nowrap">
                      {new Date(d.downloaded_at).toLocaleString('en-US')}
                    </td>
                    <td className="p-4 font-bold text-white">{d.product?.title || 'File'}</td>
                    <td className="p-4 font-mono text-zinc-300">{d.ip_address || '—'}</td>
                    <td className="p-4 text-zinc-400 truncate max-w-xs">{d.user_agent || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-zinc-400 text-xs">
              No download activity recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Reviews */}
      {activeTab === 'reviews' && (
        <div className="rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass overflow-hidden">
          {reviews.length > 0 ? (
            <div className="divide-y divide-zinc-800/80">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{rev.product?.title}</span>
                    <div className="flex text-amber-400 text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        rev.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : rev.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                  {rev.title && <h5 className="text-xs font-bold text-zinc-200">{rev.title}</h5>}
                  <p className="text-xs text-zinc-300">{rev.comment}</p>
                  <p className="text-[10px] text-zinc-500">Submitted on {formatDate(rev.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-zinc-400 text-xs">
              Customer has not submitted any reviews.
            </div>
          )}
        </div>
      )}

      {/* Gift Product Modal */}
      {isGiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-400" />
                  <span>Gift Product to Customer</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Recipient: <strong>{customer.full_name || customer.email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGiftModalOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {giftSuccess ? (
              <div className="p-6 text-center space-y-2 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <h4 className="font-bold text-sm text-white">Gift Granted Successfully!</h4>
                <p className="text-xs text-zinc-300">
                  Entitlement added to customer account. Notification and gift email dispatched from info@benzwell.in.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendGift} className="space-y-4">
                {giftError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                    {giftError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Select Digital Product to Gift
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                  >
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatCurrency(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Custom Gift Message (Included in Email & Login Celebration)
                  </label>
                  <textarea
                    rows={3}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Congratulations, you have got a Gift!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsGiftModalOpen(false)}
                    className="text-xs text-zinc-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isGifting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold"
                  >
                    <Gift className="w-3.5 h-3.5 mr-1.5" />
                    <span>Send Gift Now</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
