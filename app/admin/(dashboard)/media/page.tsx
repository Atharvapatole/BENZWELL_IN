import React from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { MediaLibrary } from '@/components/admin/media-library';
import { getPaidFilesAction } from '@/actions/paid-files';
import { MediaItem } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMediaPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  // 1. Fetch public media (ImageKit / public store assets)
  const { data: media } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });

  const publicMediaList: MediaItem[] = media || [];

  // 2. Fetch paid deliverable files (Supabase Private Storage)
  const paidFilesResult = await getPaidFilesAction();

  // 3. Fetch products for assignment dropdowns
  const { data: products } = await supabase
    .from('products')
    .select('id, title, slug')
    .order('title', { ascending: true });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Media & Deliverables Library
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Manage Public Store Media (ImageKit) and Private Customer Paid Files (Supabase Private Storage).
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass">
        <MediaLibrary
          initialPublicMedia={publicMediaList}
          initialPaidFiles={paidFilesResult.files || []}
          paidBucketName={paidFilesResult.bucketName || 'products-private'}
          products={products || []}
        />
      </div>
    </div>
  );
}
