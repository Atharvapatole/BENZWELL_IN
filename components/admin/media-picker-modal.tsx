'use client';

import React, { useState, useEffect } from 'react';
import { getMediaListAction, uploadMediaAction } from '@/actions/media';
import { Button } from '@/components/ui/button';
import { MediaItem } from '@/types';
import { Upload, Search, Check, X, Image as ImageIcon } from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Image Asset',
}: MediaPickerModalProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen]);

  const loadMedia = async () => {
    setIsLoading(true);
    const res = await getMediaListAction();
    setIsLoading(false);
    if (res.success && res.media) {
      setMediaList(res.media);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', file.name.replace(/\.[^/.]+$/, ''));

    const res = await uploadMediaAction(formData);
    setIsUploading(false);

    if (res.success && res.url) {
      setSelectedUrl(res.url);
      if (res.media) {
        setMediaList((prev) => [res.media, ...prev]);
      }
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  const filteredMedia = mediaList.filter((m) =>
    m.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl p-6 rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[420px] p-2 rounded-2xl bg-[#0e1017] border border-zinc-800">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              Loading media library...
            </div>
          ) : filteredMedia.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredMedia.map((item) => {
                const isSelected = selectedUrl === item.file_path;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedUrl(item.file_path)}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all bg-[#11131a] flex items-center justify-center ${
                      isSelected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <img
                      src={item.file_path}
                      alt={item.file_name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-sky-500 text-white shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-400 py-12 space-y-2">
              <ImageIcon className="w-8 h-8 text-zinc-600" />
              <span>No images found. Upload one to get started.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <p className="text-[11px] text-zinc-400 truncate max-w-sm">
            {selectedUrl ? `Selected: ${selectedUrl}` : 'Click an image to select'}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedUrl}
              onClick={() => {
                if (selectedUrl) {
                  onSelect(selectedUrl);
                  onClose();
                }
              }}
              className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold"
            >
              Apply Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
