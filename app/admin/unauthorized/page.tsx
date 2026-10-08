'use client';

import React from 'react';
import Link from 'next/link';
import { adminSignOutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut, Home, UserCheck } from 'lucide-react';

export default function AdminUnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0c0d12] text-white">
      <div className="w-full max-w-md p-8 rounded-3xl border border-zinc-700/80 bg-[#161822]/90 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-1">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
            403 — Access Denied
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2">
            Admin Privileges Required
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Your authenticated session does not have administrative permissions to access the BenzWell Control Center.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-700/60 text-xs text-zinc-300 space-y-2 text-left">
          <div className="flex items-center gap-2 text-sky-400 font-semibold">
            <UserCheck className="w-4 h-4" />
            <span>Need administrator access?</span>
          </div>
          <p className="text-zinc-400">
            Sign out of this customer account and sign in using your designated administrator credentials (e.g. <strong className="text-zinc-200">info@benzwell.in</strong>).
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <form action={adminSignOutAction}>
            <Button
              type="submit"
              size="lg"
              className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Switch to Admin Account</span>
              </span>
            </Button>
          </form>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/account"
              className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
            >
              Customer Portal
            </Link>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
