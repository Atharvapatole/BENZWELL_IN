'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThankYouRedirectProps {
  token?: string;
  productSlug: string;
  delaySeconds?: number;
}

export function ThankYouRedirect({
  token,
  productSlug,
  delaySeconds = 3,
}: ThankYouRedirectProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(delaySeconds);

  const targetUrl = token ? `/download/${token}` : '/account/downloads';

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push(targetUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [token, router, targetUrl]);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Visual redirect animation and counter */}
      <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 text-sky-400 animate-spin flex-shrink-0" />
          <span>
            {secondsLeft > 0
              ? `Redirecting to your unique download page in ${secondsLeft}s...`
              : 'Redirecting now...'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-[10px] font-mono font-bold text-sky-300">
          5-Min Valid Link
        </span>
      </div>

      {/* Product Download Page Action Button */}
      <div className="pt-2">
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-sky-500/20 py-6 rounded-2xl transition-all flex items-center justify-center gap-2 group"
          asChild
        >
          <Link href={targetUrl}>
            <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Product Download Page</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>

      {/* Reassurance note */}
      <p className="text-[11px] text-zinc-400 text-center">
        If you are not redirected automatically, click the <strong>Product Download Page</strong> button above.
      </p>
    </div>
  );
}
