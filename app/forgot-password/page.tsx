'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendForgotPasswordResetAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setStatus(null);

    const result = await sendForgotPasswordResetAction(email);
    setIsLoading(false);

    setStatus({
      success: result.success,
      message: result.message || (result as any).error || 'An error occurred.',
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
            Forgot Password
          </h1>
          <p className="text-xs text-zinc-500">
            Enter your email address and we will send you a secure recovery link.
          </p>
        </div>

        {status && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
              status.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}
          >
            {status.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            )}
            <span className="leading-relaxed">{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            label="Registered Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
          />

          <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
            <span>Send Reset Link</span>
          </Button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
