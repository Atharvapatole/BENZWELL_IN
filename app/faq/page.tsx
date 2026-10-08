import React from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | BENZWELL',
  description: 'Everything you need to know about purchasing, accessing, and downloading digital products on BenzWell.',
};

export default function FAQPage() {
  const faqs = [
    {
      category: 'Purchases & Downloads',
      items: [
        {
          q: 'How do I access my purchased digital products?',
          a: 'Immediately after completing payment via Razorpay, your items are automatically unlocked under "My Account > Downloads". You will also receive an instant confirmation email with download links.',
        },
        {
          q: 'Can I download my purchases on multiple devices?',
          a: 'Yes! As long as you log into your BenzWell account, you can download your purchased files on your laptop, desktop, tablet, or mobile phone.',
        },
        {
          q: 'What file formats are provided?',
          a: 'Depending on the product, files are delivered in PDF, Notion templates, ZIP bundles, Figma files, Excel/CSV models, or MP4 video modules.',
        },
      ],
    },
    {
      category: 'Payments & Security',
      items: [
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major payment methods in India via Razorpay, including UPI (Google Pay, PhonePe, Paytm), Credit and Debit Cards (Visa, MasterCard, RuPay), Net Banking from all major banks, and Wallets.',
        },
        {
          q: 'Is guest checkout supported?',
          a: 'No. To ensure lifetime download rights, file security, and verifiable order tracking, all customers must sign in or register before completing checkout.',
        },
      ],
    },
    {
      category: 'Licensing & Updates',
      items: [
        {
          q: 'Can I use templates for commercial client work?',
          a: 'Yes, all standard product licenses permit you to use the resources for your personal and commercial client deliverables. Reselling or distributing the raw source files themselves is strictly prohibited.',
        },
        {
          q: 'Do I get free updates when products are revised?',
          a: 'Yes! Whenever an author or the BenzWell editorial team releases an update, the new version replaces the old file in your customer dashboard at no additional charge.',
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Knowledge Base</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          Find instant answers to common questions about downloads, payments, and product licensing.
        </p>
      </div>

      <div className="space-y-10">
        {faqs.map((cat, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>{cat.category}</span>
            </h2>

            <div className="space-y-3">
              {cat.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="p-6 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass-sm backdrop-blur-md space-y-2"
                >
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-start gap-2.5">
                    <HelpCircle className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span>{item.q}</span>
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-6 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
