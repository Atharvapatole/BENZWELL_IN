'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getAnalyticsDataAction,
  AnalyticsDataResult,
  ProductSalesMetric,
  DateFilterOptions,
} from '@/actions/analytics';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  Calendar,
  Filter,
  ArrowUpRight,
  Sparkles,
  Tag,
  Gift,
  X,
  ExternalLink,
  ChevronRight,
  Layers,
  Percent,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  initialData: AnalyticsDataResult;
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsDataResult>(initialData);
  const [isPending, startTransition] = useTransition();

  const [dateRange, setDateRange] = useState<DateFilterOptions['range']>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedProductDrillDown, setSelectedProductDrillDown] = useState<ProductSalesMetric | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'products' | 'coupons' | 'gifts'>('products');

  const handleRangeChange = (range: DateFilterOptions['range']) => {
    setDateRange(range);
    if (range !== 'custom') {
      fetchFilteredData({ range });
    }
  };

  const handleCustomFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    fetchFilteredData({ range: 'custom', startDate: customStart, endDate: customEnd });
  };

  const fetchFilteredData = (options: DateFilterOptions) => {
    startTransition(async () => {
      const res = await getAnalyticsDataAction(options);
      if (res.success) {
        setData(res);
      }
    });
  };

  const summary = data.summary;
  const productSales = data.productSales || [];
  const chartData = data.chartData || [];
  const couponMetrics = data.couponMetrics || [];
  const giftMetrics = data.giftMetrics;

  // Chart max revenue for relative bar heights
  const maxDailyRevenue = Math.max(...chartData.map((d) => d.revenue), 100);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Date Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#161822]/90 border border-zinc-700/80 p-6 rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20 uppercase tracking-wider">
              Verified Real Data
            </span>
            <span className="text-zinc-500 text-xs">• Live Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Analytics & Revenue
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            Exact product-level sales, gross/net earnings, and transaction drill-downs.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: 'Last 7D' },
            { id: '30d', label: 'Last 30D' },
            { id: 'this_month', label: 'This Month' },
            { id: 'prev_month', label: 'Prev Month' },
            { id: 'custom', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleRangeChange(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateRange === tab.id
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() =>
              fetchFilteredData({
                range: dateRange,
                startDate: customStart || undefined,
                endDate: customEnd || undefined,
              })
            }
            disabled={isPending}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Inputs if Custom Selected */}
      {dateRange === 'custom' && (
        <form
          onSubmit={handleCustomFilterSubmit}
          className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-xs"
        >
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-zinc-300">Custom Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-sky-500"
            required
          />
          <span className="text-zinc-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-sky-500"
            required
          />
          <Button type="submit" size="sm" isLoading={isPending} className="bg-sky-600 hover:bg-sky-500">
            Apply Filter
          </Button>
        </form>
      )}

      {/* 2. Executive Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Net Paid Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatCurrency(summary.totalNetRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span>Gross: {formatCurrency(summary.totalGrossRevenue)}</span>
            {summary.totalDiscounts > 0 && (
              <span className="text-rose-400">-{formatCurrency(summary.totalDiscounts)}</span>
            )}
          </div>
        </div>

        {/* Products Sold */}
        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Products Sold</span>
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {summary.totalProductsSold}{' '}
            <span className="text-sm font-medium text-zinc-400">units</span>
          </div>
          <p className="text-xs text-zinc-400">From {summary.totalSuccessfulOrders} paid checkouts</p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Avg. Order Value</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatCurrency(summary.averageOrderValue)}
          </div>
          <p className="text-xs text-zinc-400">Net paid per transaction</p>
        </div>

        {/* Total Discounts */}
        <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-2">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-xs font-bold uppercase tracking-wider">Coupon Discounts</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatCurrency(summary.totalDiscounts)}
          </div>
          <p className="text-xs text-zinc-400">{couponMetrics.length} active coupons redeemed</p>
        </div>
      </div>

      {/* Secondary Highlights Row: Top Products & Gift Separation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best-Selling Product */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1 max-w-[220px]">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
              🏆 Best-Selling by Volume
            </span>
            <p className="text-sm font-extrabold text-white truncate">
              {summary.bestSellingProduct?.title || 'None yet'}
            </p>
            <p className="text-xs text-zinc-400">
              {summary.bestSellingProduct
                ? `${summary.bestSellingProduct.count} units purchased`
                : 'Awaiting purchases'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Highest Revenue Product */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1 max-w-[220px]">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              💎 Highest Revenue Generator
            </span>
            <p className="text-sm font-extrabold text-white truncate">
              {summary.highestRevenueProduct?.title || 'None yet'}
            </p>
            <p className="text-xs text-zinc-400">
              {summary.highestRevenueProduct
                ? `${formatCurrency(summary.highestRevenueProduct.revenue)} earned`
                : 'Awaiting sales'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Complimentary / Gifts (Strictly Separated) */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-1 max-w-[220px]">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
              🎁 Admin Grants / Gifts
            </span>
            <p className="text-sm font-extrabold text-white">
              {summary.totalGiftedUnits} Units ({summary.totalGiftOrders} Grants)
            </p>
            <p className="text-xs text-zinc-400">Excluded from Razorpay revenue</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
            <Gift className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Visual Charts & Trend Breakdown */}
      {chartData.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Revenue & Sales Trajectory</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Daily timeline of completed customer checkouts
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Net Paid
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                Orders
              </span>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="pt-4">
            <div className="h-44 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-2 border-b border-zinc-800">
              {chartData.map((pt, idx) => {
                const heightPercent = Math.max(8, Math.min(100, (pt.revenue / maxDailyRevenue) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[36px] max-w-[64px] flex flex-col items-center gap-2 group relative"
                  >
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-14 bg-zinc-950 border border-zinc-700 rounded-xl p-2 shadow-2xl z-20 text-[11px] whitespace-nowrap text-center">
                      <p className="font-extrabold text-emerald-400">{formatCurrency(pt.revenue)}</p>
                      <p className="text-zinc-400">
                        {pt.ordersCount} order{pt.ordersCount !== 1 ? 's' : ''} ({pt.itemsCount} item
                        {pt.itemsCount !== 1 ? 's' : ''})
                      </p>
                    </div>

                    {/* Bar */}
                    <div className="w-full bg-zinc-800/80 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl group-hover:brightness-110 transition-all duration-300"
                      />
                    </div>
                    {/* Label */}
                    <span className="text-[10px] text-zinc-400 font-medium truncate w-full text-center">
                      {pt.formattedDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'products'
              ? 'bg-white text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product-Level Sales ({productSales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'coupons'
              ? 'bg-white text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons Attribution ({couponMetrics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gifts')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'gifts'
              ? 'bg-white text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Complimentary Grants ({giftMetrics.totalGifts})</span>
        </button>
      </div>

      {/* 5. TAB A: PRODUCT-LEVEL SALES TABLE (PRIMARY FEATURE) */}
      {activeTab === 'products' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" />
                <span>Product Sales & Revenue Performance</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Exact sales count, gross volume, coupon discounts, and net revenue earned per product.
              </p>
            </div>
          </div>

          {productSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-300 uppercase tracking-wider font-bold">
                    <th className="pb-3.5 pl-2">Product</th>
                    <th className="pb-3.5 text-center">Units Sold</th>
                    <th className="pb-3.5 text-right">Gross Rev.</th>
                    <th className="pb-3.5 text-right">Discounts</th>
                    <th className="pb-3.5 text-right">Net Revenue</th>
                    <th className="pb-3.5 text-center">Rev. Share</th>
                    <th className="pb-3.5">Last Sold</th>
                    <th className="pb-3.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {productSales.map((prod) => (
                    <tr
                      key={prod.productId}
                      className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedProductDrillDown(prod)}
                    >
                      {/* Product Info */}
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {prod.mainImage ? (
                              <img
                                src={prod.mainImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-zinc-500" />
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-[260px]">
                            <p className="font-bold text-white text-sm truncate group-hover:text-sky-400 transition-colors">
                              {prod.title}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              Unit Price: {formatCurrency(prod.unitPrice)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Units Sold */}
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 font-extrabold border border-sky-500/20 text-xs">
                          {prod.salesCount} sold
                        </span>
                        {prod.giftCount > 0 && (
                          <span className="block text-[10px] text-purple-400 mt-1 font-medium">
                            +{prod.giftCount} gifted
                          </span>
                        )}
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-4 text-right font-semibold text-zinc-300">
                        {formatCurrency(prod.grossRevenue)}
                      </td>

                      {/* Discounts */}
                      <td className="py-4 text-right font-semibold text-rose-400">
                        {prod.discountAmount > 0
                          ? `-${formatCurrency(prod.discountAmount)}`
                          : '₹0'}
                      </td>

                      {/* Net Revenue */}
                      <td className="py-4 text-right">
                        <span className="font-extrabold text-sm text-emerald-400">
                          {formatCurrency(prod.netRevenue)}
                        </span>
                      </td>

                      {/* Revenue Share % */}
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center gap-1 w-20 mx-auto">
                          <span className="text-[11px] font-bold text-zinc-300">
                            {prod.revenueSharePercent}%
                          </span>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, prod.revenueSharePercent)}%` }}
                              className="h-full bg-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last Sold Date */}
                      <td className="py-4 text-zinc-300 text-[11px] whitespace-nowrap">
                        {prod.lastSoldDate ? formatDate(prod.lastSoldDate) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right pr-2">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedProductDrillDown(prod)}
                            className="h-7 text-[11px] px-2.5 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>Orders ({prod.orders.length})</span>
                          </Button>
                          {prod.slug && (
                            <Link
                              href={`/product/${prod.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                              title="View Public Store Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 space-y-2">
              <Package className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="font-bold text-white text-sm">No sales recorded for this date range.</p>
              <p className="text-xs text-zinc-500">
                Try switching the filter to &quot;All Time&quot; or verifying completed transactions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB B: COUPON PROMOTIONS ATTRIBUTION */}
      {activeTab === 'coupons' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Coupon Code Redemptions & Discounts Granted</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Performance breakdown of promotional discounts and attributed net sales.
            </p>
          </div>

          {couponMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-300 uppercase tracking-wider font-bold">
                    <th className="pb-3.5">Coupon Code</th>
                    <th className="pb-3.5 text-center">Times Redeemed</th>
                    <th className="pb-3.5 text-right">Total Discount Given</th>
                    <th className="pb-3.5 text-right">Net Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {couponMetrics.map((c) => (
                    <tr key={c.code} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 font-mono font-extrabold text-amber-400 text-sm">
                        {c.code}
                      </td>
                      <td className="py-3.5 text-center font-bold text-white">
                        {c.timesUsed} order{c.timesUsed !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3.5 text-right font-bold text-rose-400">
                        -{formatCurrency(c.totalDiscount)}
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-emerald-400 text-sm">
                        {formatCurrency(c.netRevenueGenerated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-8 text-center">
              No coupon codes redeemed in this period.
            </p>
          )}
        </div>
      )}

      {/* 7. TAB C: COMPLIMENTARY GRANTS (GIFTS) */}
      {activeTab === 'gifts' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              <span>Admin Grants & Complimentary Gifts</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Free access granted by BenzWell administrators. Zero revenue impact on Razorpay analytics.
            </p>
          </div>

          {giftMetrics.giftedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {giftMetrics.giftedProducts.map((g) => (
                <div
                  key={g.productId}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">{g.title}</p>
                    <p className="text-xs text-purple-400 font-semibold">{g.count} Gift Grants</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                    <Gift className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 py-8 text-center">No complimentary gifts granted.</p>
          )}
        </div>
      )}

      {/* 8. PRODUCT ORDERS DRILL-DOWN MODAL */}
      {selectedProductDrillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {selectedProductDrillDown.mainImage ? (
                    <img
                      src={selectedProductDrillDown.mainImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-zinc-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    {selectedProductDrillDown.title}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedProductDrillDown.salesCount} paid sale
                    {selectedProductDrillDown.salesCount !== 1 ? 's' : ''} •{' '}
                    <span className="text-emerald-400 font-bold">
                      {formatCurrency(selectedProductDrillDown.netRevenue)}
                    </span>{' '}
                    Total Net Revenue
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProductDrillDown(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Orders Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Purchasing Customers & Transactions
              </h4>

              {selectedProductDrillDown.orders.length > 0 ? (
                <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-300 uppercase font-bold">
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Price</th>
                        <th className="py-3 px-4 text-right">Discount</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {selectedProductDrillDown.orders.map((ord, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40">
                          <td className="py-3 px-4 font-bold text-white">
                            <Link
                              href={`/admin/orders/${ord.orderId}`}
                              className="text-sky-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <span>#{ord.orderNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-zinc-200">{ord.customerName}</p>
                            <p className="text-[11px] text-zinc-400">{ord.customerEmail}</p>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 text-[11px]">
                            {formatDate(ord.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-300">
                            {formatCurrency(ord.itemPrice)}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-400">
                            {ord.discount > 0 ? `-${formatCurrency(ord.discount)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-400 text-sm">
                            {ord.isGift ? 'GIFT' : formatCurrency(ord.finalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                ord.isGift
                                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {ord.isGift ? 'Gift' : ord.paymentStatus || ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 py-6 text-center">No orders found.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedProductDrillDown(null)}
              >
                Close Drill-Down
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
