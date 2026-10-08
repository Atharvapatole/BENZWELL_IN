'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';
import {
  SupabasePrivateStorageService,
  SupabaseStorageObject,
} from '@/lib/services/supabase-private-storage-service';
import { getAppwriteServerClient } from '@/lib/appwrite/server';
import { ID, Query } from 'node-appwrite';

export interface PaidFileItem {
  id?: string;
  name: string;
  storage_key: string;
  bucket_name: string;
  file_size: number;
  mime_type: string;
  created_at?: string;
  updated_at?: string;
  product_id?: string | null;
  product_title?: string | null;
  product_slug?: string | null;
  is_unassigned: boolean;
  is_orphaned_in_db?: boolean;
}

const ALLOWED_DIGITAL_EXTENSIONS = [
  'pdf',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'epub',
  'mobi',
  'mp4',
  'mov',
  'mp3',
  'wav',
  'm4a',
  'txt',
  'csv',
  'json',
  'iso',
  'dmg',
  'exe',
  'apk',
];

const MAX_PAID_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

/**
 * Scan and list all paid files in Supabase Private Storage merged with database / Appwrite product links.
 * Works even if files were uploaded directly to the Supabase Storage console.
 */
export async function getPaidFilesAction(search?: string): Promise<{
  success: boolean;
  files: PaidFileItem[];
  bucketName: string;
  totalCount: number;
  unassignedCount: number;
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // 1. Scan actual physical objects from Supabase Storage
    const storageScan = await SupabasePrivateStorageService.listAllObjects();
    if (!storageScan.success) {
      return {
        success: false,
        files: [],
        bucketName: storageScan.bucketName,
        totalCount: 0,
        unassignedCount: 0,
        error: storageScan.error,
      };
    }

    // 2. Fetch all products to resolve titles and slugs
    const { data: productsData } = await supabase
      .from('products')
      .select('id, title, slug');

    const productMap = new Map<string, { id: string; title: string; slug: string }>();
    if (productsData) {
      for (const p of productsData) {
        productMap.set(p.id, p);
      }
    }

    // 3. Fetch product_files database rows
    const { data: dbFiles } = await supabase
      .from('product_files')
      .select('*');

    const dbKeyMap = new Map<string, any>();
    if (dbFiles) {
      for (const row of dbFiles) {
        if (row.storage_path) {
          const cleanKey = row.storage_path.replace(/^\/+/, '');
          dbKeyMap.set(cleanKey, row);
          // Also set without prefix
          const baseKey = cleanKey.split('/').pop();
          if (baseKey) dbKeyMap.set(baseKey, row);
        }
      }
    }

    // 4. Try fetching Appwrite product_files collection if available
    const appwriteKeyMap = new Map<string, any>();
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      const appwriteDocs = await databases.listDocuments(databaseId, 'product_files', [
        Query.limit(100),
      ]);
      for (const doc of appwriteDocs.documents) {
        if (doc.objectPath) {
          appwriteKeyMap.set(doc.objectPath, doc);
        }
      }
    } catch {
      // Non-blocking Appwrite query
    }

    // 5. Merge Supabase storage objects with DB / Appwrite links
    const mergedList: PaidFileItem[] = [];
    const matchedStorageKeys = new Set<string>();

    for (const obj of storageScan.objects) {
      const cleanKey = obj.storageKey.replace(/^\/+/, '');
      matchedStorageKeys.add(cleanKey);

      // Check DB match
      const dbMatch = dbKeyMap.get(cleanKey) || dbKeyMap.get(obj.name);
      const appwriteMatch = appwriteKeyMap.get(cleanKey);

      const productId = dbMatch?.product_id || appwriteMatch?.productId || null;
      const product = productId ? productMap.get(productId) : null;

      // Extract filename
      const displayName =
        dbMatch?.original_filename || appwriteMatch?.originalFileName || obj.name;

      mergedList.push({
        id: dbMatch?.id || appwriteMatch?.$id || cleanKey,
        name: displayName,
        storage_key: cleanKey,
        bucket_name: obj.bucketName,
        file_size: obj.fileSize,
        mime_type: obj.mimeType,
        created_at: obj.createdAt || dbMatch?.created_at,
        updated_at: obj.updatedAt || dbMatch?.updated_at,
        product_id: product?.id || productId || null,
        product_title: product?.title || null,
        product_slug: product?.slug || null,
        is_unassigned: !productId,
      });
    }

    // 6. Check for DB entries whose files might be missing from storage (orphaned)
    if (dbFiles) {
      for (const row of dbFiles) {
        if (row.storage_path) {
          const cleanKey = row.storage_path.replace(/^\/+/, '');
          if (!matchedStorageKeys.has(cleanKey)) {
            const product = row.product_id ? productMap.get(row.product_id) : null;
            mergedList.push({
              id: row.id,
              name: row.original_filename || cleanKey,
              storage_key: cleanKey,
              bucket_name: storageScan.bucketName,
              file_size: row.file_size || 0,
              mime_type: row.mime_type || 'application/octet-stream',
              created_at: row.created_at,
              updated_at: row.updated_at,
              product_id: row.product_id || null,
              product_title: product?.title || null,
              product_slug: product?.slug || null,
              is_unassigned: !row.product_id,
              is_orphaned_in_db: true,
            });
          }
        }
      }
    }

    // 7. Sort by created_at / updated_at descending
    mergedList.sort((a, b) => {
      const timeA = a.updated_at || a.created_at || '';
      const timeB = b.updated_at || b.created_at || '';
      return timeB.localeCompare(timeA);
    });

    // 8. Filter by search query if provided
    let filtered = mergedList;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = mergedList.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.storage_key.toLowerCase().includes(q) ||
          (f.product_title && f.product_title.toLowerCase().includes(q))
      );
    }

    const unassignedCount = mergedList.filter((f) => f.is_unassigned).length;

    return {
      success: true,
      files: filtered,
      bucketName: storageScan.bucketName,
      totalCount: mergedList.length,
      unassignedCount,
    };
  } catch (err: any) {
    console.error('getPaidFilesAction failed:', err);
    return {
      success: false,
      files: [],
      bucketName: 'products-private',
      totalCount: 0,
      unassignedCount: 0,
      error: err?.message || 'Failed to load paid files library.',
    };
  }
}

/**
 * Upload a paid file directly from Admin → Media → Paid Files.
 * Validates format, size, dangerous filenames, and collision avoidance.
 */
export async function uploadPaidFileDirectAction(formData: FormData) {
  try {
    const { user, profile } = await requireAdmin();
    const file = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string) || '';
    const customFilename = (formData.get('customFilename') as string) || '';

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'No valid file selected for upload.' };
    }

    // 1. Validate file size
    if (file.size > MAX_PAID_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 500MB.`,
      };
    }

    // 2. Validate extension
    const originalName = customFilename.trim() || file.name;
    const ext = originalName.split('.').pop()?.toLowerCase() || '';

    // Path traversal check
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return { success: false, error: 'Invalid filename containing illegal path characters.' };
    }

    if (!ALLOWED_DIGITAL_EXTENSIONS.includes(ext)) {
      return {
        success: false,
        error: `File extension '.${ext}' is not supported. Supported digital product formats: PDF, ZIP, RAR, 7Z, DOC/DOCX, PPT/PPTX, XLS/XLSX, EPUB, MP4, MOV, MP3, etc.`,
      };
    }

    // 3. Resolve product slug if productId is present
    const supabase = createAdminClient();
    let productSlug = 'unassigned';
    let productTitle: string | null = null;

    if (productId && productId !== 'unassigned') {
      const { data: prod } = await supabase
        .from('products')
        .select('id, title, slug')
        .eq('id', productId)
        .maybeSingle();

      if (prod) {
        productSlug = prod.slug;
        productTitle = prod.title;
      }
    }

    // 4. Generate structured collision-free key
    const { storageKey, sanitizedFilename } = SupabasePrivateStorageService.generateObjectKey({
      productSlug: productId ? productSlug : undefined,
      originalFilename: originalName,
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    // 5. Upload to Supabase Private Storage
    const uploadResult = await SupabasePrivateStorageService.uploadBuffer({
      fileBuffer: buffer,
      storageKey,
      contentType: file.type || 'application/octet-stream',
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload deliverable to Supabase Private Storage.',
      };
    }

    // 6. Record metadata in PostgreSQL database
    let dbRecord = null;
    if (productId && productId !== 'unassigned') {
      const { data: inserted, error: dbError } = await supabase
        .from('product_files')
        .insert({
          product_id: productId,
          storage_path: storageKey,
          original_filename: originalName,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          file_version: '1.0',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to link file to product in database:', dbError);
      } else {
        dbRecord = inserted;
      }
    }

    // 7. Store file metadata in Appwrite database
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      await databases.createDocument(databaseId, 'product_files', ID.unique(), {
        productId: productId || 'unassigned',
        fileId: dbRecord?.id || storageKey,
        originalFileName: originalName,
        storageProvider: 'supabase',
        bucketName: uploadResult.bucketName || 'products-private',
        objectPath: storageKey,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
    } catch (appwriteErr: any) {
      console.warn('Appwrite product_files metadata notice:', appwriteErr?.message);
    }

    // 8. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'UPLOAD_PAID_FILE',
      entity: 'product_files',
      entity_id: dbRecord?.id || storageKey,
      metadata: {
        productId: productId || null,
        fileName: originalName,
        fileSize: file.size,
        storagePath: storageKey,
        storageProvider: 'supabase',
        bucket: uploadResult.bucketName,
      },
    });

    revalidatePath('/admin/media');
    if (productId) revalidatePath(`/admin/products/${productId}`);

    const item: PaidFileItem = {
      id: dbRecord?.id || storageKey,
      name: originalName,
      storage_key: storageKey,
      bucket_name: uploadResult.bucketName || 'products-private',
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_id: productId || null,
      product_title: productTitle,
      product_slug: productSlug !== 'unassigned' ? productSlug : null,
      is_unassigned: !productId || productId === 'unassigned',
    };

    return { success: true, file: item };
  } catch (err: any) {
    console.error('uploadPaidFileDirectAction exception:', err);
    return { success: false, error: err?.message || 'Failed to upload paid file.' };
  }
}

/**
 * Attach / link an existing Supabase paid file to a product
 */
export async function linkPaidFileToProductAction(
  storageKey: string,
  productId: string,
  displayName?: string
) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    if (!storageKey || !productId) {
      return { success: false, error: 'Storage key and Product ID are required.' };
    }

    // 1. Check if product exists
    const { data: prod } = await supabase
      .from('products')
      .select('id, title, slug')
      .eq('id', productId)
      .single();

    if (!prod) {
      return { success: false, error: 'Target product not found.' };
    }

    const cleanKey = storageKey.replace(/^\/+/, '');
    const filename = displayName || cleanKey.split('/').pop() || 'deliverable.pdf';

    // 2. Check if link already exists in database
    const { data: existing } = await supabase
      .from('product_files')
      .select('id')
      .eq('product_id', productId)
      .eq('storage_path', cleanKey)
      .maybeSingle();

    let recordId = existing?.id;

    if (!existing) {
      const { data: inserted, error: insertErr } = await supabase
        .from('product_files')
        .insert({
          product_id: productId,
          storage_path: cleanKey,
          original_filename: filename,
          file_size: 0,
          mime_type: 'application/octet-stream',
          file_version: '1.0',
        })
        .select()
        .single();

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }
      recordId = inserted.id;
    }

    // 3. Update Appwrite metadata
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      await databases.createDocument(databaseId, 'product_files', ID.unique(), {
        productId: productId,
        fileId: recordId || cleanKey,
        originalFileName: filename,
        storageProvider: 'supabase',
        bucketName: 'products-private',
        objectPath: cleanKey,
        fileSize: 0,
        mimeType: 'application/octet-stream',
        fileVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
    } catch {
      // non-blocking
    }

    // 4. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'LINK_PAID_FILE_TO_PRODUCT',
      entity: 'product_files',
      entity_id: recordId || cleanKey,
      metadata: { productId, productTitle: prod.title, storagePath: cleanKey },
    });

    revalidatePath('/admin/media');
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/products');

    return { success: true, recordId, productTitle: prod.title };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to link file to product.' };
  }
}

/**
 * Unlink a paid file from a product (keeps the physical file in Supabase Storage)
 */
export async function unlinkPaidFileFromProductAction(
  storageKey: string,
  productId?: string
) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const cleanKey = storageKey.replace(/^\/+/, '');

    let query = supabase.from('product_files').delete().eq('storage_path', cleanKey);
    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'UNLINK_PAID_FILE_FROM_PRODUCT',
      entity: 'product_files',
      entity_id: cleanKey,
      metadata: { storagePath: cleanKey, productId },
    });

    revalidatePath('/admin/media');
    if (productId) revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unlink file.' };
  }
}

/**
 * Delete paid file permanently from Supabase Private Storage and database
 */
export async function deletePaidFileDirectAction(
  storageKey: string,
  fileId?: string
) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const cleanKey = storageKey.replace(/^\/+/, '');

    // 1. Remove from Supabase Storage
    const deleteStorage = await SupabasePrivateStorageService.deleteObject(cleanKey);
    if (!deleteStorage.success) {
      console.warn('Supabase Storage delete warning:', deleteStorage.error);
    }

    // 2. Remove from database
    await supabase.from('product_files').delete().eq('storage_path', cleanKey);
    if (fileId) {
      await supabase.from('product_files').delete().eq('id', fileId);
    }

    // 3. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'DELETE_PAID_FILE',
      entity: 'product_files',
      entity_id: fileId || cleanKey,
      metadata: { storagePath: cleanKey },
    });

    revalidatePath('/admin/media');
    revalidatePath('/admin/products');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete paid file.' };
  }
}

/**
 * Generate a short-lived 300s presigned download URL for Admin preview / verification
 */
export async function getPaidFilePresignedAdminUrlAction(storageKey: string) {
  try {
    await requireAdmin();

    const result = await SupabasePrivateStorageService.createPresignedDownloadUrl({
      storageKey,
      expiresInSeconds: 300,
    });

    if (!result.success || !result.downloadUrl) {
      return { success: false, error: result.error || 'Failed to generate signed download link.' };
    }

    return {
      success: true,
      downloadUrl: result.downloadUrl,
      filename: result.filename,
      expiresInSeconds: result.expiresInSeconds,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to generate download URL.' };
  }
}
