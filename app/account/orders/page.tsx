import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingBag, ShieldCheck, CheckCircle2, ArrowRight, Gift, Download, Tag } from 'lucide-react';

export const revalidate = 0;

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; order?: string }>;
}) {
  const { success, order: successOrderNumber } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: orders } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const orderList = orders || [];

  return (
    <div className="space-y-6">
      {/* Success Notification if arriving from completed Razorpay checkout */}
      {success && successOrderNumber && (
        <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-800 text-emerald-100 flex items-start gap-3 shadow-glass">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Payment Successful! Order Confirmed</h4>
            <p className="text-xs text-emerald-300">
              Your order <strong className="text-white">#{successOrderNumber}</strong> has been fulfilled. Your digital files are unlocked and available under My Downloads.
            </p>
            <Link
              href="/account/downloads"
              className="inline-block text-xs font-bold text-sky-400 hover:text-sky-300 underline mt-1"
            >
              Go to Downloads &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-sky-400" />
          <span>Your Order History</span>
        </h1>
        <p className="text-xs text-zinc-400">
          View all past orders, transaction details, BenzWell order numbers (<code>BZ-YYYYMMDD-XXXXXX</code>), and download access.
        </p>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orderList.length > 0 ? (
          orderList.map((order) => {
            const isGift = order.order_type === 'admin_gift' || order.payment_status === 'gifted';
            const isPaid = order.payment_status === 'paid' || order.payment_status === 'captured' || order.status === 'paid' || order.status === 'fulfilled';

            return (
              <div
                key={order.id}
                className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Order Number</span>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-extrabold text-base text-white">
                        #{order.order_number}
                      </h3>
                      {isGift && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          <span>Admin Gift</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Placed on {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Total Amount</span>
                    <div className="font-extrabold text-lg text-white">
                      {isGift ? '₹0 (Gift Grant)' : formatCurrency(Number(order.final_amount ?? order.total ?? 0))}
                    </div>
                    <div className="flex items-center gap-1.5 sm:justify-end mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isGift
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isGift ? 'Gift' : order.payment_status || order.status}
                      </span>

                      {order.claimed_at && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Claimed ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items in this Order */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Purchased Items
                  </span>
                  <div className="divide-y divide-zinc-800 rounded-2xl bg-[#0e1017] border border-zinc-800 px-4">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: any) => (
                        <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-white">
                              {item.product_name_snapshot}
                            </p>
                            <p className="text-[11px] text-zinc-400">Instant Digital Access</p>
                          </div>
                          <span className="font-bold text-white">
                            {isGift ? '₹0' : formatCurrency(item.price_snapshot)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">
                            {order.product_name_snapshot || 'Digital Product'}
                          </p>
                          <p className="text-[11px] text-zinc-400">Instant Digital Access</p>
                        </div>
                        <span className="font-bold text-white">
                          {isGift ? '₹0' : formatCurrency(Number(order.final_amount ?? order.total ?? 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Footer Actions */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-zinc-800 text-xs gap-2">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {isGift
                        ? 'Complimentary BenzWell Gift Grant'
                        : `Payment Reference: ${order.razorpay_payment_id || 'Captured'}`}
                    </span>
                  </div>
                  <Link
                    href="/account/downloads"
                    className="font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Access My Downloads</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#161822]/90 border border-dashed border-zinc-800 space-y-3">
            <ShoppingBag className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-white">No orders yet</p>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Your completed orders and receipts will appear here after you make a purchase or receive a gift grant.
            </p>
            <Link
              href="/shop"
              className="inline-block text-xs font-bold text-sky-400 hover:underline pt-2"
            >
              Browse Catalog &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

