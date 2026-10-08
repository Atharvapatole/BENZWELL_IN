import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Download, Zap, Lock, Mail, ArrowUpRight } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-zinc-950 text-zinc-400 border-t border-zinc-800/80 mt-24">
      {/* Trust Elements Strip */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Instant Digital Access</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Direct file access and download links delivered to your account instantly upon purchase.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Secure Razorpay Checkout</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Bank-grade 256-bit encrypted transactions via UPI, Credit/Debit cards, and Net Banking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Verified Resources</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Expertly crafted blueprints, templates, and courses battle-tested by top professionals.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Lifetime Downloads</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Re-download your purchased assets anytime from your BenzWell customer dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-extrabold text-2xl tracking-tight text-white">
                BENZ<span className="text-sky-400">WELL</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              Premium digital products, playbooks, ebooks, and frameworks engineered for high-performance creators, founders, and learners.
            </p>
            <div className="pt-2 text-xs text-zinc-500">
              Official Platform: <span className="text-zinc-300">benzwell.in</span>
            </div>
          </div>

          {/* Catalog Links */}
          <div>
            <h5 className="text-xs font-semibold tracking-wider text-white uppercase mb-4">Catalog</h5>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">All Products</Link>
              </li>
              <li>
                <Link href="/shop?category=ai-prompts" className="hover:text-white transition-colors">AI & Prompts</Link>
              </li>
              <li>
                <Link href="/shop?category=business-finance" className="hover:text-white transition-colors">Business & Finance</Link>
              </li>
              <li>
                <Link href="/shop?category=productivity-systems" className="hover:text-white transition-colors">Productivity Systems</Link>
              </li>
              <li>
                <Link href="/shop?category=ebooks-guides" className="hover:text-white transition-colors">Ebooks & Guides</Link>
              </li>
              <li>
                <Link href="/shop?category=courses-masterclasses" className="hover:text-white transition-colors">Courses</Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h5 className="text-xs font-semibold tracking-wider text-white uppercase mb-4">Company</h5>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">About BenzWell</Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">Editorial & Insights</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">Frequently Asked</Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-white transition-colors">Customer Portal</Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h5 className="text-xs font-semibold tracking-wider text-white uppercase mb-4">Legal & Support</h5>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
              </li>
              <li>
                <Link href="/digital-delivery" className="hover:text-white transition-colors">Digital Delivery Terms</Link>
              </li>
              <li>
                <a href="mailto:info@benzwell.in" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>info@benzwell.in</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800/80 mt-14 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {currentYear} BENZWELL. All rights reserved. Built with precision for digital commerce.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link href="/refund-policy" className="hover:text-zinc-300">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
