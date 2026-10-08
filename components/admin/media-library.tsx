'use client';

import React, { useState } from 'react';
import { uploadMediaAction, deleteMediaAction } from '@/actions/media';
import { PaidFilesManager } from '@/components/admin/paid-files-manager';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { MediaItem } from '@/types';
import { PaidFileItem } from '@/actions/paid-files';
import {
  Upload,
  Search,
  Copy,
  Check,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
  X,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MediaLibraryProps {
  initialPublicMedia: MediaItem[];
  initialPaidFiles: PaidFileItem[];
  paidBucketName: string;
  products: Array<{ id: string; title: string; slug: string }>;
}

export function MediaLibrary({
  initialPublicMedia,
  initialPaidFiles,
  paidBucketName,
  products,
}: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'paid'>('public');

  // Public Media (ImageKit) state
  const [mediaList, setMediaList] = useState<MediaItem[]>(initialPublicMedia);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', file.name.replace(/\.[^/.]+$/, ''));

      const res = await uploadMediaAction(formData);
      if (!res.success) {
        setUploadError(res.error || 'Upload failed');
        break;
      } else if (res.media) {
        setMediaList((prev) => [res.media, ...prev]);
      }
    }

    setIsUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media asset?')) return;

    const res = await deleteMediaAction(id);
    if (res.success) {
      setMediaList((prev) => prev.filter((m) => m.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
    } else {
      alert(res.error || 'Failed to delete asset');
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredMedia = mediaList.filter((m) =>
    m.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-[#0e1017] border border-zinc-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'public'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Public Media (ImageKit)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'public' ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {mediaList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'paid'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Paid Files (Supabase Private)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'paid' ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {initialPaidFiles.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-zinc-400 hidden md:block">
          {activeTab === 'public' ? (
            <span>Public product mockups, thumbnails, and blog images served via ImageKit CDN.</span>
          ) : (
            <span>Private digital deliverables (PDFs, ZIPs, Videos) protected via signed 5-minute URLs.</span>
          )}
        </div>
      </div>

      {/* TAB 1: PUBLIC MEDIA (IMAGEKIT) */}
      {activeTab === 'public' && (
        <div className="space-y-6">
          {/* Search & Upload Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search public assets by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-md active:scale-[0.98]">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading to ImageKit...' : 'Upload Image Assets'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {uploadError && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div className="p-8 rounded-3xl border-2 border-dashed border-zinc-700/80 hover:border-sky-500/50 bg-[#161822]/90 text-center space-y-3 transition-all relative overflow-hidden group">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Upload Public Visual Assets to ImageKit CDN</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                Drag and drop PNG, JPG, WebP, SVG, GIF (up to 50MB) or browse your files.
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Media Grid */}
          {filteredMedia.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl border border-zinc-700/80 bg-[#11131a] overflow-hidden p-2.5 hover:border-zinc-500 transition-all flex flex-col justify-between space-y-2"
                >
                  <div
                    onClick={() => setPreviewItem(item)}
                    className="aspect-square w-full rounded-xl overflow-hidden bg-[#0c0d12] flex items-center justify-center cursor-pointer relative"
                  >
                    <img
                      src={item.file_path}
                      alt={item.alt_text || item.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-zinc-200 truncate" title={item.file_name}>
                      {item.file_name}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {(item.file_size / 1024).toFixed(0)} KB • {formatDate(item.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(item.file_path, item.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                      title="Copy CDN Link"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === item.id ? 'Copied' : 'Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                {searchQuery ? 'No assets matching your search query.' : 'No public media assets uploaded yet.'}
              </p>
            </div>
          )}

          {/* Preview Modal */}
          {previewItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="w-full max-w-2xl p-6 rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{previewItem.file_name}</h3>
                  <button
                    type="button"
                    onClick={() => setPreviewItem(null)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full h-80 rounded-2xl overflow-hidden bg-[#090a0f] flex items-center justify-center">
                  <img
                    src={previewItem.file_path}
                    alt={previewItem.alt_text || previewItem.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-zinc-300 p-3 rounded-xl bg-[#0e1017]">
                  <div>
                    <span className="text-zinc-500">MIME Type:</span> {previewItem.mime_type || 'image'}
                  </div>
                  <div>
                    <span className="text-zinc-500">File Size:</span> {(previewItem.file_size / 1024).toFixed(1)} KB
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-zinc-500">Public ImageKit URL:</span>{' '}
                    <a
                      href={previewItem.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline font-mono select-all"
                    >
                      {previewItem.file_path}
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyUrl(previewItem.file_path, previewItem.id)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span>{copiedId === previewItem.id ? 'Copied Link!' : 'Copy Public URL'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(previewItem.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Delete Asset</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAID FILES (SUPABASE PRIVATE STORAGE) */}
      {activeTab === 'paid' && (
        <PaidFilesManager
          initialFiles={initialPaidFiles}
          bucketName={paidBucketName}
          products={products}
        />
      )}
    </div>
  );
}
