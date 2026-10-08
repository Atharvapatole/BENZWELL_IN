'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { registerCustomer, resendConfirmationEmailAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, AlertCircle, MailCheck, Loader2, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/account';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  // Resend state
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerCustomer(null, formData);

    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed');
      return;
    }

    if (result.email) {
      setSubmittedEmail(result.email);
      setResendCooldown(60);
    } else {
      router.push(redirectPath);
    }
  };

  const handleResendConfirmation = async () => {
    if (!submittedEmail || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendSuccess(null);
    setErrorMessage(null);

    try {
      const res = await resendConfirmationEmailAction(submittedEmail);
      if (res.success) {
        setResendSuccess(res.message || 'Confirmation email resent successfully!');
        setResendCooldown(60);
      } else {
        setErrorMessage(res.message || 'Failed to resend confirmation email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    window.location.href = `/api/auth/google?next=${encodeURIComponent(redirectPath)}`;
  };

  // Dedicated Confirmation Screen View
  if (submittedEmail) {
    return (
      <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/20 mb-1">
            <MailCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
            Check your email
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            A confirmation link has been sent to <br />
            <strong className="text-zinc-950 dark:text-white font-bold break-all">{submittedEmail}</strong>
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{resendSuccess}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-200">Next Steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Open the inbox for <strong>{submittedEmail}</strong>.</li>
            <li>Click the verification link inside the email from BenzWell.</li>
            <li>Once confirmed, log in to access your digital downloads and dashboard.</li>
          </ol>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0 || isResending}
            className="w-full text-xs font-bold"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span>
              {resendCooldown > 0
                ? `Resend Email in ${resendCooldown}s`
                : 'Resend Confirmation Email'}
            </span>
          </Button>

          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>

        <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
          Didn&apos;t receive the email? Check your spam or promotions folder, or click the resend button above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-glass backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 text-sky-500 mb-2">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
          Create BenzWell Account
        </h1>
        <p className="text-xs text-zinc-500">
          Sign up to access downloads, order history, and digital resources.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Google Signup */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99]"
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
        <span>Sign up with Google</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        <span className="bg-white/80 dark:bg-zinc-900/80 px-3 text-[11px] text-zinc-400 uppercase tracking-wider absolute backdrop-blur-sm">
          or with email
        </span>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input name="fullName" type="text" label="Full Name" required placeholder="John Doe" />
        <Input name="email" type="email" label="Email Address" required placeholder="you@domain.com" />
        <Input name="phone" type="tel" label="Phone Number (Optional)" placeholder="9876543210" />
        <Input name="password" type="password" label="Password" required placeholder="Min 8 chars, 1 uppercase, 1 number" />
        <Input name="confirmPassword" type="password" label="Confirm Password" required placeholder="••••••••" />

        <div className="pt-2">
          <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
            <span>Create Account</span>
          </Button>
        </div>
      </form>

      <div className="text-center pt-2">
        <p className="text-xs text-zinc-500">
          Already have an account?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-sky-500 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-20">
      <Suspense
        fallback={
          <div className="p-12 text-center text-zinc-400 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
