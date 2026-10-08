import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <div className="space-y-2">
        <span className="text-6xl font-extrabold text-zinc-900 dark:text-white">404</span>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Page Not Found</h1>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
          The page or digital resource you are looking for might have been removed, renamed, or is temporarily unavailable.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="primary" asChild>
          <Link href="/" className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </Button>
        <Button variant="glass" asChild>
          <Link href="/shop" className="flex items-center gap-1.5">
            <Search className="w-4 h-4" />
            <span>Search Shop</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
