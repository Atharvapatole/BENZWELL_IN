'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toggleCustomerStatusAction } from '@/actions/admin';
import {
  Users,
  Trophy,
  Search,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export interface CustomerStatsItem {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_verified: boolean;
  is_disabled: boolean;
  created_at: string;
  ordersCount: number;
  totalSpent: number;
  totalProductsPurchased: number;
  globalRank: number;
}

interface CustomersManagerProps {
  initialCustomers: CustomerStatsItem[];
}

export function CustomersManager({ initialCustomers }: CustomersManagerProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'rankings'>('directory');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate Global Rankings for "Most Products Purchased" strictly from real data
  const rankedCustomers = useMemo(() => {
    // Sort all customers descending by totalProductsPurchased
    const sorted = [...initialCustomers].sort((a, b) => {
      if (b.totalProductsPurchased !== a.totalProductsPurchased) {
        return b.totalProductsPurchased - a.totalProductsPurchased;
      }
      return b.totalSpent - a.totalSpent;
    });

    // Assign permanent 1-based global rank
    return sorted.map((cust, idx) => ({
      ...cust,
      globalRank: idx + 1,
    }));
  }, [initialCustomers]);

  // 2. Filter while preserving globalRank
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rankedCustomers;

    return rankedCustomers.filter((c) => {
      const name = (c.full_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [rankedCustomers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & Search / Tab Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Tab Toggle */}
        <div className="flex items-center p-1 rounded-2xl bg-[#12131c] border border-zinc-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Directory ({rankedCustomers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'rankings'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Ranking: Most Products Purchased</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#12131c] border border-zinc-700/80 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:border-sky-500 transition-colors"
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

      {/* Main Table Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-300 uppercase tracking-wider font-bold">
                  {activeTab === 'rankings' && <th className="pb-3.5 w-24">Rank</th>}
                  <th className="pb-3.5">Customer</th>
                  <th className="pb-3.5">Verification</th>
                  <th className="pb-3.5">Products Purchased</th>
                  <th className="pb-3.5">Paid Orders</th>
                  <th className="pb-3.5">Total Spent</th>
                  <th className="pb-3.5">Registered</th>
                  <th className="pb-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/50 transition-colors">
                    {activeTab === 'rankings' && (
                      <td className="py-4 font-bold">
                        <div className="flex items-center gap-1.5">
                          {c.globalRank === 1 ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs flex items-center gap-1">
                              🥇 Rank #1
                            </span>
                          ) : c.globalRank === 2 ? (
                            <span className="px-2.5 py-1 rounded-full bg-zinc-300/20 text-zinc-200 border border-zinc-400/40 font-extrabold text-xs flex items-center gap-1">
                              🥈 Rank #2
                            </span>
                          ) : c.globalRank === 3 ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40 font-extrabold text-xs flex items-center gap-1">
                              🥉 Rank #3
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold text-xs">
                              Rank #{c.globalRank}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    <td className="py-4">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-bold text-white text-sm hover:text-sky-400 transition-colors"
                      >
                        {c.full_name || 'Valued Customer'}
                      </Link>
                      <p className="text-zinc-300 text-xs mt-0.5">{c.email}</p>
                      {c.phone && <p className="text-zinc-400 text-[11px] mt-0.5">{c.phone}</p>}
                    </td>

                    <td className="py-4">
                      {c.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-semibold bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-xs text-amber-300 font-semibold bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="py-4">
                      <span className="font-extrabold text-white text-sm px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {c.totalProductsPurchased} item(s)
                      </span>
                    </td>

                    <td className="py-4 text-zinc-200 font-semibold text-sm">
                      {c.ordersCount}
                    </td>

                    <td className="py-4 font-extrabold text-white text-sm">
                      {formatCurrency(c.totalSpent)}
                    </td>

                    <td className="py-4 text-zinc-300">{formatDate(c.created_at)}</td>

                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-zinc-700 transition-colors"
                        >
                          View 360
                        </Link>
                        {c.role !== 'admin' && (
                          <form
                            action={async () => {
                              await toggleCustomerStatusAction(c.id, !c.is_disabled);
                            }}
                          >
                            <button
                              type="submit"
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                c.is_disabled
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25'
                              }`}
                            >
                              {c.is_disabled ? 'Enable' : 'Suspend'}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center space-y-2">
            <Users className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No customers found</p>
            <p className="text-xs text-zinc-400">
              {searchQuery
                ? `No matching customer records for "${searchQuery}".`
                : 'Registered customer accounts will appear here automatically.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
