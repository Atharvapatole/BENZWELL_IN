'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';

export interface DateFilterOptions {
  range: 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'prev_month' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface ProductSalesMetric {
  productId: string;
  title: string;
  slug: string;
  mainImage: string | null;
  unitPrice: number;
  salesCount: number;
  grossRevenue: number;
  discountAmount: number;
  netRevenue: number;
  lastSoldDate: string | null;
  revenueSharePercent: number;
  giftCount: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    createdAt: string;
    itemPrice: number;
    couponCode: string | null;
    discount: number;
    finalAmount: number;
    paymentStatus: string;
    status: string;
    isGift: boolean;
  }>;
}

export interface CouponMetric {
  code: string;
  timesUsed: number;
  totalDiscount: number;
  netRevenueGenerated: number;
}

export interface DailyChartPoint {
  date: string;
  formattedDate: string;
  revenue: number;
  ordersCount: number;
  itemsCount: number;
}

export interface AnalyticsSummary {
  totalSuccessfulOrders: number;
  totalProductsSold: number;
  totalGrossRevenue: number;
  totalDiscounts: number;
  totalNetRevenue: number;
  averageOrderValue: number;
  bestSellingProduct: { title: string; count: number } | null;
  highestRevenueProduct: { title: string; revenue: number } | null;
  totalGiftOrders: number;
  totalGiftedUnits: number;
  totalCustomers: number;
  conversionRate: number;
}

export interface AnalyticsDataResult {
  success: boolean;
  error?: string;
  summary: AnalyticsSummary;
  productSales: ProductSalesMetric[];
  chartData: DailyChartPoint[];
  couponMetrics: CouponMetric[];
  giftMetrics: {
    totalGifts: number;
    giftedProducts: Array<{ productId: string; title: string; count: number }>;
  };
}

/**
 * Helper to compute start & end timestamps based on filter range
 */
function getDateBounds(options?: DateFilterOptions): { start: Date | null; end: Date | null } {
  if (!options || options.range === 'all') {
    return { start: null, end: null };
  }

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (options.range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };

    case '7d':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case '30d':
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end };

    case 'prev_month':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0); // Last day of previous month
      end.setHours(23, 59, 59, 999);
      return { start, end };

    case 'custom':
      const customStart = options.startDate ? new Date(options.startDate) : null;
      if (customStart) customStart.setHours(0, 0, 0, 0);
      const customEnd = options.endDate ? new Date(options.endDate) : null;
      if (customEnd) customEnd.setHours(23, 59, 59, 999);
      return { start: customStart, end: customEnd };

    default:
      return { start: null, end: null };
  }
}

/**
 * Fetch verified, real-world product sales, revenue, and order analytics from Supabase
 */
export async function getAnalyticsDataAction(
  filterOptions?: DateFilterOptions
): Promise<AnalyticsDataResult> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { start: dateStart, end: dateEnd } = getDateBounds(filterOptions);

    // 1. Fetch all orders with items and product snapshots
    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        user_id,
        customer_name,
        customer_email,
        subtotal,
        subtotal_amount,
        discount,
        discount_amount,
        total,
        final_amount,
        currency,
        status,
        payment_status,
        fulfillment_status,
        coupon_code,
        created_at,
        product_id,
        product_name_snapshot,
        product_price_snapshot,
        order_items (
          id,
          product_id,
          product_name_snapshot,
          price_snapshot,
          quantity,
          product:products (
            id,
            title,
            slug,
            main_image,
            price,
            sale_price
          )
        )
      `)
      .order('created_at', { ascending: true });

    if (dateStart) {
      ordersQuery = ordersQuery.gte('created_at', dateStart.toISOString());
    }
    if (dateEnd) {
      ordersQuery = ordersQuery.lte('created_at', dateEnd.toISOString());
    }

    // 2. Fetch all products and customer profiles in parallel
    const [ordersRes, productsRes, customersRes] = await Promise.all([
      ordersQuery,
      supabase.from('products').select('id, title, slug, main_image, price, sale_price, status'),
      supabase.from('profiles').select('id, role, created_at').eq('role', 'customer'),
    ]);

    if (ordersRes.error) {
      console.error('Error fetching analytics orders:', ordersRes.error);
      throw ordersRes.error;
    }

    const rawOrders = ordersRes.data || [];
    const allProducts = productsRes.data || [];
    const totalCustomers = customersRes.data?.length || 0;

    // Create a product lookup map by product ID
    const productMap = new Map<string, any>();
    allProducts.forEach((p) => productMap.set(p.id, p));

    // Aggregate storage containers
    const productSalesMap = new Map<string, ProductSalesMetric>();
    const couponMap = new Map<string, { timesUsed: number; totalDiscount: number; netRevenue: number }>();
    const dailyMap = new Map<string, { revenue: number; ordersCount: number; itemsCount: number }>();
    const giftedProductsMap = new Map<string, { title: string; count: number }>();

    let totalGrossRevenue = 0;
    let totalDiscounts = 0;
    let totalNetRevenue = 0;
    let totalProductsSold = 0;
    let totalSuccessfulOrders = 0;
    let totalGiftOrders = 0;
    let totalGiftedUnits = 0;

    // Helper to test if order is genuinely paid & successful
    const isPaidOrder = (o: any) => {
      if (o.order_type === 'admin_gift' || o.payment_status === 'gifted') return false;
      if (['failed', 'cancelled', 'refunded'].includes(o.status)) return false;
      if (['failed', 'refunded'].includes(o.payment_status)) return false;
      return (
        ['paid', 'fulfilled'].includes(o.status) ||
        ['captured', 'paid', 'authorized'].includes(o.payment_status)
      );
    };

    const isGiftOrder = (o: any) => {
      return o.order_type === 'admin_gift' || o.payment_status === 'gifted';
    };

    // Process each order
    for (const order of rawOrders) {
      const orderDate = new Date(order.created_at);
      const dayKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // -------------------------------------------------------------
      // CASE A: ADMIN GIFT / COMPLIMENTARY GRANT
      // -------------------------------------------------------------
      if (isGiftOrder(order)) {
        totalGiftOrders++;
        const items = order.order_items && order.order_items.length > 0
          ? order.order_items
          : [{ product_id: order.product_id, product_name_snapshot: order.product_name_snapshot, quantity: 1 }];

        for (const it of items) {
          const prodId = it.product_id || order.product_id || 'gift_unassigned';
          const qty = it.quantity || 1;
          totalGiftedUnits += qty;

          const existingGift = giftedProductsMap.get(prodId) || {
            title: it.product_name_snapshot || order.product_name_snapshot || productMap.get(prodId)?.title || 'Gifted Product',
            count: 0,
          };
          existingGift.count += qty;
          giftedProductsMap.set(prodId, existingGift);

          // Also record in product sales metric under giftCount
          if (!productSalesMap.has(prodId)) {
            const masterProd = productMap.get(prodId);
            productSalesMap.set(prodId, {
              productId: prodId,
              title: masterProd?.title || it.product_name_snapshot || order.product_name_snapshot || 'Gifted Product',
              slug: masterProd?.slug || 'product',
              mainImage: masterProd?.main_image || null,
              unitPrice: Number(masterProd?.sale_price || masterProd?.price || 0),
              salesCount: 0,
              grossRevenue: 0,
              discountAmount: 0,
              netRevenue: 0,
              lastSoldDate: null,
              revenueSharePercent: 0,
              giftCount: 0,
              orders: [],
            });
          }

          const pMetric = productSalesMap.get(prodId)!;
          pMetric.giftCount += qty;
          pMetric.orders.push({
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || 'Customer',
            customerEmail: order.customer_email,
            createdAt: order.created_at,
            itemPrice: 0,
            couponCode: null,
            discount: 0,
            finalAmount: 0,
            paymentStatus: 'gifted',
            status: order.status,
            isGift: true,
          });
        }
        continue;
      }

      // -------------------------------------------------------------
      // CASE B: GENUINELY SUCCESSFUL PAID PURCHASE
      // -------------------------------------------------------------
      if (isPaidOrder(order)) {
        totalSuccessfulOrders++;
        const orderNetTotal = Number(order.total ?? order.final_amount ?? 0);
        const orderGrossSubtotal = Number(
          order.subtotal ?? order.subtotal_amount ?? (orderNetTotal + Number(order.discount || 0))
        );
        const orderDiscount = Number(order.discount ?? order.discount_amount ?? 0);

        totalGrossRevenue += orderGrossSubtotal;
        totalDiscounts += orderDiscount;
        totalNetRevenue += orderNetTotal;

        // Daily chart point
        const curDaily = dailyMap.get(dayKey) || { revenue: 0, ordersCount: 0, itemsCount: 0 };
        curDaily.revenue += orderNetTotal;
        curDaily.ordersCount += 1;

        // Coupon attribution
        if (order.coupon_code) {
          const cCode = order.coupon_code.trim().toUpperCase();
          const curC = couponMap.get(cCode) || { timesUsed: 0, totalDiscount: 0, netRevenue: 0 };
          curC.timesUsed += 1;
          curC.totalDiscount += orderDiscount;
          curC.netRevenue += orderNetTotal;
          couponMap.set(cCode, curC);
        }

        // Determine items in order
        const items =
          order.order_items && order.order_items.length > 0
            ? order.order_items
            : [
                {
                  product_id: order.product_id,
                  product_name_snapshot: order.product_name_snapshot,
                  price_snapshot: order.product_price_snapshot || orderGrossSubtotal,
                  quantity: 1,
                  product: productMap.get(order.product_id),
                },
              ];

        // Process each item in order
        for (const item of items) {
          const prodId = item.product_id || item.product?.id || order.product_id || 'unassigned_product';
          const qty = Number(item.quantity || 1);
          totalProductsSold += qty;
          curDaily.itemsCount += qty;

          const masterProd = productMap.get(prodId) || item.product;
          const prodTitle = masterProd?.title || item.product_name_snapshot || order.product_name_snapshot || 'Digital Product';
          const prodSlug = masterProd?.slug || 'product';
          const prodImage = masterProd?.main_image || null;
          const unitPrice = Number(item.price_snapshot || masterProd?.sale_price || masterProd?.price || 0);

          const itemGross = unitPrice * qty;
          // Proportional discount allocation if order had multiple items
          const discountShare = orderGrossSubtotal > 0 ? (itemGross / orderGrossSubtotal) * orderDiscount : orderDiscount;
          const itemNet = Math.max(0, itemGross - discountShare);

          if (!productSalesMap.has(prodId)) {
            productSalesMap.set(prodId, {
              productId: prodId,
              title: prodTitle,
              slug: prodSlug,
              mainImage: prodImage,
              unitPrice,
              salesCount: 0,
              grossRevenue: 0,
              discountAmount: 0,
              netRevenue: 0,
              lastSoldDate: null,
              revenueSharePercent: 0,
              giftCount: 0,
              orders: [],
            });
          }

          const pMetric = productSalesMap.get(prodId)!;
          pMetric.salesCount += qty;
          pMetric.grossRevenue += itemGross;
          pMetric.discountAmount += discountShare;
          pMetric.netRevenue += itemNet;

          // Track last sold date
          if (!pMetric.lastSoldDate || new Date(order.created_at) > new Date(pMetric.lastSoldDate)) {
            pMetric.lastSoldDate = order.created_at;
          }

          // Append to product orders drill-down list
          pMetric.orders.push({
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || 'Customer',
            customerEmail: order.customer_email,
            createdAt: order.created_at,
            itemPrice: unitPrice,
            couponCode: order.coupon_code || null,
            discount: discountShare,
            finalAmount: itemNet,
            paymentStatus: order.payment_status || 'paid',
            status: order.status,
            isGift: false,
          });
        }

        dailyMap.set(dayKey, curDaily);
      }
    }

    // Convert product metrics to array & calculate revenue share percentage
    const productSalesList = Array.from(productSalesMap.values()).map((p) => ({
      ...p,
      grossRevenue: Math.round(p.grossRevenue * 100) / 100,
      discountAmount: Math.round(p.discountAmount * 100) / 100,
      netRevenue: Math.round(p.netRevenue * 100) / 100,
      revenueSharePercent:
        totalNetRevenue > 0 ? Math.round((p.netRevenue / totalNetRevenue) * 1000) / 10 : 0,
    }));

    // Sort by Net Revenue descending, then salesCount descending
    productSalesList.sort((a, b) => b.netRevenue - a.netRevenue || b.salesCount - a.salesCount);

    // Identify Best Seller & Highest Revenue Product
    let bestSellingProduct: { title: string; count: number } | null = null;
    let highestRevenueProduct: { title: string; revenue: number } | null = null;

    const paidProducts = productSalesList.filter((p) => p.salesCount > 0);
    if (paidProducts.length > 0) {
      const topCount = [...paidProducts].sort((a, b) => b.salesCount - a.salesCount)[0];
      const topRev = [...paidProducts].sort((a, b) => b.netRevenue - a.netRevenue)[0];

      if (topCount) bestSellingProduct = { title: topCount.title, count: topCount.salesCount };
      if (topRev) highestRevenueProduct = { title: topRev.title, revenue: topRev.netRevenue };
    }

    // Build Chart Data Points
    const chartData: DailyChartPoint[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, val]) => {
        const d = new Date(dateKey);
        const formattedDate = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        return {
          date: dateKey,
          formattedDate,
          revenue: Math.round(val.revenue * 100) / 100,
          ordersCount: val.ordersCount,
          itemsCount: val.itemsCount,
        };
      });

    // Build Coupon Metrics
    const couponMetrics: CouponMetric[] = Array.from(couponMap.entries()).map(([code, c]) => ({
      code,
      timesUsed: c.timesUsed,
      totalDiscount: Math.round(c.totalDiscount * 100) / 100,
      netRevenueGenerated: Math.round(c.netRevenue * 100) / 100,
    }));

    // Build Gift Metrics
    const giftMetrics = {
      totalGifts: totalGiftOrders,
      giftedProducts: Array.from(giftedProductsMap.entries()).map(([productId, g]) => ({
        productId,
        title: g.title,
        count: g.count,
      })),
    };

    const avgOrderValue =
      totalSuccessfulOrders > 0
        ? Math.round((totalNetRevenue / totalSuccessfulOrders) * 100) / 100
        : 0;

    const conversionRate =
      rawOrders.length > 0
        ? Math.round((totalSuccessfulOrders / rawOrders.length) * 1000) / 10
        : 0;

    return {
      success: true,
      summary: {
        totalSuccessfulOrders,
        totalProductsSold,
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
        averageOrderValue: avgOrderValue,
        bestSellingProduct,
        highestRevenueProduct,
        totalGiftOrders,
        totalGiftedUnits,
        totalCustomers,
        conversionRate,
      },
      productSales: productSalesList,
      chartData,
      couponMetrics,
      giftMetrics,
    };
  } catch (err: any) {
    console.error('getAnalyticsDataAction error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to load revenue and product analytics.',
      summary: {
        totalSuccessfulOrders: 0,
        totalProductsSold: 0,
        totalGrossRevenue: 0,
        totalDiscounts: 0,
        totalNetRevenue: 0,
        averageOrderValue: 0,
        bestSellingProduct: null,
        highestRevenueProduct: null,
        totalGiftOrders: 0,
        totalGiftedUnits: 0,
        totalCustomers: 0,
        conversionRate: 0,
      },
      productSales: [],
      chartData: [],
      couponMetrics: [],
      giftMetrics: { totalGifts: 0, giftedProducts: [] },
    };
  }
}
