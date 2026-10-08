'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  verifyOrderWithRazorpayLiveAction,
  resendOrderEmailAction,
  reconcileOrderEntitlementAction,
  revokeEntitlementAction,
  getOrderDetailsAction,
} from '@/actions/admin';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  Download,
  Calendar,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Gift,
  Tag,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export function OrderDetailModal({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live action loadings
  const [isVerifyingRzp, setIsVerifyingRzp] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderDetails(orderId);
    } else {
      setOrder(null);
      setError(null);
      setActionMessage(null);
    }
  }, [isOpen, orderId]);

  const loadOrderDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setActionMessage(null);

    const res = await getOrderDetailsAction(id);
    setIsLoading(false);

    if (res.success && res.order) {
      setOrder(res.order);
    } else {
      setError(res.error || 'Failed to load order details.');
    }
  };

  if (!isOpen || !orderId) return null;

  const handleLiveRazorpayCheck = async () => {
    if (!order?.id) return;
    setIsVerifyingRzp(true);
    setActionMessage(null);

    const res = await verifyOrderWithRazorpayLiveAction(order.id);
    setIsVerifyingRzp(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: `✓ ${res.message}` });
      await loadOrderDetails(order.id);
      if (onOrderUpdated) onOrderUpdated();
    } else {
      setActionMessage({ type: 'error', text: `✕ ${res.error || 'Live verification failed.'}` });
    }
  };

  const handleResendEmail = async () => {
    if (!order?.id) return;
    setIsResendingEmail(true);
    setActionMessage(null);

    const res = await resendOrderEmailAction(order.id);
    setIsResendingEmail(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: '✓ Confirmation email dispatched successfully to customer.' });
    } else {
      setActionMessage({ type: 'error', text: `✕ ${res.error || 'Failed to send email.'}` });
    }
  };

  const handleReconcileEntitlements = async () => {
    if (!order?.id) return;
    setIsReconciling(true);
    setActionMessage(null);

    const res = await reconcileOrderEntitlementAction(order.id);
    setIsReconciling(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: `✓ ${res.message}` });
      await loadOrderDetails(order.id);
      if (onOrderUpdated) onOrderUpdated();
    } else {
      setActionMessage({ type: 'error', text: `✕ ${res.error || 'Reconciliation failed.'}` });
    }
  };

  const handleRevokeEntitlement = async (entitlementId: string) => {
    if (!confirm('Are you sure you want to revoke this digital product entitlement? The customer will immediately lose download access.')) {
      return;
    }

    setIsRevoking(true);
    setActionMessage(null);

    const res = await revokeEntitlementAction(entitlementId, order.id, 'Admin manual revocation');
    setIsRevoking(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: '✓ Digital product entitlement revoked.' });
      await loadOrderDetails(order.id);
      if (onOrderUpdated) onOrderUpdated();
    } else {
      setActionMessage({ type: 'error', text: `✕ ${res.error || 'Failed to revoke entitlement.'}` });
    }
  };

  const isGift = order?.order_type === 'admin_gift' || order?.payment_status === 'gifted';
  const isPaid = order?.payment_status === 'paid' || order?.payment_status === 'captured' || order?.status === 'fulfilled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sky-400" />
                <span>Order #{order?.order_number || 'Loading...'}</span>
              </h3>

              {order && (
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold capitalize ${
                    isGift
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : isPaid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : order.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  {isGift ? 'Gift / Courtesy' : order.payment_status || order.status}
                </span>
              )}
            </div>

            {order && (
              <p className="text-xs text-zinc-400">
                Created on {new Date(order.created_at).toLocaleString()} • Type: <strong className="text-zinc-200 uppercase">{order.order_type || 'razorpay_purchase'}</strong>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                : 'bg-red-950/60 text-red-300 border border-red-800'
            }`}
          >
            <span>{actionMessage.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Retrieving full order ledger from Supabase...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-3 rounded-2xl bg-red-950/40 border border-red-900 text-red-300">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Customer */}
              <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Customer Profile</span>
                </h4>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-white text-sm truncate">{order.customer_name_snapshot || order.customer_name || 'Customer'}</p>
                  <p className="text-zinc-300 truncate font-mono text-[11px]">{order.customer_email_snapshot || order.customer_email}</p>
                  {order.customer_phone && <p className="text-zinc-400">{order.customer_phone}</p>}
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payment Gateway</span>
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Payment Status:</span>
                    <span className="font-bold text-emerald-400 capitalize">{order.payment_status || order.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Razorpay Pay ID:</span>
                    <span className="font-mono text-zinc-200 truncate max-w-[120px]">{order.razorpay_payment_id || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Razorpay Order:</span>
                    <span className="font-mono text-zinc-400 truncate max-w-[120px]">{order.razorpay_order_id || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Fulfillment & Delivery */}
              <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fulfillment & Delivery</span>
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Fulfillment:</span>
                    <span className="font-bold text-sky-400 capitalize">{order.fulfillment_status || 'available'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Claim Status:</span>
                    <span className="font-semibold text-zinc-200">
                      {order.claimed_at ? `Claimed ${formatDate(order.claimed_at)}` : 'Not Claimed Yet'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Delivery Status:</span>
                    <span className="font-semibold text-emerald-400 capitalize">{order.delivery_status || 'delivered'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-5 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Financial & Promotional Snapshot</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Subtotal</span>
                  <p className="font-bold text-white text-sm">{formatCurrency(order.subtotal_amount || order.subtotal || order.total)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Discount ({order.coupon_code || order.coupon_code_snapshot || 'None'})</span>
                  <p className="font-bold text-emerald-400 text-sm">
                    {order.discount_amount || order.discount ? `-${formatCurrency(order.discount_amount || order.discount)}` : '₹0'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Final Paid Amount</span>
                  <p className="font-extrabold text-white text-base">{formatCurrency(order.final_amount || order.total)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Creator Attribution</span>
                  <p className="font-semibold text-sky-300 truncate">{order.creator_name_snapshot || 'Direct Storefront'}</p>
                </div>
              </div>
            </div>

            {/* Purchased Items List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Purchased Digital Items ({order.order_items?.length || 0})
              </h4>
              <div className="divide-y divide-zinc-800 rounded-2xl bg-[#0e1017] border border-zinc-800 overflow-hidden">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">{item.product_name_snapshot}</p>
                      <p className="text-[11px] text-zinc-400">Quantity: {item.quantity || 1} • Digital Product</p>
                    </div>
                    <span className="font-extrabold text-white text-sm">
                      {formatCurrency(item.price_snapshot * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Customer Entitlements */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Digital Product Entitlements ({order.customer_entitlements?.length || 0})
              </h4>
              <div className="space-y-2">
                {order.customer_entitlements?.length > 0 ? (
                  order.customer_entitlements.map((ent: any) => (
                    <div
                      key={ent.id}
                      className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ent.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {ent.is_active ? 'Active Entitlement' : 'Revoked'}
                          </span>
                          {ent.is_gift && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Gifted
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-300">
                          Downloads: <strong className="text-white">{ent.downloads_used || 0}</strong> / {ent.download_limit || 10} • Granted on {formatDate(ent.created_at)}
                        </p>
                        {ent.gift_message && (
                          <p className="text-[11px] text-emerald-400 italic">&ldquo;{ent.gift_message}&rdquo;</p>
                        )}
                      </div>

                      {ent.is_active && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeEntitlement(ent.id)}
                          isLoading={isRevoking}
                          className="border-red-800 text-red-400 hover:bg-red-950/40 text-xs self-start sm:self-auto"
                        >
                          Revoke Access
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-amber-300 text-xs flex items-center justify-between">
                    <span>No active entitlements found for this order.</span>
                    {isPaid && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleReconcileEntitlements}
                        isLoading={isReconciling}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                      >
                        Grant / Reconcile Entitlements
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Download Audit Logs */}
            {order.download_logs?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Customer Download Access Audit ({order.download_logs.length})
                </h4>
                <div className="max-h-32 overflow-y-auto rounded-xl bg-[#0e1017] border border-zinc-800 p-3 space-y-1.5 font-mono text-[10px] text-zinc-400">
                  {order.download_logs.map((log: any) => (
                    <div key={log.id} className="flex justify-between">
                      <span>{new Date(log.downloaded_at).toLocaleString()}</span>
                      <span>IP: {log.ip_address || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Action Toolbar */}
            <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-800 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                {!isGift && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleLiveRazorpayCheck}
                    isLoading={isVerifyingRzp}
                    className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Verify with Live Razorpay</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResendEmail}
                  isLoading={isResendingEmail}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  <span>Resend Confirmation Email</span>
                </Button>

                {isPaid && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleReconcileEntitlements}
                    isLoading={isReconciling}
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    <span>Reconcile Entitlements</span>
                  </Button>
                )}
              </div>

              <Button type="button" size="sm" onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
