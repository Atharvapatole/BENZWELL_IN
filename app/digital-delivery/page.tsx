import React from 'react';
import { DownloadCloud, ShieldCheck, Zap } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digital Delivery Policy | BENZWELL',
  description: 'How BenzWell delivers instant access to digital products, signed downloads, and perpetual account storage.',
};

export default function DigitalDeliveryPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Delivery</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          Digital Delivery Policy
        </h1>
        <p className="text-xs text-zinc-400">Effective Date: January 2026 • benzwell.in</p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
        <p>
          At <strong>BENZWELL</strong>, all products sold across our platform are digital goods. We do not ship physical packages or physical media (such as CDs, DVDs, or printed books).
        </p>

        <h3>1. Instant Digital Access</h3>
        <p>
          Upon successful verification of your payment through Razorpay, your purchased files are made available instantly in two distinct ways:
        </p>
        <ol>
          <li><strong>Customer Account Dashboard:</strong> Navigate to <code>/account/downloads</code> to access your files and trigger authenticated downloads.</li>
          <li><strong>Email Confirmation:</strong> An order confirmation email containing your receipt and a direct shortcut to your download center is dispatched immediately via Resend.</li>
        </ol>

        <h3>2. Download Expiry & Limits</h3>
        <p>
          To prevent unauthorized bandwidth abuse and protect digital rights:
        </p>
        <ul>
          <li>Signed download URLs generated from our storage servers are temporary and expire after 60 seconds.</li>
          <li>Each purchase grants up to 10 download attempts, which can be reset upon request to support if you exhaust them during legitimate use.</li>
        </ul>

        <h3>3. Delivery Costs</h3>
        <p>
          Digital product delivery is 100% free with no shipping, handling, or hidden processing charges.
        </p>

        <h3>4. Need Assistance?</h3>
        <p>
          If you do not see your purchase within 5 minutes of payment completion, please email <a href="mailto:info@benzwell.in">info@benzwell.in</a> with your payment transaction ID.
        </p>
      </div>
    </div>
  );
}
