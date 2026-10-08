import React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-glass backdrop-blur-xl transition-all duration-300 dark:border-zinc-700/80 dark:bg-[#161822]/90',
        className
      )}
      {...props}
    />
  );
}

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-glass backdrop-blur-2xl transition-all duration-300 hover:border-zinc-300 hover:shadow-glass-lg dark:border-zinc-700/70 dark:bg-[#161822]/80 dark:hover:border-zinc-600',
        className
      )}
      {...props}
    />
  );
}

