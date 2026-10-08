'use client';

import React, { useState } from 'react';
import { Coupon } from '@/types';
import { createCouponAction, deleteCouponAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Tag, Plus, Trash2, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

export function CouponsManager({ initialCoupons }: { initialCoupons: any[] }) {
  const [coupons, setCoupons] = useState<any[]>(initialCoupons);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Creator Attribution Fields
  const [creatorName, setCreatorName] = useState('');
  const [creatorCommissionType, setCreatorCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [creatorCommissionValue, setCreatorCommissionValue] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order_amount: parseFloat(minOrderAmount) || 0,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      per_user_limit: 1,
      valid_from: new Date().toISOString(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: true,
      creator_name: creatorName.trim() || null,
      creator_commission_type: creatorName.trim() ? creatorCommissionType : null,
      creator_commission_value: creatorName.trim() && creatorCommissionValue ? parseFloat(creatorCommissionValue) : null,
    };

    const res = await createCouponAction(payload);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to create coupon');
      return;
    }

    if (res.coupon) {
      setCoupons([res.coupon, ...coupons]);
      setCode('');
      setDiscountValue('');
      setMinOrderAmount('0');
      setUsageLimit('');
      setExpiresAt('');
      setCreatorName('');
      setCreatorCommissionValue('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    const res = await deleteCouponAction(id);
    if (res.success) {
      setCoupons(coupons.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Create Coupon (5 cols) */}
      <div className="lg:col-span-5 p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-sky-400" />
          <span>Create Discount Coupon</span>
        </h3>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Coupon Code (e.g. RAHUL20)"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="PROMO2026"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <Input
              label={discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}
              type="number"
              step="0.01"
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '20' : '500'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Order (₹)"
              type="number"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
            />

            <Input
              label="Usage Limit (Total)"
              type="number"
              placeholder="Unlimited"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Optional Creator Tracking */}
          <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Social Creator Tracking (Optional)</span>
            </h4>

            <Input
              label="Creator Full Name"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />

            {creatorName.trim() && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase">
                    Commission Type
                  </label>
                  <select
                    value={creatorCommissionType}
                    onChange={(e) => setCreatorCommissionType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-[#161822] text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>

                <Input
                  label={creatorCommissionType === 'percentage' ? 'Commission (%)' : 'Commission (₹)'}
                  type="number"
                  step="0.01"
                  value={creatorCommissionValue}
                  onChange={(e) => setCreatorCommissionValue(e.target.value)}
                  placeholder={creatorCommissionType === 'percentage' ? '15' : '100'}
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            size="md"
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold shadow-md"
            isLoading={isLoading}
          >
            + Create Coupon
          </Button>
        </form>
      </div>

      {/* Coupons Table (7 cols) */}
      <div className="lg:col-span-7 p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        <h3 className="text-base font-bold text-white">Active Coupons ({coupons.length})</h3>

        {coupons.length > 0 ? (
          <div className="divide-y divide-zinc-800/80">
            {coupons.map((c) => (
              <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white font-mono">{c.code}</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}% OFF`
                        : `₹${c.discount_value} OFF`}
                    </span>
                    {c.creator_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        <span>{c.creator_name} ({c.creator_commission_type === 'percentage' ? `${c.creator_commission_value}%` : `₹${c.creator_commission_value}`})</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Used: {c.times_used || 0} {c.usage_limit ? `/ ${c.usage_limit}` : 'times'} • Min order: ₹{c.min_order_amount}
                  </p>
                  {c.expires_at && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">Expires: {formatDate(c.expires_at)}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-zinc-300 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Delete coupon"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 py-6 text-center">No coupons configured yet.</p>
        )}
      </div>
    </div>
  );
}
