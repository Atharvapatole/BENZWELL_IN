'use client';

import React, { useState, useEffect } from 'react';
import { giftProductAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import {
  Gift,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  User,
  Package,
  Sparkles,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

interface GiftProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customers: Array<{ id: string; full_name?: string; email: string; phone?: string }>;
  products: Array<{ id: string; title: string; price: number; sale_price?: number; product_type: string }>;
  preselectedCustomerId?: string;
}

export function GiftProductModal({
  isOpen,
  onClose,
  onSuccess,
  customers = [],
  products = [],
  preselectedCustomerId,
}: GiftProductModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [giftReason, setGiftReason] = useState('Admin Courtesy Grant');
  const [adminNote, setAdminNote] = useState('');
  const [messageToCustomer, setMessageToCustomer] = useState(
    'Enjoy this digital resource as a courtesy from the BenzWell team! Your files are unlocked and ready under Account → My Downloads.'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ message: string; orderNumber: string } | null>(null);

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    }
  }, [preselectedCustomerId]);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.email.toLowerCase().includes(q) ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  });

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.product_type.toLowerCase().includes(q);
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer to receive the gift.');
      return;
    }
    if (!selectedProductId) {
      setError('Please select a product to gift.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await giftProductAction({
      customerId: selectedCustomerId,
      productId: selectedProductId,
      giftReason,
      adminNote,
      messageToCustomer,
    });

    setIsLoading(false);

    if (res.success && res.orderNumber) {
      setSuccessResult({
        message: res.message || 'Product gifted successfully.',
        orderNumber: res.orderNumber,
      });
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'Failed to gift product.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-400" />
              <span>Gift Product / Manual Entitlement Grant</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Grant immediate, legitimate lifetime access to any customer. Generates a distinct <code>admin_gift</code> order with zero-fee snapshot.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successResult ? (
          <div className="p-8 text-center space-y-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-white">Gift Granted Successfully!</h4>
              <p className="text-xs text-zinc-300">
                Order <strong className="text-sky-400">#{successResult.orderNumber}</strong> has been generated and permanent digital entitlement is now active in the customer&apos;s account.
              </p>
            </div>
            <p className="text-xs text-emerald-400 font-medium">{successResult.message}</p>
            <div className="pt-2">
              <Button
                type="button"
                size="md"
                onClick={() => {
                  setSuccessResult(null);
                  onClose();
                }}
                className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold px-6"
              >
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. SELECT CUSTOMER */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>1. Select Recipient Customer</span>
              </label>

              {selectedCustomer ? (
                <div className="p-3.5 rounded-2xl bg-[#0e1017] border border-sky-500/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{selectedCustomer.full_name || 'Customer'}</p>
                    <p className="text-[11px] text-sky-300 font-mono">{selectedCustomer.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId('')}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    Change Customer
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer by name, email, or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0e1017] border border-zinc-700 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-zinc-800 rounded-xl bg-[#0e1017] border border-zinc-800">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-2.5 text-xs hover:bg-zinc-800 flex items-center justify-between text-zinc-300 hover:text-white transition-colors"
                        >
                          <span className="font-semibold">{c.full_name || 'Customer'}</span>
                          <span className="text-[11px] text-zinc-400 font-mono">{c.email}</span>
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-[11px] text-zinc-500 text-center">No matching customers found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. SELECT PRODUCT */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Select Digital Product to Gift</span>
              </label>

              {selectedProduct ? (
                <div className="p-3.5 rounded-2xl bg-[#0e1017] border border-amber-500/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{selectedProduct.title}</p>
                    <p className="text-[11px] text-zinc-400 capitalize">
                      {selectedProduct.product_type} • Value: {formatCurrency(Number(selectedProduct.sale_price ?? selectedProduct.price))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProductId('')}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    Change Product
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search product catalog..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0e1017] border border-zinc-700 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-zinc-800 rounded-xl bg-[#0e1017] border border-zinc-800">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch('');
                          }}
                          className="w-full text-left p-2.5 text-xs hover:bg-zinc-800 flex items-center justify-between text-zinc-300 hover:text-white transition-colors"
                        >
                          <span className="font-semibold truncate max-w-xs">{p.title}</span>
                          <span className="text-[11px] text-amber-400 font-bold">
                            {formatCurrency(Number(p.sale_price ?? p.price))}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-[11px] text-zinc-500 text-center">No products found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. GIFT METADATA & REASON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Gift Category / Reason</label>
                <select
                  value={giftReason}
                  onChange={(e) => setGiftReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="Admin Courtesy Grant">Admin Courtesy Grant</option>
                  <option value="Community / Giveaway Winner">Community / Giveaway Winner</option>
                  <option value="VIP Creator / Partner Access">VIP Creator / Partner Access</option>
                  <option value="Support Dispute Resolution">Support Dispute Resolution</option>
                  <option value="Beta Tester Review Access">Beta Tester Review Access</option>
                </select>
              </div>

              <Input
                label="Internal Admin Note (Private)"
                placeholder="Optional internal reference..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            {/* 4. CUSTOM MESSAGE TO CUSTOMER */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Message to Customer (Shown in Email & Downloads Tab)</span>
              </label>
              <textarea
                rows={3}
                value={messageToCustomer}
                onChange={(e) => setMessageToCustomer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 leading-relaxed"
                placeholder="Write a personal note to the customer..."
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-fee audited grant • Dispatches Resend email</span>
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs text-zinc-400">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  isLoading={isLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-md"
                >
                  <Gift className="w-3.5 h-3.5 mr-1.5" />
                  <span>Confirm & Gift Product</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
