import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { updateOrderStatusAction, resendOrderEmailAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, ShieldCheck, ShoppingBag, User, CreditCard } from 'lucide-react';
import { Order } from '@/types';

export const revalidate = 0;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
  let orderQuery = supabase.from('orders').select('*, order_items(*), payments(*)');
  if (isUuid) {
    orderQuery = orderQuery.or(`id.eq.${id.trim()},order_number.eq.${id.trim()}`);
  } else {
    orderQuery = orderQuery.eq('order_number', id.trim());
  }

  const { data: orderData, error: orderError } = await orderQuery.maybeSingle();

  if (orderError || !orderData) {
    notFound();
  }

  const order: any = orderData;
  const { data: entData } = await supabase
    .from('customer_entitlements')
    .select('*, products(title)')
    .eq('order_id', order.id);

  const entitlements = entData || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Order #{order.order_number}</h1>
            <p className="text-xs text-zinc-400">Created on {formatDate(order.created_at)}</p>
          </div>
        </div>

        <form
          action={async () => {
            'use server';
            await resendOrderEmailAction(order.id);
          }}
        >
          <Button type="submit" size="sm" variant="secondary">
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            <span>Resend Confirmation Email</span>
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Items & Payment Info (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchased Items */}
          <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Order Items Snapshot
            </h3>

            <div className="divide-y divide-zinc-800/60">
              {(order.order_items || order.items || []).map((item: any) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {item.product_name_snapshot}
                    </h4>
                    <p className="text-zinc-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-extrabold text-white text-sm">
                    {formatCurrency(item.price_snapshot)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="text-white font-semibold">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount Applied</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-zinc-800">
                <span>Total Amount</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Entitlements Generated */}
          <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Customer Entitlements Generated</span>
            </h3>

            {entitlements.length > 0 ? (
              <div className="space-y-3">
                {entitlements.map((ent: any) => (
                  <div key={ent.id} className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{ent.products?.title || 'Product'}</p>
                      <p className="text-zinc-500 text-[11px]">
                        Downloads Used: {ent.downloads_used} / {ent.download_limit}
                      </p>
                    </div>
                    <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-800">
                      Active Entitlement
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No entitlements granted yet (Pending payment confirmation).</p>
            )}
          </div>
        </div>

        {/* Customer & Status Side (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Details */}
          <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Customer</h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-white text-sm">{order.customer_name || 'Customer'}</p>
              <p className="text-zinc-300">{order.customer_email}</p>
              {order.customer_phone && <p className="text-zinc-400">{order.customer_phone}</p>}
            </div>
          </div>

          {/* Razorpay References */}
          <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payment Metadata</h3>
            <div className="space-y-2">
              <div>
                <span className="text-zinc-500 block text-[10px]">Razorpay Order ID</span>
                <span className="font-mono text-zinc-300">{order.razorpay_order_id || '—'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Razorpay Payment ID</span>
                <span className="font-mono text-zinc-300">{order.razorpay_payment_id || '—'}</span>
              </div>
            </div>
          </div>

          {/* Status Update Form */}
          <div className="p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Update Status</h3>
            <form
              action={async (formData: FormData) => {
                'use server';
                const newStatus = formData.get('status') as string;
                await updateOrderStatusAction(order.id, newStatus);
              }}
              className="space-y-3"
            >
              <select
                name="status"
                defaultValue={order.status}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-white capitalize focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="payment_processing">Payment Processing</option>
                <option value="paid">Paid</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              <Button type="submit" size="sm" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold">
                Update Order Status
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
