'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { lookupOrderForVerificationAction, verifyOrderWithRazorpayLiveAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { GiftProductModal } from '@/components/admin/gift-product-modal';
import { OrderDetailModal } from '@/components/admin/order-detail-modal';
import {
  ShoppingBag,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  CreditCard,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
  Gift,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Tag,
} from 'lucide-react';

interface OrdersManagerProps {
  initialOrders: any[];
  customers?: Array<{ id: string; full_name?: string; email: string; phone?: string }>;
  products?: Array<{ id: string; title: string; price: number; sale_price?: number; product_type: string }>;
}

export function OrdersManager({
  initialOrders,
  customers = [],
  products = [],
}: OrdersManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'verify'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Verification tab state
  const [verifyInput, setVerifyInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isLiveChecking, setIsLiveChecking] = useState(false);
  const [liveCheckResult, setLiveCheckResult] = useState<any | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let paidCount = 0;
    let giftCount = 0;
    let pendingCount = 0;

    for (const ord of initialOrders) {
      const isPaid = ord.payment_status === 'paid' || ord.status === 'fulfilled' || ord.status === 'paid';
      const isGift = ord.order_type === 'admin_gift' || ord.payment_status === 'gifted';
      if (isGift) {
        giftCount++;
      } else if (isPaid) {
        paidCount++;
        totalRevenue += Number(ord.final_amount ?? ord.total ?? 0);
      } else if (ord.status === 'pending' || ord.payment_status === 'pending') {
        pendingCount++;
      }
    }

    return {
      totalOrders: initialOrders.length,
      totalRevenue,
      paidCount,
      giftCount,
      pendingCount,
    };
  }, [initialOrders]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return initialOrders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (ord.order_number || '').toLowerCase().includes(q) ||
        (ord.customer_email || '').toLowerCase().includes(q) ||
        (ord.customer_email_snapshot || '').toLowerCase().includes(q) ||
        (ord.customer_name || '').toLowerCase().includes(q) ||
        (ord.customer_name_snapshot || '').toLowerCase().includes(q) ||
        (ord.product_name_snapshot || '').toLowerCase().includes(q) ||
        (ord.razorpay_payment_id || '').toLowerCase().includes(q) ||
        (ord.razorpay_order_id || '').toLowerCase().includes(q) ||
        (ord.coupon_code || '').toLowerCase().includes(q);

      const matchPaymentStatus =
        paymentStatusFilter === 'all' ||
        (paymentStatusFilter === 'paid' &&
          (ord.payment_status === 'paid' || ord.payment_status === 'captured' || ord.status === 'paid' || ord.status === 'fulfilled')) ||
        (paymentStatusFilter === 'pending' &&
          (ord.payment_status === 'pending' || ord.status === 'pending')) ||
        (paymentStatusFilter === 'gifted' &&
          (ord.payment_status === 'gifted' || ord.order_type === 'admin_gift')) ||
        (paymentStatusFilter === 'failed' &&
          (ord.payment_status === 'payment_failed' || ord.status === 'failed')) ||
        (paymentStatusFilter === 'refunded' &&
          (ord.payment_status === 'refunded' || ord.status === 'refunded'));

      const matchOrderType =
        orderTypeFilter === 'all' ||
        (ord.order_type || 'razorpay_purchase') === orderTypeFilter;

      const matchFulfillment =
        fulfillmentFilter === 'all' ||
        (fulfillmentFilter === 'claimed' && ord.claimed_at) ||
        (fulfillmentFilter === 'unclaimed' && !ord.claimed_at) ||
        ord.fulfillment_status === fulfillmentFilter ||
        ord.delivery_status === fulfillmentFilter;

      const matchProduct =
        productFilter === 'all' ||
        ord.product_id === productFilter ||
        ord.order_items?.some((i: any) => i.product_id === productFilter);

      return matchQuery && matchPaymentStatus && matchOrderType && matchFulfillment && matchProduct;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'amount_desc') {
        return Number(b.final_amount ?? b.total ?? 0) - Number(a.final_amount ?? a.total ?? 0);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.final_amount ?? a.total ?? 0) - Number(b.final_amount ?? b.total ?? 0);
      }
      return 0;
    });
  }, [initialOrders, searchQuery, paymentStatusFilter, orderTypeFilter, fulfillmentFilter, productFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verifyInput.trim()) return;

    setIsSearching(true);
    setVerificationError(null);
    setVerificationResult(null);
    setLiveCheckResult(null);

    const res = await lookupOrderForVerificationAction(verifyInput);
    setIsSearching(false);

    if (res.success && res.order) {
      setVerificationResult(res.order);
    } else {
      setVerificationError(res.error || 'Order not found.');
    }
  };

  const handleLiveRazorpayCheck = async () => {
    if (!verificationResult?.id) return;

    setIsLiveChecking(true);
    setLiveCheckResult(null);

    const res = await verifyOrderWithRazorpayLiveAction(verificationResult.id);
    setIsLiveChecking(false);
    setLiveCheckResult(res);

    if (res.success && res.orderStatus) {
      setVerificationResult((prev: any) => ({
        ...prev,
        status: res.orderStatus,
        payment_status: 'captured',
      }));
    }
  };

  const openOrderModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stat Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
            <span>Order Ledger & Tracking</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Complete database of real customer transactions, order numbers (<code>BZ-YYYYMMDD-XXXXXX</code>), payment snapshots, and gifts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsGiftModalOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/20 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2"
          >
            <Gift className="w-4 h-4" />
            <span>+ Gift Product</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Orders</span>
          <p className="text-2xl font-black text-white">{stats.totalOrders}</p>
          <span className="text-[10px] text-zinc-500">All recorded transactions</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Gross Revenue</span>
          <p className="text-2xl font-black text-emerald-300">{formatCurrency(stats.totalRevenue)}</p>
          <span className="text-[10px] text-emerald-500/80">{stats.paidCount} paid purchases</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Admin Gifts</span>
          <p className="text-2xl font-black text-purple-300">{stats.giftCount}</p>
          <span className="text-[10px] text-purple-500/80">Courtesy & giveaway grants</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Orders</span>
          <p className="text-2xl font-black text-amber-300">{stats.pendingCount}</p>
          <span className="text-[10px] text-amber-500/80">Awaiting payment</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 rounded-2xl bg-[#12131c] border border-zinc-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>All Orders ({filteredOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'verify'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Order ID Verification</span>
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order #, email, payment..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#12131c] border border-zinc-700/80 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: ALL ORDERS TABLE */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#161822]/90 border border-zinc-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Payment Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Payment:</span>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#10121a] border border-zinc-700 text-xs text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="gifted">Gifted</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Order Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Type:</span>
                <select
                  value={orderTypeFilter}
                  onChange={(e) => {
                    setOrderTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#10121a] border border-zinc-700 text-xs text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All Types</option>
                  <option value="razorpay_purchase">Razorpay Purchases</option>
                  <option value="admin_gift">Admin Gifts</option>
                </select>
              </div>

              {/* Fulfillment Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Delivery / Claim:</span>
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => {
                    setFulfillmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#10121a] border border-zinc-700 text-xs text-white font-medium focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All</option>
                  <option value="claimed">Claimed (Downloaded)</option>
                  <option value="unclaimed">Unclaimed</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              {/* Product Filter */}
              {products.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-semibold">Product:</span>
                  <select
                    value={productFilter}
                    onChange={(e) => {
                      setProductFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="max-w-[160px] truncate px-2.5 py-1.5 rounded-xl bg-[#10121a] border border-zinc-700 text-xs text-white font-medium focus:outline-none focus:border-sky-400"
                  >
                    <option value="all">All Products</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-[#10121a] border border-zinc-700 text-xs text-white font-medium focus:outline-none focus:border-sky-400"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Highest Amount</option>
                <option value="amount_asc">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            {paginatedOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700 text-zinc-400 uppercase tracking-wider font-bold text-[11px]">
                      <th className="pb-3.5">Order Number</th>
                      <th className="pb-3.5">Customer Snapshot</th>
                      <th className="pb-3.5">Product & Coupon</th>
                      <th className="pb-3.5">Amount</th>
                      <th className="pb-3.5">Payment</th>
                      <th className="pb-3.5">Delivery / Claim</th>
                      <th className="pb-3.5">Date</th>
                      <th className="pb-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {paginatedOrders.map((order) => {
                      const isGift = order.order_type === 'admin_gift' || order.payment_status === 'gifted';
                      const isPaid = order.payment_status === 'paid' || order.payment_status === 'captured' || order.status === 'paid' || order.status === 'fulfilled';
                      const isPending = order.status === 'pending' || order.payment_status === 'pending';
                      const isFailed = order.payment_status === 'payment_failed' || order.status === 'failed';

                      return (
                        <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors">
                          {/* Order Number */}
                          <td className="py-4">
                            <button
                              type="button"
                              onClick={() => openOrderModal(order.id)}
                              className="font-mono font-bold text-white hover:text-sky-400 flex items-center gap-1.5 transition-colors text-left"
                            >
                              <span>#{order.order_number}</span>
                            </button>
                            {isGift && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                <Gift className="w-2.5 h-2.5" />
                                <span>Gift Grant</span>
                              </span>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-4">
                            <p className="font-semibold text-zinc-100 truncate max-w-[160px]">
                              {order.customer_name_snapshot || order.customer_name || 'Customer'}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate max-w-[160px] font-mono">
                              {order.customer_email_snapshot || order.customer_email}
                            </p>
                          </td>

                          {/* Product Snapshot */}
                          <td className="py-4">
                            <p className="font-semibold text-zinc-200 truncate max-w-[200px]">
                              {order.product_name_snapshot || order.order_items?.[0]?.product_name_snapshot || 'Digital Product'}
                            </p>
                            {(order.coupon_code || order.coupon_code_snapshot) && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                <Tag className="w-2.5 h-2.5" />
                                <span>{order.coupon_code || order.coupon_code_snapshot}</span>
                              </span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-4 font-bold text-white">
                            {isGift ? (
                              <span className="text-zinc-500">₹0 (Gift)</span>
                            ) : (
                              <div>
                                <span>{formatCurrency(Number(order.final_amount ?? order.total ?? 0))}</span>
                                {order.discount_amount > 0 && (
                                  <p className="text-[10px] text-emerald-400 line-through">
                                    {formatCurrency(Number(order.subtotal_amount ?? order.subtotal ?? 0))}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Payment Status */}
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isGift
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : isPaid
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : isPending
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-500/15 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {isGift ? 'Gift' : order.payment_status || order.status}
                            </span>
                          </td>

                          {/* Delivery / Fulfillment */}
                          <td className="py-4 text-xs">
                            {order.claimed_at ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Claimed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-zinc-400 text-[11px]">
                                <Download className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Delivered</span>
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-4 text-zinc-400 text-[11px] whitespace-nowrap">
                            {formatDate(order.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openOrderModal(order.id)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>

                              {!isGift && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('verify');
                                    setVerifyInput(order.order_number);
                                    lookupOrderForVerificationAction(order.order_number).then((res) => {
                                      if (res.success && res.order) setVerificationResult(res.order);
                                    });
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-zinc-500 mx-auto" />
                <p className="text-sm font-semibold text-white">No matching orders found</p>
                <p className="text-xs text-zinc-400">
                  {searchQuery
                    ? `No orders matching query "${searchQuery}".`
                    : 'Orders will appear here as customers complete checkout or when products are gifted.'}
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs">
                <span className="text-zinc-400">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-bold text-white">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDER ID VERIFICATION */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Search & Verify BenzWell Order</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Enter a BenzWell Order Number (e.g. <code>BZ-20260912-XXXXXX</code>), Razorpay Order ID (<code>order_...</code>), or Razorpay Payment ID (<code>pay_...</code>).
              </p>
            </div>

            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. BZ-20260912-108249 or pay_Pz92384729"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0e1017] border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="md"
                  isLoading={isSearching}
                  className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold px-6 rounded-2xl"
                >
                  <Search className="w-4 h-4 mr-1.5" />
                  <span>Look Up Order</span>
                </Button>

                {verificationResult && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setVerifyInput('');
                      setVerificationResult(null);
                      setLiveCheckResult(null);
                      setVerificationError(null);
                    }}
                    className="text-zinc-400 rounded-2xl"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>

            {verificationError && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{verificationError}</span>
              </div>
            )}
          </div>

          {/* Verification Result Card */}
          {verificationResult && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-2xl space-y-6">
              {/* Header & Verification Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-extrabold text-white">
                      Order #{verificationResult.order_number}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        verificationResult.status === 'paid' || verificationResult.status === 'fulfilled'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {verificationResult.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Created on {formatDate(verificationResult.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={handleLiveRazorpayCheck}
                    isLoading={isLiveChecking}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Verify with Live Razorpay API</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => openOrderModal(verificationResult.id)}
                    className="bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-bold"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    <span>Full Order View</span>
                  </Button>
                </div>
              </div>

              {/* Live Razorpay API Result Banner */}
              {liveCheckResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    liveCheckResult.success
                      ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/30 border-red-800 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{liveCheckResult.message}</span>
                    </span>
                    {liveCheckResult.rzpPayment && (
                      <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Method: {liveCheckResult.rzpPayment.method?.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Grid: Details Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Customer Details */}
                <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    <span>Customer Information</span>
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-white text-sm">
                      {verificationResult.customer_name_snapshot || verificationResult.customer_name || 'Valued Customer'}
                    </p>
                    <p className="text-zinc-300 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-zinc-500" />
                      <span>{verificationResult.customer_email_snapshot || verificationResult.customer_email}</span>
                    </p>
                    {verificationResult.customer_phone && (
                      <p className="text-zinc-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{verificationResult.customer_phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Payment Gateway Identifiers */}
                <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Razorpay Identifiers</span>
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase">Razorpay Order ID:</span>
                      <p className="font-mono text-zinc-200 truncate">
                        {verificationResult.razorpay_order_id || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase">Razorpay Payment ID:</span>
                      <p className="font-mono text-zinc-200 truncate">
                        {verificationResult.razorpay_payment_id || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase">Signature Status:</span>
                      <p className="font-semibold text-emerald-400">
                        {verificationResult.razorpay_signature ? 'Cryptographically Verified ✓' : 'Direct / Pending'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Amounts, Coupon & Snapshots */}
                <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Financial Snapshot</span>
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-300">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(verificationResult.subtotal_amount || verificationResult.subtotal || verificationResult.total)}</span>
                    </div>
                    {(verificationResult.discount_amount > 0 || verificationResult.discount > 0) && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount ({verificationResult.coupon_code || verificationResult.coupon_code_snapshot || 'Coupon'}):</span>
                        <span>-{formatCurrency(verificationResult.discount_amount || verificationResult.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-white text-sm pt-1 border-t border-zinc-800">
                      <span>Total:</span>
                      <span>{formatCurrency(verificationResult.final_amount || verificationResult.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gift Product Modal */}
      <GiftProductModal
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
        customers={customers}
        products={products}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrderId(null);
        }}
        onOrderUpdated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

