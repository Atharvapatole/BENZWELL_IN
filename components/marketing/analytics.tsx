'use client';

import React from 'react';
import Script from 'next/script';

export interface AnalyticsConfig {
  ga4_id?: string;
  gtm_id?: string;
  meta_pixel_id?: string;
}

export function AnalyticsTracker({ config }: { config?: AnalyticsConfig }) {
  const gaId = config?.ga4_id || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID;
  const gtmId = config?.gtm_id || process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || process.env.NEXT_PUBLIC_GTM_ID;
  const metaPixelId = config?.meta_pixel_id || process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {/* 1. Google Analytics 4 */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                page_path: window.location.pathname,
                send_page_view: true,
              });
            `}
          </Script>
        </>
      )}

      {/* 2. Google Tag Manager */}
      {gtmId && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      )}

      {/* 3. Meta Pixel (Facebook & Instagram Ads) */}
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}

/**
 * Standard Ecommerce & Marketing Event Dispatcher
 */
export const analytics = {
  // Page View
  pageView: (url: string) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) (window as any).gtag('event', 'page_view', { page_path: url });
    if ((window as any).fbq) (window as any).fbq('track', 'PageView');
  },

  // View Item / Product
  viewItem: (product: { id: string; title: string; price: number; category?: string }) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) {
      (window as any).gtag('event', 'view_item', {
        currency: 'INR',
        value: product.price,
        items: [{ item_id: product.id, item_name: product.title, price: product.price, item_category: product.category }],
      });
    }
    if ((window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: product.title,
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: 'INR',
      });
    }
  },

  // Add to Cart
  addToCart: (item: { id: string; title: string; price: number; quantity?: number }) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) {
      (window as any).gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: item.price * (item.quantity || 1),
        items: [{ item_id: item.id, item_name: item.title, price: item.price, quantity: item.quantity || 1 }],
      });
    }
    if ((window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_name: item.title,
        content_ids: [item.id],
        content_type: 'product',
        value: item.price * (item.quantity || 1),
        currency: 'INR',
      });
    }
  },

  // Begin Checkout
  beginCheckout: (cart: { total: number; items: { id: string; title: string; price: number }[] }) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) {
      (window as any).gtag('event', 'begin_checkout', {
        currency: 'INR',
        value: cart.total,
        items: cart.items.map((i) => ({ item_id: i.id, item_name: i.title, price: i.price })),
      });
    }
    if ((window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {
        content_ids: cart.items.map((i) => i.id),
        num_items: cart.items.length,
        value: cart.total,
        currency: 'INR',
      });
    }
  },

  // Verified Purchase (Only on order success after payment confirmation)
  purchase: (order: { orderId: string; total: number; items: { id?: string; name: string; price: number }[] }) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) {
      (window as any).gtag('event', 'purchase', {
        transaction_id: order.orderId,
        value: order.total,
        currency: 'INR',
        items: order.items.map((i) => ({ item_id: i.id || order.orderId, item_name: i.name, price: i.price })),
      });
    }
    if ((window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        content_type: 'product',
        content_ids: order.items.map((i) => i.id || order.orderId),
        value: order.total,
        currency: 'INR',
        order_id: order.orderId,
      });
    }
  },

  // Lead Submission
  lead: (formName: string) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) (window as any).gtag('event', 'generate_lead', { form_name: formName });
    if ((window as any).fbq) (window as any).fbq('track', 'Lead', { content_name: formName });
  },

  // User Registration
  signUp: (method: string) => {
    if (typeof window === 'undefined') return;
    if ((window as any).gtag) (window as any).gtag('event', 'sign_up', { method });
    if ((window as any).fbq) (window as any).fbq('track', 'CompleteRegistration', { status: method });
  },
};

/**
 * Universal Event Dispatcher
 */
export function trackEcommerceEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;

  // 1. GA4
  if ((window as any).gtag) {
    (window as any).gtag('event', eventName.toLowerCase(), params);
  }

  // 2. Meta Pixel
  if ((window as any).fbq) {
    (window as any).fbq('track', eventName, params);
  }
}
