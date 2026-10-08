'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction, updateProductAction } from '@/actions/admin';
import {
  uploadProductFileAction,
  deleteProductFileAction,
  updateProductFileNameAction,
  linkProductFilesAction,
} from '@/actions/product-files';
import { uploadMediaAction } from '@/actions/media';
import { MediaPickerModal } from '@/components/admin/media-picker-modal';
import { PaidFilePickerModal } from '@/components/admin/paid-file-picker-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify, formatCurrency, cn } from '@/lib/utils';
import { Product, ProductCategory, ProductFile } from '@/types';
import { PaidFileItem } from '@/actions/paid-files';
import {
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  FileText,
  Video,
  FileArchive,
  Music,
  Eye,
  FileCode,
  Edit3,
  Link2,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface ProductFormProps {
  product?: Product;
  categories: ProductCategory[];
  initialFiles?: ProductFile[];
}

export function ProductForm({ product, categories, initialFiles = [] }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;

  const [title, setTitle] = useState(product?.title || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [salePrice, setSalePrice] = useState(product?.sale_price?.toString() || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [productType, setProductType] = useState(product?.product_type || 'digital');
  const [status, setStatus] = useState(product?.status || 'draft');
  const [featured, setFeatured] = useState(product?.featured || false);
  const [shortDescription, setShortDescription] = useState(product?.short_description || '');
  const [description, setDescription] = useState(product?.description || '');
  const [mainImage, setMainImage] = useState(product?.main_image || '');
  const [gallery, setGallery] = useState<string[]>(product?.gallery || []);
  const [downloadLimit, setDownloadLimit] = useState(product?.download_limit?.toString() || '10');
  const [downloadExpiryDays, setDownloadExpiryDays] = useState(product?.download_expiry_days?.toString() || '365');
  const [deliveryType, setDeliveryType] = useState<'upload' | 'external_url'>(
    product?.delivery_type || (product?.external_download_url ? 'external_url' : 'upload')
  );
  const [externalDownloadUrl, setExternalDownloadUrl] = useState(
    product?.external_download_url || ''
  );
  const [seoTitle, setSeoTitle] = useState(product?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(product?.seo_description || '');

  // Digital Product Files (products-private)
  const [files, setFiles] = useState<any[]>(initialFiles);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Dynamic Array Fields
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>(
    product?.what_is_included?.length ? product.what_is_included : ['']
  );
  const [whoIsItFor, setWhoIsItFor] = useState<string[]>(
    product?.who_is_it_for?.length ? product.who_is_it_for : ['']
  );

  // Modals & State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isPaidFilePickerOpen, setIsPaidFilePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'main' | 'gallery'>('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectExistingPaidFile = (selectedPaidFile: PaidFileItem) => {
    // Check if already in files list
    if (files.some((f) => f.storage_path === selectedPaidFile.storage_key || f.storagePath === selectedPaidFile.storage_key)) {
      return;
    }

    const newFileEntry = {
      id: selectedPaidFile.id || selectedPaidFile.storage_key,
      product_id: product?.id || '',
      storage_path: selectedPaidFile.storage_key,
      original_filename: selectedPaidFile.name,
      file_size: selectedPaidFile.file_size,
      mime_type: selectedPaidFile.mime_type,
      file_version: '1.0',
      created_at: selectedPaidFile.created_at || new Date().toISOString(),
    };

    setFiles((prev) => [...prev, newFileEntry]);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  const handleAddIncluded = () => setWhatsIncluded([...whatsIncluded, '']);
  const handleRemoveIncluded = (index: number) =>
    setWhatsIncluded(whatsIncluded.filter((_, i) => i !== index));
  const handleIncludedChange = (index: number, val: string) => {
    const updated = [...whatsIncluded];
    updated[index] = val;
    setWhatsIncluded(updated);
  };

  const handleAddWho = () => setWhoIsItFor([...whoIsItFor, '']);
  const handleRemoveWho = (index: number) =>
    setWhoIsItFor(whoIsItFor.filter((_, i) => i !== index));
  const handleWhoChange = (index: number, val: string) => {
    const updated = [...whoIsItFor];
    updated[index] = val;
    setWhoIsItFor(updated);
  };

  // Digital Deliverable File Upload
  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploadingFile(true);
    setFileUploadError(null);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', product?.id || '');
      formData.append('customFilename', file.name);

      const res = await uploadProductFileAction(formData);
      if (!res.success) {
        setFileUploadError(res.error || 'Failed to upload product deliverable.');
        break;
      } else if (res.file) {
        setFiles((prev) => [...prev, res.file]);
      }
    }

    setIsUploadingFile(false);
    e.target.value = '';
  };

  const handleDeleteProductFile = async (fileId: string, storagePath?: string) => {
    if (!confirm('Are you sure you want to delete this deliverable file?')) return;
    const res = await deleteProductFileAction(fileId, storagePath);
    if (res.success) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId && f.storage_path !== storagePath));
    } else {
      alert(res.error || 'Failed to delete file');
    }
  };

  const handleMediaSelect = (url: string) => {
    if (pickerTarget === 'main') {
      setMainImage(url);
    } else {
      setGallery((prev) => [...prev, url]);
    }
  };

  const handleDirectMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', title || file.name);

    setIsLoading(true);
    const res = await uploadMediaAction(formData);
    setIsLoading(false);

    if (res.success && res.url) {
      setMainImage(res.url);
    } else {
      alert(res.error || 'Failed to upload image.');
    }
    e.target.value = '';
  };

  const handleDirectGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', `${title || 'Product'} gallery ${i + 1}`);

      const res = await uploadMediaAction(formData);
      if (res.success && res.url) {
        setGallery((prev) => [...prev, res.url!]);
      }
    }
    setIsLoading(false);
    e.target.value = '';
  };

  const handleRenameProductFile = async (fileId: string, currentName: string) => {
    const newName = prompt('Enter new display filename:', currentName);
    if (!newName || newName.trim() === currentName) return;

    const res = await updateProductFileNameAction(fileId, newName.trim());
    if (res.success) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, original_filename: newName.trim() } : f))
      );
    } else {
      alert(res.error || 'Failed to rename file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      title,
      slug,
      price: parseFloat(price) || 0,
      sale_price: salePrice ? parseFloat(salePrice) : null,
      category_id: categoryId || null,
      product_type: productType,
      status,
      featured,
      short_description: shortDescription || null,
      description,
      main_image: mainImage || null,
      gallery,
      download_limit: parseInt(downloadLimit) || 10,
      download_expiry_days: parseInt(downloadExpiryDays) || 365,
      delivery_type: deliveryType,
      external_download_url: deliveryType === 'external_url' ? externalDownloadUrl.trim() : null,
      what_is_included: whatsIncluded.filter((i) => i.trim().length > 0),
      who_is_it_for: whoIsItFor.filter((i) => i.trim().length > 0),
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
    };

    let res;
    if (isEditing && product) {
      res = await updateProductAction(product.id, payload);
    } else {
      res = await createProductAction(payload);
      if (res.success && res.product?.id && files.length > 0) {
        const fileIds = files.map((f) => f.id).filter(Boolean);
        if (fileIds.length > 0) {
          await linkProductFilesAction(fileIds, res.product.id);
        }
      }
    }

    setIsLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to save product');
      return;
    }

    router.push('/admin/products');
    router.refresh();
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (mimeType.includes('pdf') || ext === 'pdf') return <FileText className="w-5 h-5 text-red-400" />;
    if (mimeType.includes('video') || ext === 'mp4' || ext === 'mov') return <Video className="w-5 h-5 text-sky-400" />;
    if (mimeType.includes('audio') || ext === 'mp3' || ext === 'wav') return <Music className="w-5 h-5 text-amber-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || ext === 'zip' || ext === 'rar')
      return <FileArchive className="w-5 h-5 text-purple-400" />;
    return <FileCode className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            {isEditing ? `Edit: ${product.title}` : 'Add New Digital Product'}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure metadata, pricing, visual assets, and private product deliverables.
          </p>
        </div>

        {isEditing && (
          <a
            href={`/product/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Preview Product</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Details (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* General Information */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-base font-bold text-white">General Information</h3>

            <Input
              label="Product Title"
              required
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Complete Video Editing & Color Grading Masterclass"
            />

            <Input
              label="URL Slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. video-editing-masterclass"
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Short Description
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="High-level 1-2 sentence hook for store cards."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Full Description (Supports Markdown / Formatting)
              </label>
              <textarea
                rows={8}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed curriculum, breakdown of the digital product, methodology, and deliverables."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 font-mono"
              />
            </div>
          </div>

          {/* Visual Assets & Media */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-base font-bold text-white">Visual Assets (Public Store Images)</h3>

            {/* Main Image */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Main Product Mockup / Thumbnail
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border border-zinc-700 bg-[#0e1017] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {mainImage ? (
                    <img src={mainImage} alt="Main" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Main Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDirectMainImageUpload}
                        className="hidden"
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPickerTarget('main');
                        setIsMediaPickerOpen(true);
                      }}
                      className="border-zinc-700 text-xs font-bold"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                      <span>Select From Library</span>
                    </Button>
                    {mainImage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setMainImage('')}
                        className="text-zinc-400 hover:text-red-400 text-xs"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={mainImage}
                    onChange={(e) => setMainImage(e.target.value)}
                    placeholder="https://... or upload above"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Gallery Images */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Gallery Showcase Images ({gallery.length})
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 text-xs font-bold transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleDirectGalleryImageUpload}
                      className="hidden"
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPickerTarget('gallery');
                      setIsMediaPickerOpen(true);
                    }}
                    className="border-zinc-700 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-sky-400" />
                    <span>From Library</span>
                  </Button>
                </div>
              </div>

              {gallery.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                  {gallery.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-700 bg-[#0e1017]">
                      <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGallery(gallery.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No additional gallery images added.</p>
              )}
            </div>
          </div>

          {/* Digital Deliverables (Private Storage or External URL) */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Digital Delivery / Download Configuration</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                  deliveryType === 'upload'
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                )}>
                  {deliveryType === 'upload' ? 'Private Supabase Storage' : 'External URL'}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure how paying customers will receive their digital assets upon verified checkout.
              </p>
            </div>

            {/* Delivery Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0e1017] border border-zinc-800">
              <button
                type="button"
                onClick={() => setDeliveryType('upload')}
                className={cn(
                  "py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  deliveryType === 'upload'
                    ? "bg-sky-500 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Paid File (Private Storage)</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('external_url')}
                className={cn(
                  "py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  deliveryType === 'external_url'
                    ? "bg-sky-500 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Globe className="w-4 h-4" />
                <span>Use External URL</span>
              </button>
            </div>

            {deliveryType === 'upload' ? (
              <div className="space-y-4 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0e1017] border border-zinc-800/80">
                  <p className="text-xs text-zinc-400">
                    Files are stored securely in the private bucket and delivered via short-lived 5-minute signed URLs.
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPaidFilePickerOpen(true)}
                      className="border-zinc-700 text-xs font-bold"
                    >
                      <Link2 className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                      <span>Select Existing File</span>
                    </Button>

                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingFile ? 'Uploading...' : 'Upload File'}</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleProductFileUpload}
                        disabled={isUploadingFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {fileUploadError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                    {fileUploadError}
                  </div>
                )}

                {/* Deliverables List */}
                {files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0e1017] border border-zinc-700/80 hover:border-zinc-600 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-zinc-800/80 flex-shrink-0">
                            {getFileIcon(file.mime_type || '', file.original_filename)}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-white truncate">{file.original_filename}</p>
                            <p className="text-[10px] text-zinc-400">
                              {file.file_size ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                              Version {file.file_version || '1.0'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                            Secured
                          </span>
                          {file.id && (
                            <button
                              type="button"
                              onClick={() => handleRenameProductFile(file.id, file.original_filename)}
                              className="p-1.5 text-zinc-400 hover:text-sky-400 transition-colors"
                              title="Rename Display Name"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProductFile(file.id, file.storage_path)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Delete Deliverable"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-zinc-800 text-center space-y-2">
                    <FileArchive className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400 font-medium">No deliverable files uploaded yet.</p>
                    <p className="text-[11px] text-zinc-500">
                      Upload PDF, Ebook, MP4 video lessons, or ZIP bundles that customers will receive upon purchase.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    External File / Download URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={externalDownloadUrl}
                      onChange={(e) => setExternalDownloadUrl(e.target.value)}
                      placeholder="https://example.com/downloads/my-asset.zip or https://drive.google.com/..."
                      className="w-full px-4 py-3 rounded-2xl bg-[#0e1017] border border-zinc-700/80 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-800/40 text-sky-300 text-xs space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>External URL Delivery Mode Active</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Customers who purchase this product will be securely redirected to this URL when clicking &quot;Download&quot; in their My Downloads library after entitlement verification.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* What's Included */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">What&apos;s Included</h3>
              <button
                type="button"
                onClick={handleAddIncluded}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {whatsIncluded.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleIncludedChange(idx, e.target.value)}
                    placeholder="e.g. 50+ Production Ready Workflows"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
                  />
                  {whatsIncluded.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIncluded(idx)}
                      className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Who It's For */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Who It&apos;s For</h3>
              <button
                type="button"
                onClick={handleAddWho}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Target</span>
              </button>
            </div>

            <div className="space-y-2">
              {whoIsItFor.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleWhoChange(idx, e.target.value)}
                    placeholder="e.g. Creators & founders scaling operations"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
                  />
                  {whoIsItFor.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWho(idx)}
                      className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SEO Metadata */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-base font-bold text-white">SEO & Search Metadata</h3>
            <Input
              label="SEO Title Tag"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Custom Google title"
            />
            <Input
              label="Meta Description Tag"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Search snippet summary (160 characters)"
            />
          </div>
        </div>

        {/* Pricing, Publishing & Delivery Rules (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Publishing Card */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-sm font-bold text-white">Publishing Status</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400 font-semibold capitalize"
              >
                <option value="draft">Draft (Hidden from Store)</option>
                <option value="published">Published (Live in Store)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#0e1017] text-sky-500"
              />
              <label htmlFor="featured" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                Feature on Storefront Homepage
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold mt-4 shadow-md" isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              <span>{isEditing ? 'Save Product Changes' : 'Create & Publish'}</span>
            </Button>
          </div>

          {/* Pricing */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-sm font-bold text-white">Pricing (INR ₹)</h3>

            <Input
              label="Regular Price (₹)"
              type="number"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 1999"
            />

            <Input
              label="Sale Price (₹) - Optional"
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="e.g. 999"
            />
          </div>

          {/* Organization & Type */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-sm font-bold text-white">Category & Deliverable Type</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Product Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
              >
                {categories.length > 0 ? (
                  <>
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">No categories available. Create a category from Admin Panel first.</option>
                )}
              </select>
              {categories.length === 0 && (
                <p className="text-[11px] text-amber-400 pt-0.5">
                  No categories created yet. You can create categories under Admin &rarr; Categories.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Deliverable Format</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400 capitalize"
              >
                <option value="digital">Digital Product</option>
                <option value="ebook">PDF / Ebook Guide</option>
                <option value="course">Video Masterclass (MP4)</option>
                <option value="template">Template / Notion Framework</option>
                <option value="bundle">ZIP Asset Bundle</option>
              </select>
            </div>
          </div>

          {/* Access Rules */}
          <div className="p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
            <h3 className="text-sm font-bold text-white">Download Access Rules</h3>

            <Input
              label="Download Limit (Max re-downloads)"
              type="number"
              value={downloadLimit}
              onChange={(e) => setDownloadLimit(e.target.value)}
            />

            <Input
              label="Access Expiry Duration (Days)"
              type="number"
              value={downloadExpiryDays}
              onChange={(e) => setDownloadExpiryDays(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        title={pickerTarget === 'main' ? 'Choose Main Product Mockup' : 'Add Image to Gallery'}
      />

      {/* Paid File Picker Modal */}
      <PaidFilePickerModal
        isOpen={isPaidFilePickerOpen}
        onClose={() => setIsPaidFilePickerOpen(false)}
        onSelectFile={handleSelectExistingPaidFile}
        alreadySelectedStorageKeys={files.map((f) => f.storage_path || f.storagePath).filter(Boolean)}
      />
    </form>
  );
}
