'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';
import { SupabasePrivateStorageService } from '@/lib/services/supabase-private-storage-service';
import { getAppwriteServerClient } from '@/lib/appwrite/server';
import { ID } from 'node-appwrite';

const MAX_PRODUCT_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

/**
 * Upload a private digital product deliverable (PDF, MP4, ZIP, Ebook, etc.)
 * directly to the secure Supabase Private Storage bucket (products-private).
 */
export async function uploadProductFileAction(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const file = formData.get('file') as File | null;
  const productId = (formData.get('productId') as string) || '';
  const fileVersion = (formData.get('fileVersion') as string) || '1.0';
  const customFilename = (formData.get('customFilename') as string) || '';

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No valid digital file provided for upload.' };
  }

  if (file.size > MAX_PRODUCT_FILE_SIZE_BYTES) {
    return { success: false, error: 'File size exceeds maximum limit of 500MB.' };
  }

  const originalName = customFilename.trim() || file.name;
  const { storageKey, sanitizedFilename } = SupabasePrivateStorageService.generateObjectKey({
    productSlug: productId || 'unassigned',
    originalFilename: originalName,
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Upload to Supabase Private Storage (products-private bucket)
  const uploadResult = await SupabasePrivateStorageService.uploadBuffer({
    fileBuffer: buffer,
    storageKey,
    contentType: file.type || 'application/octet-stream',
  });

  if (!uploadResult.success) {
    return {
      success: false,
      error: uploadResult.error || 'Failed to upload product deliverable to Supabase Private Storage.',
    };
  }

  const supabase = createAdminClient();
  let fileRecord = null;

  // 2. Insert record into database product_files table
  if (productId) {
    const { data: inserted, error: dbError } = await supabase
      .from('product_files')
      .insert({
        product_id: productId,
        storage_path: storageKey,
        original_filename: originalName,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        file_version: fileVersion,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to link file to product in database:', dbError);
    } else {
      fileRecord = inserted;
    }
  }

  // 3. Store file metadata in Appwrite database if available
  try {
    const { databases, databaseId } = await getAppwriteServerClient();
    await databases.createDocument(databaseId, 'product_files', ID.unique(), {
      productId: productId || 'unassigned',
      fileId: fileRecord?.id || storageKey,
      originalFileName: originalName,
      storageProvider: 'supabase',
      bucketName: uploadResult.bucketName || 'products-private',
      objectPath: storageKey,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileVersion: fileVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    });
  } catch (appwriteErr: any) {
    // Appwrite collection might not exist yet or collection permissions being configured
    console.warn('Appwrite product_files metadata sync notice:', appwriteErr?.message);
  }

  // 4. Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: profile.email,
    action: 'UPLOAD_PRODUCT_FILE',
    entity: 'product_files',
    entity_id: fileRecord?.id || storageKey,
    metadata: {
      productId,
      fileName: originalName,
      fileSize: file.size,
      storagePath: storageKey,
      storageProvider: 'supabase',
      bucket: uploadResult.bucketName || 'products-private',
    },
  });

  if (productId) {
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/products');
  }

  return {
    success: true,
    file: fileRecord || {
      storage_path: storageKey,
      original_filename: originalName,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      file_version: fileVersion,
      bucket_name: uploadResult.bucketName || 'products-private',
      storage_provider: 'supabase',
    },
  };
}

/**
 * Delete a product deliverable file from Supabase private storage and database
 */
export async function deleteProductFileAction(
  fileId: string,
  storagePath?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    let targetStoragePath = storagePath;

    if (fileId) {
      const { data: fileRow } = await supabase
        .from('product_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileRow) {
        targetStoragePath = fileRow.storage_path;
        await supabase.from('product_files').delete().eq('id', fileId);
      }
    }

    if (targetStoragePath) {
      await SupabasePrivateStorageService.deleteObject(targetStoragePath);
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'DELETE_PRODUCT_FILE',
      entity: 'product_files',
      entity_id: fileId,
      metadata: { storagePath: targetStoragePath },
    });

    revalidatePath('/admin/products');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete product file:', err);
    return { success: false, error: err?.message || 'Failed to delete product file' };
  }
}

/**
 * Fetch all digital product deliverables for a specific product
 */
export async function getProductFilesAction(productId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: files, error } = await supabase
    .from('product_files')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message, files: [] };
  }

  return { success: true, files: files || [] };
}

/**
 * Rename the original_filename / display name of a deliverable file
 */
export async function updateProductFileNameAction(fileId: string, newFilename: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    if (!fileId || !newFilename.trim()) {
      return { success: false, error: 'Filename cannot be empty' };
    }

    const { error } = await supabase
      .from('product_files')
      .update({ original_filename: newFilename.trim(), updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/products');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update file name' };
  }
}

/**
 * Associate uploaded product file IDs with a newly created product ID
 */
export async function linkProductFilesAction(fileIds: string[], productId: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    if (!productId || !fileIds || fileIds.length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('product_files')
      .update({ product_id: productId, updated_at: new Date().toISOString() })
      .in('id', fileIds);

    if (error) {
      console.error('Failed to link files to product:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/admin/products');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to link files to product' };
  }
}
