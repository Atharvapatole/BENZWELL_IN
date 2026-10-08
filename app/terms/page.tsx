import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | BENZWELL',
  description: 'Terms and conditions governing the purchase and licensing of digital products on BenzWell.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Legal</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          Terms of Service
        </h1>
        <p className="text-xs text-zinc-400">Effective Date: January 2026 • Platform: benzwell.in</p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
        <p>
          Welcome to <strong>BENZWELL</strong>. By browsing, registering, or purchasing digital goods on <code>benzwell.in</code>, you agree to comply with and be bound by the following terms and conditions.
        </p>

        <h3>1. Digital License Grant</h3>
        <p>
          Upon verified payment, BenzWell grants you a non-exclusive, non-transferable, revocable license to access, download, and utilize the purchased digital product for your personal and commercial business deliverables.
        </p>

        <h3>2. Restrictions</h3>
        <p>You may not:</p>
        <ul>
          <li>Sub-license, resell, rent, lease, or redistribute the source files, prompts, or raw code to third parties.</li>
          <li>Make purchased files publicly accessible via open download folders, file-sharing services, or torrents.</li>
          <li>Bypass or attempt to exploit access tokens, download limits, or signed URL expiration policies.</li>
        </ul>

        <h3>3. Account Security</h3>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and one-time passwords (OTP). Any activity conducted through your account remains your legal responsibility.
        </p>

        <h3>4. Modifications to Products & Pricing</h3>
        <p>
          Prices for digital products are subject to change without prior notice. BenzWell reserves the right to modify or discontinue resources at any time.
        </p>

        <h3>5. Governing Law</h3>
        <p>
          These Terms shall be governed and construed in accordance with the laws of India.
        </p>
      </div>
    </div>
  );
}
