import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | BENZWELL',
  description: 'Understand the refund, exchange, and cancellation terms for digital goods on BenzWell.',
};

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Policy</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          Refund & Cancellation Policy
        </h1>
        <p className="text-xs text-zinc-400">Effective Date: January 2026 • benzwell.in</p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
        <p>
          Because <strong>BENZWELL</strong> provides immediate, irrevocable access to digital products, source files, and educational materials upon purchase, our refund policy is designed to be clear and fair for both creators and customers.
        </p>

        <h3>1. Digital Product Nature</h3>
        <p>
          Unlike physical goods, digital assets cannot be physically returned once downloaded or viewed. Consequently, all digital sales are generally final once the download entitlement is activated.
        </p>

        <h3>2. Eligible Refund Conditions</h3>
        <p>We are happy to issue a full refund within <strong>7 days of purchase</strong> under the following circumstances:</p>
        <ul>
          <li><strong>Corrupt / Unreadable Files:</strong> If the provided digital files are corrupted or technically defective, and our support team is unable to provide a functional replacement within 48 hours.</li>
          <li><strong>Duplicate Billing:</strong> If your card or UPI was accidentally charged multiple times for the same transaction due to a network glitch.</li>
          <li><strong>Misrepresented Content:</strong> If the delivered asset differs substantially from the item description on the product page.</li>
        </ul>

        <h3>3. Requesting a Refund</h3>
        <p>
          To request a refund, email our support team at <a href="mailto:info@benzwell.in">info@benzwell.in</a> with your Order ID (e.g. <code>#BW-2601-1234</code>) and a brief description of the technical issue.
        </p>
      </div>
    </div>
  );
}
