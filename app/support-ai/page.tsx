import React from 'react';
import { Metadata } from 'next';
import { SupportAiChatInterface } from '@/components/support-ai/chat-interface';
import { ShieldCheck, Zap, Headphones, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support AI & Instant Help | BENZWELL',
  description:
    'Chat with BenzWell Support AI for instant order verification, product download recovery, payment troubleshooting, and 24/7 assistance.',
};

export default function SupportAiPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          <span>24/7 Automated Assistant</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
          BenzWell Customer Support AI
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Instant assistance for order lookup, download link access, payment confirmations, and automated troubleshooting connected directly to our systems.
        </p>
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Secure Verification</h4>
            <p className="text-[11px] text-zinc-500">Live order & entitlement check</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">5-Min Download Links</h4>
            <p className="text-[11px] text-zinc-500">Instant file access generation</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Human Escalation</h4>
            <p className="text-[11px] text-zinc-500">Direct escalation to staff</p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <SupportAiChatInterface />

      {/* Footer Alternative Link */}
      <div className="text-center pt-4">
        <p className="text-xs text-zinc-500">
          Prefer traditional email support?{' '}
          <Link href="/contact" className="text-sky-400 font-semibold hover:underline">
            Submit a support inquiry through our Contact Form
          </Link>{' '}
          or email us at{' '}
          <a href="mailto:info@benzwell.in" className="text-white font-semibold hover:underline">
            info@benzwell.in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
