'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updatePasswordAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function checkRecoverySession() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // Listen for auth state change from URL hash recovery
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (event === 'PASSWORD_RECOVERY' || newSession) {
              setHasValidSession(true);
            }
          });
          return () => {
            subscription.unsubscribe();
          };
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setIsVerifying(false);
      }
    }

    checkRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to update password.');
        setIsLoading(false);
        return;
      }

      // Also trigger server confirmation email
      await updatePasswordAction(password).catch(() => {});

      setIsLoading(false);
      setIsSuccess(true);

      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2500);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    }
  };

  if (isVerifying) {
    return (
      <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="text-xs text-zinc-500">Verifying secure recovery link...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-8 text-center space-y-4 shadow-glass backdrop-blur-xl">
        <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">Password Updated!</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-sm mx-auto">
          Your password has been changed securely. Redirecting you to the Sign In page...
        </p>
        <Button asChild size="md" className="mt-4">
          <Link href="/login">Sign In Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white mb-2">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
          Set New Password
        </h1>
        <p className="text-xs text-zinc-500">
          Enter your new password below to secure your BenzWell account.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="password"
          type="password"
          label="New Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <Input
          name="confirmPassword"
          type="password"
          label="Confirm New Password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          <span>Save New Password</span>
        </Button>
      </form>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          Cancel and return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <Suspense
        fallback={
          <div className="p-12 text-center text-zinc-400 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
