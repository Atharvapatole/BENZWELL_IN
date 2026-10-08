'use client';

import React, { useState, useEffect } from 'react';
import { PaidFileItem, getPaidFilesAction } from '@/actions/paid-files';
import {
  X,
  Search,
  RefreshCw,
  FileText,
  Video,
  Music,
  FileArchive,
  FileCode,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaidFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: PaidFileItem) => void;
  alreadySelectedStorageKeys?: string[];
}

export function PaidFilePickerModal({
  isOpen,
  onClose,
  onSelectFile,
  alreadySelectedStorageKeys = [],
}: PaidFilePickerModalProps) {
  const [files, setFiles] = useState<PaidFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const loadFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPaidFilesAction();
      if (res.success) {
        setFiles(res.files);
      } else {
        setError(res.error || 'Failed to load paid files from Supabase Storage');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with Supabase Storage');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.storage_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.product_title && f.product_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl p-6 rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">Select Existing Paid File</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose an asset stored in Supabase Private Storage to attach as a deliverable for this product.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Refresh Bar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search paid files by name or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadFiles}
            disabled={isLoading}
            className="border-zinc-700 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex-shrink-0">
            {error}
          </div>
        )}

        {/* Files List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-zinc-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
              <span>Scanning Supabase Private Storage...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <FolderOpen className="w-8 h-8 mb-2 text-zinc-600" />
              <p className="text-xs font-semibold text-zinc-400">No paid files found.</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Upload files from Admin &rarr; Media &rarr; Paid Files or upload directly into this product.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isAlreadySelected = alreadySelectedStorageKeys.includes(file.storage_key);
              const sizeFormatted = file.file_size
                ? file.file_size > 1024 * 1024
                  ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`
                  : `${(file.file_size / 1024).toFixed(0)} KB`
                : 'Unknown size';

              return (
                <div
                  key={file.storage_key}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isAlreadySelected
                      ? 'bg-zinc-900/40 border-zinc-800 opacity-60'
                      : 'bg-[#0e1017] border-zinc-800 hover:border-sky-500/50 hover:bg-[#11131a]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                    <div className="p-2 rounded-xl bg-zinc-800/80 flex-shrink-0">
                      {getFileIcon(file.mime_type, file.name)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-mono truncate">
                        <span>{sizeFormatted}</span>
                        <span>•</span>
                        <span className="truncate">{file.storage_key}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {file.product_title && (
                      <span className="text-[10px] font-semibold text-sky-400 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 max-w-[120px] truncate hidden sm:inline-block">
                        {file.product_title}
                      </span>
                    )}

                    {isAlreadySelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold px-3 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Attached</span>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelectFile(file);
                          onClose();
                        }}
                        className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                      >
                        Select & Attach
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-zinc-800 flex-shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
