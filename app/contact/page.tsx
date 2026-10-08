import React from 'react';
import { Mail, MessageSquare, Clock, ArrowUpRight, Bot, Zap, ArrowRight } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Support | BENZWELL',
  description: 'Get in touch with the BenzWell support team for order inquiries, downloads, or custom licensing.',
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
          Support & Inquiries
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          We&apos;re Here to Help
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          Have a question about a digital product, licensing, or your order? Submit a ticket or chat with our 24/7 Support AI.
        </p>
      </div>

      {/* Support AI Instant Resolution Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-950/60 via-[#11131a] to-indigo-950/60 border border-sky-800/80 shadow-glass backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 border border-sky-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h3 className="font-bold text-base text-white">Need Instant Order or Download Help?</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Instant
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              Chat with our Support AI for real-time verification and 5-minute temporary download access.
            </p>
          </div>
        </div>

        <Link
          href="/support-ai"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg flex-shrink-0"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Launch Support AI</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Official Support Email</h3>
          <p className="text-xs text-zinc-500">For direct correspondence and ticket responses.</p>
          <a
            href="mailto:info@benzwell.in"
            className="text-xs font-semibold text-sky-500 hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>info@benzwell.in</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Response Time</h3>
          <p className="text-xs text-zinc-500">We respond to all tickets within 24 hours on business days.</p>
          <span className="text-xs font-medium text-emerald-600">Mon – Sat: 9am – 7pm IST</span>
        </div>

        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Official Domain</h3>
          <p className="text-xs text-zinc-500">BenzWell is verified and hosted exclusively at benzwell.in.</p>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">benzwell.in</span>
        </div>
      </div>

      {/* Direct Contact Form */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Submit a Support Ticket</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Fill out the form below to create a support ticket. A member of our team will review and respond promptly.
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
