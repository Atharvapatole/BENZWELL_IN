'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminSignOutAction } from '@/actions/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Tag,
  Star,
  FileText,
  BookOpen,
  Image,
  BarChart3,
  Settings,
  Shield,
  Mail,
  LogOut,
  ExternalLink,
  Headphones,
  Wrench,
  Server,
  RefreshCw,
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();

  const sections = [
    {
      title: 'OVERVIEW',
      links: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/analytics', label: 'Analytics & Revenue', icon: BarChart3 },
      ],
    },
    {
      title: 'STORE MANAGEMENT',
      links: [
        { href: '/admin/products', label: 'Products', icon: Package },
        { href: '/admin/categories', label: 'Categories', icon: Layers },
        { href: '/admin/orders', label: 'Orders & Payments', icon: ShoppingBag },
        { href: '/admin/customers', label: 'Customers', icon: Users },
        { href: '/admin/free-tools', label: 'Free Tools & Leads', icon: Wrench },
        { href: '/admin/coupons', label: 'Coupons & Discounts', icon: Tag },
        { href: '/admin/reviews', label: 'Customer Reviews', icon: Star },
        { href: '/admin/support', label: 'Support Center', icon: Headphones },
        { href: '/admin/contact', label: 'Contact Inquiries', icon: Mail },
      ],
    },
    {
      title: 'CONTENT & BUILDER',
      links: [
        { href: '/admin/pages', label: 'Visual Page Builder', icon: FileText },
        { href: '/admin/blogs', label: 'Blog & Editorial', icon: BookOpen },
        { href: '/admin/media', label: 'Media Library', icon: Image },
      ],
    },
    {
      title: 'CONFIGURATION',
      links: [
        { href: '/admin/settings', label: 'System Settings', icon: Settings },
        { href: '/admin/settings/infrastructure', label: 'Infrastructure & Cloud', icon: Server },
        { href: '/admin/settings/migration', label: 'Migration & Import', icon: RefreshCw },
        { href: '/admin/audit-logs', label: 'Security Audit Logs', icon: Shield },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#11131a] text-zinc-200 border-r border-zinc-700/80 min-h-screen flex flex-col flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-700/80 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-extrabold text-lg text-white tracking-tight">
            BENZ<span className="text-sky-400">ADMIN</span>
          </span>
        </Link>
        <Link
          href="/"
          target="_blank"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="View Live Store"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-2">
              {section.title}
            </h5>
            {section.links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shadow-sm'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-sky-400' : 'text-zinc-400')} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Signout */}
      <div className="p-4 border-t border-zinc-700/80">
        <form action={adminSignOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/50 hover:text-red-300 border border-transparent hover:border-red-900/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Administrator</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

