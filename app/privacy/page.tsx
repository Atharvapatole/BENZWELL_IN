import React from 'react';
import { Shield } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | BENZWELL',
  description: 'Learn how BenzWell protects and handles your personal information, order details, and data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Legal</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-zinc-400">Last updated: January 2026 • Official Platform: benzwell.in</p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
        <p>
          At <strong>BENZWELL</strong> (accessible via <code>benzwell.in</code>), we prioritize the privacy and security of our customers. This Privacy Policy document outlines the types of information that is collected and recorded by BenzWell and how we use it.
        </p>

        <h3>1. Information We Collect</h3>
        <p>
          When you register for an account, verify via OTP, or purchase a digital product, we collect:
        </p>
        <ul>
          <li>Name and email address for account identification and digital fulfillment.</li>
          <li>Phone number for order verification and transaction notices.</li>
          <li>Transaction identifiers and payment metadata provided by Razorpay.</li>
          <li>Technical access logs including IP address and browser user-agent when downloading files.</li>
        </ul>

        <h3>2. How We Use Your Information</h3>
        <p>We use your information strictly to:</p>
        <ul>
          <li>Provide, operate, and maintain the BenzWell digital store.</li>
          <li>Verify entitlement and generate secure signed download links for purchased files.</li>
          <li>Send transactional emails including verification OTPs, welcome guides, and order invoices.</li>
          <li>Prevent fraudulent transactions and unauthorized distribution of intellectual property.</li>
        </ul>

        <h3>3. Payment Information Security</h3>
        <p>
          We do not store your complete credit/debit card numbers, CVVs, or UPI PINs on our servers. All payment transactions are securely processed directly through Razorpay, a PCI-DSS Level 1 compliant payment processor.
        </p>

        <h3>4. Contact Us</h3>
        <p>
          If you have questions regarding your data or wish to request data erasure, please contact us at <a href="mailto:info@benzwell.in">info@benzwell.in</a>.
        </p>
      </div>
    </div>
  );
}
