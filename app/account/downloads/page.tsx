import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DownloadEntitlementCard } from '@/components/shop/download-entitlement-card';
import { Download, ArrowRight } from 'lucide-react';

export const revalidate = 0;

export default async function AccountDownloadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();

  // 1. Fetch all customer entitlements
  const { data: entitlements } = await adminClient
    .from('customer_entitlements')
    .select('*, products(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const entitlementList = entitlements || [];
  const productIds = entitlementList.map((e) => e.product_id).filter(Boolean);

  // 2. Fetch all constituent product deliverable files
  const { data: productFiles } = await adminClient
    .from('product_files')
    .select('*')
    .in('product_id', productIds)
    .order('created_at', { ascending: true });

  const filesByProduct = (productFiles || []).reduce((acc: any, file: any) => {
    if (!acc[file.product_id]) acc[file.product_id] = [];
    acc[file.product_id].push(file);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Download className="w-6 h-6 text-sky-400" />
          <span>My Digital Downloads</span>
        </h1>
        <p className="text-xs text-zinc-300">
          Your active purchases, course modules, blueprints, and gifted frameworks. Click download to generate secure 5-minute signed links.
        </p>
      </div>

      {/* Downloads List */}
      <div className="space-y-4">
        {entitlementList.length > 0 ? (
          entitlementList.map((ent) => (
            <DownloadEntitlementCard
              key={ent.id}
              entitlement={ent}
              files={filesByProduct[ent.product_id] || []}
            />
          ))
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#161822]/90 border border-dashed border-zinc-800 space-y-3">
            <Download className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-white">
              No digital downloads available
            </p>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Once you complete a purchase or receive a gift, your digital products and secure download buttons will appear here automatically.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline pt-2"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
