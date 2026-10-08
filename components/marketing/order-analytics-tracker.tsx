'use client';

import { useEffect } from 'react';
import { analytics } from '@/components/marketing/analytics';

interface OrderAnalyticsTrackerProps {
  order: {
    orderId: string;
    total: number;
    items: { id?: string; name: string; price: number }[];
  };
}

export function OrderAnalyticsTracker({ order }: OrderAnalyticsTrackerProps) {
  useEffect(() => {
    // Fire purchase conversion only once per order
    const storageKey = `benzwell_tracked_${order.orderId}`;
    if (!sessionStorage.getItem(storageKey)) {
      analytics.purchase({
        orderId: order.orderId,
        total: order.total,
        items: order.items,
      });
      sessionStorage.setItem(storageKey, 'true');
    }
  }, [order]);

  return null;
}
