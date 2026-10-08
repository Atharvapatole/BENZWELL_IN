import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/layout/store-provider';
import { AnalyticsTracker } from '@/components/marketing/analytics';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in'),
  title: {
    default: 'BENZWELL — Premium Digital Products, Guides & Templates',
    template: '%s | BENZWELL',
  },
  description:
    'Discover practical ebooks, playbooks, frameworks, masterclasses, and digital resources designed to elevate your work, learning, and growth.',
  keywords: [
    'digital products',
    'ebooks',
    'AI prompts',
    'business templates',
    'courses',
    'productivity tools',
    'BenzWell',
  ],
  authors: [{ name: 'BENZWELL' }],
  creator: 'BENZWELL',
  publisher: 'BENZWELL',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'BENZWELL — Premium Digital Products, Guides & Templates',
    description:
      'Discover practical ebooks, playbooks, frameworks, masterclasses, and digital resources.',
    url: 'https://benzwell.in',
    siteName: 'BENZWELL',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BENZWELL — Premium Digital Products',
    description:
      'Digital products built for better work, learning & growth.',
    creator: '@benzwell_in',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { createAdminClient } from '@/lib/supabase/admin';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let marketingSettings = null;
  try {
    const supabase = createAdminClient();
    const { data: row } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'marketing')
      .maybeSingle();
    marketingSettings = row?.value || null;
  } catch (err) {
    // Graceful fallback
  }

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased selection:bg-sky-500/20 selection:text-sky-600 dark:selection:text-sky-400">
        <AnalyticsTracker />
        <StoreProvider marketingSettings={marketingSettings}>{children}</StoreProvider>
      </body>
    </html>
  );
}
