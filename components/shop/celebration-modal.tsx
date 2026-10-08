'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCustomerNotificationsAction, markNotificationReadAction } from '@/actions/customers';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, ArrowRight, X, Check } from 'lucide-react';

export function CelebrationModal() {
  const router = useRouter();
  const [unreadGift, setUnreadGift] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkGifts();
  }, []);

  const checkGifts = async () => {
    try {
      const res = await getCustomerNotificationsAction();
      if (res.success && res.notifications?.length > 0) {
        // Find first unread gift notification
        const giftNotif = res.notifications.find((n: any) => n.type === 'gift' && !n.is_read);
        if (giftNotif) {
          setUnreadGift(giftNotif);
          setIsOpen(true);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDismiss = async () => {
    if (unreadGift) {
      await markNotificationReadAction(unreadGift.id);
    }
    setIsOpen(false);
  };

  const handleViewGift = async () => {
    if (unreadGift) {
      await markNotificationReadAction(unreadGift.id);
    }
    setIsOpen(false);
    router.push('/account/downloads');
  };

  if (!isOpen || !unreadGift) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1c1f2e] to-[#12141d] border border-sky-500/40 p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gift Animation Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/30 flex items-center justify-center animate-bounce">
          <div className="w-full h-full bg-[#161822] rounded-[22px] flex items-center justify-center text-3xl">
            🎁
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Special Gift Received!</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            🎉 Congratulations!
          </h2>
          <p className="text-xs text-zinc-300">
            You&apos;ve received a complimentary digital product on BenzWell.
          </p>
        </div>

        {/* Product Box */}
        <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-700/80 text-left space-y-2">
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Product Unlocked</span>
          <p className="text-sm font-extrabold text-white">
            {unreadGift.metadata?.productTitle || unreadGift.product?.title || unreadGift.title}
          </p>
          {unreadGift.message && (
            <p className="text-xs text-emerald-400 italic pt-1 border-t border-zinc-800">
              &ldquo;{unreadGift.message}&rdquo;
            </p>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            type="button"
            size="lg"
            onClick={handleViewGift}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <span>View My Gift</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="w-full sm:w-auto text-xs text-zinc-400 hover:text-white"
          >
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}
