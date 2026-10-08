import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils';
import { updateReviewStatusAction } from '@/actions/admin';
import { Star, CheckCircle, XCircle, Trash2, UserCheck } from 'lucide-react';
import { Review } from '@/types';

export const revalidate = 0;

export default async function AdminReviewsPage() {
  const supabase = createAdminClient();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, user:profiles(full_name, email), product:products(title)')
    .order('created_at', { ascending: false });

  const reviewList: Review[] = (reviews as any) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Customer Reviews Moderation ({reviewList.length})
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 mt-1">
          Approve or reject customer reviews submitted on products.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        {reviewList.length > 0 ? (
          <div className="divide-y divide-zinc-800/80">
            {reviewList.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {rev.product?.title || 'Product'}
                    </span>
                    <div className="flex items-center text-amber-400 text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                    {rev.is_verified_purchase && (
                      <span className="text-[11px] text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-semibold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>

                  {rev.title && <h5 className="font-bold text-xs text-zinc-100">{rev.title}</h5>}
                  <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">{rev.comment}</p>

                  <p className="text-[11px] text-zinc-400">
                    By <strong className="text-zinc-200">{rev.user?.full_name || rev.user?.email || 'Customer'}</strong> on {formatDate(rev.created_at)}
                  </p>
                </div>

                {/* Moderation Status / Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                      rev.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : rev.status === 'rejected'
                        ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {rev.status}
                  </span>

                  {rev.status !== 'approved' && (
                    <form
                      action={async () => {
                        'use server';
                        await updateReviewStatusAction(rev.id, 'approved');
                      }}
                    >
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-colors"
                        title="Approve Review"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {rev.status !== 'rejected' && (
                    <form
                      action={async () => {
                        'use server';
                        await updateReviewStatusAction(rev.id, 'rejected');
                      }}
                    >
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-red-950/60 text-red-300 border border-red-800 hover:bg-red-900 transition-colors"
                        title="Reject Review"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 py-12 text-center">No reviews submitted yet.</p>
        )}
      </div>
    </div>
  );
}
