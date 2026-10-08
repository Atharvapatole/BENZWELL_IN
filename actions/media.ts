'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';
import { ImageKitStorageService } from '@/lib/services/imagekit-storage-service';
import { InfrastructureConfigService } from '@/lib/services/infrastructure-config-service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Upload an image asset to ImageKit CDN (or fallback to Supabase Storage 'media-public') and record in media table
 */
export async function uploadMediaAction(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const file = formData.get('file') as File | null;
  const altText = (formData.get('altText') as string) || '';

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No valid file selected for upload.' };
  }

  // 1. Validate File Size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: 'File exceeds maximum limit of 50MB.' };
  }

  // 2. Validate MIME Type
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      success: false,
      error: `Unsupported file format (${mimeType}). Please upload JPG, PNG, WebP, or SVG.`,
    };
  }

  // 3. Validate Extension and sanitize filename
  const originalName = file.name;
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { success: false, error: 'File extension is not allowed.' };
  }

  const cleanBaseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  const storagePath = `uploads/${Date.now()}_${cleanBaseName}.${ext}`;
  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl = '';
  let imageKitFileId: string | undefined;

  // 4. Try ImageKit upload first if configured
  const ikConfig = await InfrastructureConfigService.getImageKitConfig();
  if (ikConfig.isConfigured) {
    const ikResult = await ImageKitStorageService.uploadImage({
      fileBuffer: buffer,
      fileName: originalName,
      folder: '/media',
      tags: ['store-media', 'benzwell'],
    });

    if (ikResult.success && ikResult.url) {
      publicUrl = ikResult.url;
      imageKitFileId = ikResult.fileId;
    } else {
      console.warn('ImageKit upload attempt failed:', ikResult.error);
    }
  }

  // 5. Fallback to Supabase Storage if ImageKit wasn't configured or failed
  if (!publicUrl) {
    let { error: uploadError } = await supabase.storage
      .from('media-public')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError && (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket'))) {
      try {
        await supabase.storage.createBucket('media-public', { public: true });
        const retry = await supabase.storage
          .from('media-public')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            cacheControl: '31536000',
            upsert: false,
          });
        uploadError = retry.error;
      } catch (createErr) {
        console.warn('Auto-create bucket media-public attempt failed:', createErr);
      }
    }

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('media-public').getPublicUrl(storagePath);
      publicUrl = urlData.publicUrl;
    } else {
      return {
        success: false,
        error: uploadError.message || 'Failed to upload media asset to storage.',
      };
    }
  }

  // 6. Insert metadata into public.media table
  const { data: mediaRecord, error: dbError } = await supabase
    .from('media')
    .insert({
      file_name: originalName,
      file_path: publicUrl,
      file_size: file.size,
      mime_type: mimeType,
      alt_text: altText || cleanBaseName,
      created_by: user.id,
    })
    .select()
    .single();

  if (dbError || !mediaRecord) {
    console.error('Media DB record error:', dbError);
    return {
      success: true,
      url: publicUrl,
      fileName: originalName,
      warning: 'File uploaded, but database indexing encountered an issue.',
    };
  }

  // 7. Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: profile.email,
    action: 'UPLOAD_MEDIA',
    entity: 'media',
    entity_id: mediaRecord.id,
    metadata: { fileName: originalName, size: file.size, url: publicUrl },
  });

  revalidatePath('/admin/media');
  return { success: true, media: mediaRecord, url: publicUrl };
}

/**
 * Delete a media asset from storage and media table
 */
export async function deleteMediaAction(mediaId: string) {
  const { user, profile } = await requireAdmin();
  const supabase = createAdminClient();

  const { data: item } = await supabase.from('media').select('*').eq('id', mediaId).single();

  if (!item) {
    return { success: false, error: 'Media asset not found.' };
  }

  // Extract storage path from URL if hosted on supabase storage
  if (item.file_path && item.file_path.includes('/media-public/')) {
    const parts = item.file_path.split('/media-public/');
    if (parts[1]) {
      const storageKey = decodeURIComponent(parts[1]);
      try {
        await supabase.storage.from('media-public').remove([storageKey]);
      } catch (supErr) {
        console.warn('Supabase media remove warning:', supErr);
      }
    }
  }

  const { error } = await supabase.from('media').delete().eq('id', mediaId);
  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: profile.email,
    action: 'DELETE_MEDIA',
    entity: 'media',
    entity_id: mediaId,
    metadata: { fileName: item.file_name },
  });

  revalidatePath('/admin/media');
  return { success: true };
}

/**
 * Retrieve all media assets with optional search filter
 */
export async function getMediaListAction(query?: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  let req = supabase.from('media').select('*').order('created_at', { ascending: false });

  if (query && query.trim()) {
    req = req.ilike('file_name', `%${query.trim()}%`);
  }

  const { data: media, error } = await req;

  if (error) {
    return { success: false, error: error.message, media: [] };
  }

  return { success: true, media: media || [] };
}
