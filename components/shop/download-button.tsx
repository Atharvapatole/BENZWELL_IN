'use client';

import React, { useState } from 'react';
import { getSecureDownloadUrl, getSecureDownloadUrlByToken } from '@/actions/downloads';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle } from 'lucide-react';

interface DownloadButtonProps {
  entitlementId?: string;
  fileId?: string;
  token?: string;
  productTitle?: string;
  downloadsUsed?: number;
  downloadLimit?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'default';
  className?: string;
}

export function DownloadButton({
  entitlementId,
  fileId,
  token,
  productTitle,
  downloadsUsed = 0,
  downloadLimit = 9999,
  label = 'Download Asset',
  size = 'sm',
  className = '',
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLimitReached = downloadsUsed >= downloadLimit;

  const handleDownload = async () => {
    if (isLimitReached) {
      setError(`Download limit of ${downloadLimit} reached.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    let result;
    if (token) {
      result = await getSecureDownloadUrlByToken({ token, fileId, entitlementId });
    } else if (entitlementId) {
      result = await getSecureDownloadUrl(entitlementId, fileId);
    } else {
      result = { success: false, error: 'Invalid download parameters' };
    }

    setIsLoading(false);
    if (result.success && result.downloadUrl) {
      // Trigger browser download via temporary anchor
      const a = document.createElement('a');
      a.href = result.downloadUrl;
      a.download = result.filename || `${productTitle || 'download'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      setError(result.error || 'Failed to generate download link');
    }
  };

  return (
    <div className="space-y-1.5 inline-block">
      <Button
        size={size as any}
        onClick={handleDownload}
        isLoading={isLoading}
        disabled={isLimitReached}
        className={`bg-white text-zinc-950 hover:bg-zinc-200 font-bold ${className}`}
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        <span>{isLimitReached ? 'Limit Reached' : label}</span>
      </Button>

      {error && (
        <p className="text-[11px] text-red-400 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
