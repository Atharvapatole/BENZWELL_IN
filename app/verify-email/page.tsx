'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyOtpAction, resendOtpAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { MailCheck, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const redirectPath = searchParams.get('redirect') || '/account';

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('otp', otp);

    const result = await verifyOtpAction(null, formData);

    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setSuccessMessage('Email verified successfully! Redirecting...');
    setTimeout(() => {
      router.push(redirectPath);
      router.refresh();
    }, 1200);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('email', email);

    const result = await resendOtpAction(null, formData);

    setIsResending(false);
    if (result.success) {
      setCooldown(60);
      setSuccessMessage('A fresh 6-digit verification code has been dispatched to your email.');
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 text-sky-500 mb-2">
          <MailCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
          Verify Your Email
        </h1>
        <p className="text-xs text-zinc-500 leading-relaxed">
          We sent a 6-digit verification code to <br />
          <strong className="text-zinc-800 dark:text-zinc-200">{email || 'your email'}</strong>
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        {!emailParam && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-sm focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-1.5 text-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Enter 6-Digit Code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="w-full text-center text-3xl font-extrabold tracking-[10px] py-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-950/80 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:outline-none font-mono"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          <span>Verify & Continue</span>
        </Button>
      </form>

      {/* Resend Cooldown Section */}
      <div className="text-center pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
        {cooldown > 0 ? (
          <p className="text-xs text-zinc-400">
            Resend code available in <span className="font-semibold text-zinc-600 dark:text-zinc-300">{cooldown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-xs font-semibold text-sky-500 hover:underline inline-flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>Resend verification code</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <Suspense fallback={<div className="text-center py-12 text-sm text-zinc-500">Loading verification...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
