import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, Download, Target, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | BENZWELL',
  description: 'Learn about the BenzWell mission to build high-performance digital products, frameworks, and playbooks.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 text-sky-500 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The BenzWell Philosophy</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
          Built for Better Work, Learning & Growth.
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          BenzWell was founded on a simple principle: high-value digital resources should be actionable, beautifully engineered, and designed to generate immediate real-world results.
        </p>
      </div>

      {/* Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-zinc-950 dark:text-white">Zero Theory Fluff</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Every ebook, framework, and template is distilled down to what actually moves the needle in practice.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-zinc-950 dark:text-white">Battle-Tested Quality</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Engineered by industry practitioners, thoroughly validated, and maintained with continuous updates.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-zinc-950 dark:text-white">Instant Fulfillment</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Direct file access, signed private storage, and perpetual customer dashboard downloads.
          </p>
        </div>
      </div>

      {/* Story Section */}
      <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950 text-white space-y-6 shadow-2xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Our Standards</h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          In an era filled with generic AI-generated noise and superficial guides, BenzWell stands for craftsmanship. We spend weeks researching, prototyping, and refining each digital resource before releasing it to our community.
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Whether you are an independent founder seeking financial models, a software engineer learning generative workflows, or a creator looking for production templates, BenzWell gives you the blueprints to accelerate your timeline.
        </p>

        <div className="pt-4">
          <Button size="lg" className="bg-white text-zinc-950 hover:bg-zinc-100 font-bold" asChild>
            <Link href="/shop" className="flex items-center gap-2">
              <span>Browse the Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
