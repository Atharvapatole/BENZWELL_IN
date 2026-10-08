'use client';

import React, { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { DownloadButton } from '@/components/shop/download-button';
import { ReviewModal } from '@/components/shop/review-modal';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Video,
  FileArchive,
  Music,
  Star,
  Gift,
} from 'lucide-react';

interface DownloadEntitlementCardProps {
  entitlement: any;
  files: any[];
}

export function DownloadEntitlementCard({
  entitlement,
  files,
}: DownloadEntitlementCardProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    if (mimeType?.includes('pdf') || ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (mimeType?.includes('video') || ext === 'mp4' || ext === 'mov') return <Video className="w-4 h-4 text-sky-400" />;
    if (mimeType?.includes('audio') || ext === 'mp3' || ext === 'wav') return <Music className="w-4 h-4 text-amber-400" />;
    if (mimeType?.includes('zip') || mimeType?.includes('tar') || ext === 'zip' || ext === 'rar')
      return <FileArchive className="w-4 h-4 text-purple-400" />;
    return <FileText className="w-4 h-4 text-emerald-400" />;
  };

  const productTitle = entitlement.products?.title || 'Purchased Resource';

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
      {/* Product Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-sky-400 capitalize">
              {entitlement.products?.product_type || 'Digital Deliverable'}
            </span>
            {entitlement.is_gift && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Gift className="w-3 h-3" />
                <span>Gift 🎁</span>
              </span>
            )}
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">Unlocked {formatDate(entitlement.created_at)}</span>
          </div>

          <h3 className="text-lg font-bold text-white">{productTitle}</h3>
          {entitlement.gift_message && (
            <p className="text-xs text-emerald-400 italic">&ldquo;{entitlement.gift_message}&rdquo;</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsReviewOpen(true)}
            className="text-xs border-zinc-700 text-zinc-300 hover:text-amber-400 hover:border-amber-400/50"
          >
            <Star className="w-3.5 h-3.5 mr-1 text-amber-400" />
            <span>Leave Review</span>
          </Button>

          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">
            Downloads: <strong className="text-white">{entitlement.downloads_used || 0}</strong> /{' '}
            {entitlement.download_limit || 10}
          </span>
        </div>
      </div>

      {/* Deliverables Multi-File Grid */}
      {files.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Available Deliverables ({files.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file: any) => (
              <div
                key={file.id}
                className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-700/80 flex items-center justify-between gap-3 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-zinc-800/80 flex-shrink-0">
                    {getFileIcon(file.mime_type, file.original_filename)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate" title={file.original_filename}>
                      {file.original_filename}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {file.file_size ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                      Version {file.file_version || '1.0'}
                    </p>
                  </div>
                </div>

                <DownloadButton
                  entitlementId={entitlement.id}
                  fileId={file.id}
                  productTitle={file.original_filename}
                  downloadsUsed={entitlement.downloads_used}
                  downloadLimit={entitlement.download_limit}
                  label="Download"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0e1017] border border-zinc-800">
          <p className="text-xs text-zinc-400">Digital entitlement is active for this product.</p>
          <DownloadButton
            entitlementId={entitlement.id}
            productTitle={productTitle}
            downloadsUsed={entitlement.downloads_used}
            downloadLimit={entitlement.download_limit}
            label="Download Package"
            size="sm"
          />
        </div>
      )}

      {/* Review Modal */}
      {isReviewOpen && (
        <ReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          productId={entitlement.product_id}
          productTitle={productTitle}
        />
      )}
    </div>
  );
}
