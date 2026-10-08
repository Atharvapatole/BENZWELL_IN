'use client';

import React, { useState, useTransition } from 'react';
import {
  PaidFileItem,
  getPaidFilesAction,
  uploadPaidFileDirectAction,
  linkPaidFileToProductAction,
  unlinkPaidFileFromProductAction,
  deletePaidFileDirectAction,
  getPaidFilePresignedAdminUrlAction,
} from '@/actions/paid-files';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import {
  Upload,
  Search,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  FileText,
  Video,
  Music,
  FileArchive,
  FileCode,
  Download,
  Link2,
  Unlink,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  Filter,
} from 'lucide-react';

interface PaidFilesManagerProps {
  initialFiles: PaidFileItem[];
  bucketName: string;
  products: Array<{ id: string; title: string; slug: string }>;
}

export function PaidFilesManager({
  initialFiles,
  bucketName,
  products,
}: PaidFilesManagerProps) {
  const [files, setFiles] = useState<PaidFileItem[]>(initialFiles);
  const [currentBucket, setCurrentBucket] = useState(bucketName);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetProductId, setUploadTargetProductId] = useState<string>('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [customFilenameInput, setCustomFilenameInput] = useState<string>('');

  const [linkModalFile, setLinkModalFile] = useState<PaidFileItem | null>(null);
  const [targetProductId, setTargetProductId] = useState<string>('');

  const [previewFile, setPreviewFile] = useState<PaidFileItem | null>(null);
  const [downloadLoadingKey, setDownloadLoadingKey] = useState<string | null>(null);

  // Refresh / Scan bucket server-side
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setUploadError(null);
    try {
      const res = await getPaidFilesAction(searchQuery);
      if (res.success) {
        setFiles(res.files);
        setCurrentBucket(res.bucketName);
      } else {
        setUploadError(res.error || 'Failed to refresh paid files from Supabase.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error communicating with Supabase Storage.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedUploadFile);
    if (uploadTargetProductId) {
      formData.append('productId', uploadTargetProductId);
    }
    if (customFilenameInput.trim()) {
      formData.append('customFilename', customFilenameInput.trim());
    }

    const res = await uploadPaidFileDirectAction(formData);
    setIsUploading(false);

    if (res.success && res.file) {
      setFiles((prev) => [res.file!, ...prev.filter((f) => f.storage_key !== res.file!.storage_key)]);
      setUploadSuccess(`✓ Successfully uploaded "${res.file.name}" to private bucket!`);
      setSelectedUploadFile(null);
      setCustomFilenameInput('');
      setUploadTargetProductId('');
      setIsUploadModalOpen(false);
    } else {
      setUploadError(res.error || 'Upload failed. Check Supabase Storage configuration.');
    }
  };

  // Link file to product
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkModalFile || !targetProductId) return;

    startTransition(async () => {
      const res = await linkPaidFileToProductAction(
        linkModalFile.storage_key,
        targetProductId,
        linkModalFile.name
      );

      if (res.success) {
        const prod = products.find((p) => p.id === targetProductId);
        setFiles((prev) =>
          prev.map((f) =>
            f.storage_key === linkModalFile.storage_key
              ? {
                  ...f,
                  product_id: targetProductId,
                  product_title: prod?.title || res.productTitle,
                  product_slug: prod?.slug || null,
                  is_unassigned: false,
                }
              : f
          )
        );
        setLinkModalFile(null);
        setTargetProductId('');
      } else {
        alert(res.error || 'Failed to link file to product');
      }
    });
  };

  // Unlink file from product
  const handleUnlink = async (file: PaidFileItem) => {
    if (!confirm(`Unlink "${file.name}" from ${file.product_title || 'product'}? The physical file will remain in Supabase Private Storage.`)) {
      return;
    }

    startTransition(async () => {
      const res = await unlinkPaidFileFromProductAction(file.storage_key, file.product_id || undefined);
      if (res.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.storage_key === file.storage_key
              ? {
                  ...f,
                  product_id: null,
                  product_title: null,
                  product_slug: null,
                  is_unassigned: true,
                }
              : f
          )
        );
      } else {
        alert(res.error || 'Failed to unlink file');
      }
    });
  };

  // Delete file permanently
  const handleDelete = async (file: PaidFileItem) => {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete "${file.name}" from Supabase Private Storage (${currentBucket})? This action cannot be undone.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deletePaidFileDirectAction(file.storage_key, file.id);
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.storage_key !== file.storage_key));
        if (previewFile?.storage_key === file.storage_key) setPreviewFile(null);
      } else {
        alert(res.error || 'Failed to delete file');
      }
    });
  };

  // Admin download / preview (generates short-lived 300s presigned URL)
  const handleAdminDownload = async (file: PaidFileItem) => {
    setDownloadLoadingKey(file.storage_key);
    try {
      const res = await getPaidFilePresignedAdminUrlAction(file.storage_key);
      if (res.success && res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else {
        alert(res.error || 'Failed to generate secure download link.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error generating download link.');
    } finally {
      setDownloadLoadingKey(null);
    }
  };

  // Copy internal storage key
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (mimeType.includes('pdf') || ext === 'pdf')
      return <FileText className="w-5 h-5 text-red-400" />;
    if (mimeType.includes('video') || ext === 'mp4' || ext === 'mov')
      return <Video className="w-5 h-5 text-sky-400" />;
    if (mimeType.includes('audio') || ext === 'mp3' || ext === 'wav')
      return <Music className="w-5 h-5 text-amber-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || ext === 'zip' || ext === 'rar' || ext === '7z')
      return <FileArchive className="w-5 h-5 text-purple-400" />;
    return <FileCode className="w-5 h-5 text-emerald-400" />;
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.storage_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.product_title && f.product_title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'unassigned') return f.is_unassigned;
    if (filterType === 'assigned') return !f.is_unassigned;
    return true;
  });

  const unassignedCount = files.filter((f) => f.is_unassigned).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Storage Objects
            </span>
            <div className="text-xl font-extrabold text-white mt-0.5">{files.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Unassigned Deliverables
            </span>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">{unassignedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Link2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Private Bucket
            </span>
            <div className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
              {currentBucket}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Header: Search, Filter, Refresh, Upload */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by filename, path, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#0e1017] border border-zinc-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({files.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unassigned')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filterType === 'unassigned'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Unassigned ({unassignedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('assigned')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filterType === 'assigned'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Linked ({files.length - unassignedCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-zinc-700 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Scanning Bucket...' : 'Refresh Files'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-md shadow-sky-500/20"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            <span>Upload Paid File</span>
          </Button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Paid Files Table */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Deliverable File</th>
                <th className="p-4">Size & Format</th>
                <th className="p-4">Linked Product</th>
                <th className="p-4">Storage Object Path</th>
                <th className="p-4">Upload Date</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500">
                    <FolderOpen className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                    <p className="font-semibold text-zinc-400">
                      {searchQuery
                        ? 'No paid files matching your search.'
                        : 'No paid files found in Supabase Private Storage.'}
                    </p>
                    <p className="text-xs mt-1">
                      Upload paid PDFs, course videos, or ZIP archives to deliver them securely to customers.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const sizeFormatted = file.file_size
                    ? file.file_size > 1024 * 1024
                      ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(file.file_size / 1024).toFixed(0)} KB`
                    : 'Unknown size';

                  return (
                    <tr key={file.storage_key} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Name & Icon */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-zinc-800/80 flex-shrink-0">
                            {getFileIcon(file.mime_type, file.name)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs truncate max-w-xs sm:max-w-sm" title={file.name}>
                              {file.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              {file.bucket_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Size & Format */}
                      <td className="p-4">
                        <div className="font-semibold text-zinc-300">{sizeFormatted}</div>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[120px]" title={file.mime_type}>
                          {file.mime_type}
                        </div>
                      </td>

                      {/* Linked Product */}
                      <td className="p-4">
                        {file.product_title ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sky-300 truncate max-w-[160px]" title={file.product_title}>
                              {file.product_title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnlink(file)}
                              className="p-1 rounded text-zinc-500 hover:text-amber-400"
                              title="Unlink from product"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setLinkModalFile(file);
                              setTargetProductId(products[0]?.id || '');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Unassigned • Attach</span>
                          </button>
                        )}
                      </td>

                      {/* Object Path */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 bg-[#0c0d12] px-2.5 py-1 rounded-lg border border-zinc-800/80 max-w-[220px]">
                          <span className="truncate" title={file.storage_key}>
                            {file.storage_key}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(file.storage_key)}
                            className="text-zinc-500 hover:text-white flex-shrink-0"
                            title="Copy Object Path"
                          >
                            {copiedKey === file.storage_key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="p-4 text-zinc-400 text-[11px]">
                        {file.created_at ? formatDate(file.created_at) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Secure Preview / Download Link (300s TTL) */}
                          <button
                            type="button"
                            onClick={() => handleAdminDownload(file)}
                            disabled={downloadLoadingKey === file.storage_key}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            title="Generate Secure 5-Minute Download Link"
                          >
                            {downloadLoadingKey === file.storage_key ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* Link / Change Product */}
                          <button
                            type="button"
                            onClick={() => {
                              setLinkModalFile(file);
                              setTargetProductId(file.product_id || products[0]?.id || '');
                            }}
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors"
                            title={file.product_id ? 'Change Linked Product' : 'Attach to Product'}
                          >
                            <Link2 className="w-4 h-4" />
                          </button>

                          {/* Delete File */}
                          <button
                            type="button"
                            onClick={() => handleDelete(file)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete Deliverable File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Upload Private Paid Deliverable</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Select Deliverable File *
                </label>
                <div className="border-2 border-dashed border-zinc-700 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSelectedUploadFile(f);
                        if (!customFilenameInput) setCustomFilenameInput(f.name);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                  <div className="text-xs font-bold text-zinc-300">
                    {selectedUploadFile ? selectedUploadFile.name : 'Click or Drag & Drop deliverable file'}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Supports PDF, ZIP, RAR, 7Z, DOCX, PPTX, XLSX, EPUB, MP4, MP3 (Up to 500MB)
                  </div>
                </div>
              </div>

              {/* Custom Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Custom Display Filename (Optional)
                </label>
                <input
                  type="text"
                  value={customFilenameInput}
                  onChange={(e) => setCustomFilenameInput(e.target.value)}
                  placeholder="e.g. BenzWell-Flat-Buying-Checklist-v2.pdf"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              {/* Attach to Product */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Attach to Product (Optional)
                </label>
                <select
                  value={uploadTargetProductId}
                  onChange={(e) => setUploadTargetProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="">-- Unassigned (Attach later) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500">
                  Unassigned files can be attached to any product anytime.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUploading || !selectedUploadFile}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Uploading to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      <span>Upload Deliverable</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Product Modal */}
      {linkModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-400" />
                <span>Attach File to Product</span>
              </h3>
              <button
                type="button"
                onClick={() => setLinkModalFile(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0e1017] border border-zinc-800 text-xs">
              <span className="text-zinc-500">File:</span>{' '}
              <span className="font-bold text-white">{linkModalFile.name}</span>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Target Digital Product *
                </label>
                <select
                  required
                  value={targetProductId}
                  onChange={(e) => setTargetProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="">Select a Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkModalFile(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !targetProductId}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold"
                >
                  <span>Attach to Product</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
