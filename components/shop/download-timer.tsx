'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export function DownloadTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 5,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft({ minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.isExpired) {
    return (
      <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>Temporary 5-minute link has expired.</span>
        </div>
        <span className="font-bold text-[11px] text-red-300">Expired</span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-sky-400 animate-pulse flex-shrink-0" />
        <span>Temporary Unique Download Link Valid For:</span>
      </div>
      <div className="flex items-center gap-1 font-mono font-bold text-sm text-sky-300 bg-sky-900/50 px-3 py-1 rounded-xl border border-sky-500/30">
        <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
