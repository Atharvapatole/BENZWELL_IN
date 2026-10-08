'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginCustomer } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { getBaseUrl } from '@/lib/utils';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/account';
  const errorParam = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let displayedError = errorMessage;
  if (!displayedError && errorParam) {
    if (errorParam === 'google_auth_failed' || errorParam === 'oauth_failed') {
      displayedError = 'Google sign-in could not be completed. Please try again.';
    } else if (errorParam === 'cancelled' || errorParam === 'access_denied') {
      displayedError = 'Google sign-in was cancelled.';
    } else if (errorParam === 'auth_callback_failed') {
      displayedError = 'Authentication could not be completed. Please try again.';
    } else {
      displayedError = 'Sign-in could not be completed. Please try again.';
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginCustomer(null, formData);

    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to sign in');
      return;
    }

    router.push(redirectPath);
    router.refresh();
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    window.location.href = `/api/auth/google?next=${encodeURIComponent(redirectPath)}`;
  };

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mb-2">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
          Sign In to BenzWell
        </h1>
        <p className="text-xs text-zinc-500">
          Access your purchased digital products and downloads.
        </p>
      </div>

      {displayedError && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{displayedError}</span>
        </div>
      )}

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] disabled:opacity-60"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        <span className="bg-white/80 dark:bg-zinc-900/80 px-3 text-[11px] text-zinc-400 uppercase tracking-wider absolute backdrop-blur-sm">
          or with email
        </span>
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="email"
          type="email"
          label="Email Address"
          required
          placeholder="you@domain.com"
        />

        <div>
          <Input
            name="password"
            type="password"
            label="Password"
            required
            placeholder="••••••••"
          />
          <div className="flex justify-end mt-1.5">
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-sky-500 hover:text-sky-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          <span>Sign In</span>
        </Button>
      </form>

      <div className="text-center pt-2">
        <p className="text-xs text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-sky-500 font-semibold hover:underline"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <Suspense
        fallback={
          <div className="p-12 text-center text-zinc-400 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
