'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowRight, X } from 'lucide-react';

export interface AnnouncementSettings {
  announcement_enabled?: boolean;
  announcement_text?: string;
  announcement_badge?: string;
  announcement_link?: string;
  announcement_cta?: string;
  target_pages?: string; // 'all' | '/' | '/shop' | '/blog' | '/product' | custom
  start_date?: string;
  end_date?: string;
}

interface AnnouncementBannerProps {
  initialSettings?: AnnouncementSettings;
}

export function AnnouncementBanner({ initialSettings }: AnnouncementBannerProps) {
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(false);
  const [settings, setSettings] = useState<AnnouncementSettings | null>(initialSettings || null);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('benzwell_announcement_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // If running in admin, do not display
  if (pathname?.startsWith('/admin')) return null;
  if (isDismissed) return null;

  // If no settings provided, fall back or hide
  if (!settings || !settings.announcement_enabled) return null;

  // 1. Check Date Range
  const now = new Date();
  if (settings.start_date) {
    const start = new Date(settings.start_date);
    if (now < start) return null;
  }
  if (settings.end_date) {
    const end = new Date(settings.end_date);
    if (now > end) return null;
  }

  // 2. Check Target Pages
  const target = (settings.target_pages || 'all').trim().toLowerCase();
  let shouldDisplay = false;

  if (target === 'all' || target === '*' || target === '') {
    shouldDisplay = true;
  } else if (target === 'home' || target === 'homepage' || target === '/') {
    shouldDisplay = pathname === '/';
  } else if (target === 'shop' || target === '/shop') {
    shouldDisplay = pathname === '/shop' || pathname.startsWith('/shop/');
  } else if (target === 'blog' || target === '/blog') {
    shouldDisplay = pathname === '/blog' || pathname.startsWith('/blog/');
  } else if (target === 'product' || target === 'products' || target === '/product') {
    shouldDisplay = pathname.startsWith('/product/');
  } else {
    // Exact or prefix match on custom path
    shouldDisplay = pathname === target || pathname.startsWith(target.endsWith('/') ? target : `${target}/`);
  }

  if (!shouldDisplay) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('benzwell_announcement_dismissed', 'true');
  };

  return (
    <div className="relative w-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white text-xs font-semibold py-2 px-4 shadow-md z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-3 text-center pr-6">
        {settings.announcement_badge && (
          <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-extrabold uppercase tracking-wider">
            {settings.announcement_badge}
          </span>
        )}

        <span className="truncate max-w-xl">
          {settings.announcement_text || 'Welcome to BenzWell. Explore our high-value digital catalog.'}
        </span>

        {settings.announcement_link && (
          <Link
            href={settings.announcement_link}
            className="inline-flex items-center gap-1 font-bold underline hover:text-sky-100 transition-colors flex-shrink-0"
          >
            <span>{settings.announcement_cta || 'Learn More'}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white transition-colors"
        title="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
