'use client';

import React, { useState } from 'react';
import { CartProvider } from '@/hooks/use-cart';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/layout/cart-drawer';
import { SearchModal } from '@/components/layout/search-modal';
import { AnnouncementBanner, AnnouncementSettings } from '@/components/layout/announcement-banner';
import { usePathname } from 'next/navigation';

interface StoreProviderProps {
  children: React.ReactNode;
  marketingSettings?: AnnouncementSettings | null;
}

export function StoreProvider({ children, marketingSettings }: StoreProviderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();

  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-ambient-glow">
        {!isAdminRoute && <AnnouncementBanner initialSettings={marketingSettings || undefined} />}
        {!isAdminRoute && <Header onOpenSearch={() => setIsSearchOpen(true)} />}
        <main className="flex-1 w-full">{children}</main>
        {!isAdminRoute && <Footer />}
        <CartDrawer />
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </CartProvider>
  );
}
