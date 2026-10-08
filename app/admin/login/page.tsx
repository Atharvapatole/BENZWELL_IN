'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminLoginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin';
  const errorParam = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized' ? 'Access denied. Administrative privileges required.' : null
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await adminLoginAction(null, formData);

    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed');
      return;
    }

    router.push(redirectPath);
    router.refresh();
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-zinc-700/80 bg-[#161822]/95 backdrop-blur-2xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 mb-2">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">BENZWELL ADMIN</h1>
        <p className="text-xs text-zinc-300">
          Sign in to access your administrative control center.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Admin Email
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="info@benzwell.in"
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-[#0e1017] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-[#0e1017] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold"
            isLoading={isLoading}
          >
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Sign In to Admin</span>
            </span>
          </Button>
        </div>
      </form>

      <div className="pt-2 text-center flex items-center justify-between border-t border-zinc-800/80 text-xs">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Store</span>
        </Link>
        <span className="text-[11px] text-zinc-500">Encrypted Admin Session</span>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0c0d12] text-white">
      <Suspense fallback={<div className="text-zinc-400 text-sm">Loading admin login...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}

