import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InfrastructureConfigService, SupabaseStorageConfig } from './infrastructure-config-service';
import crypto from 'crypto';

export interface SupabaseUploadResult {
  success: boolean;
  storageKey: string;
  bucketName: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

export interface SupabaseDownloadUrlResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  expiresInSeconds: number;
  error?: string;
}

export interface SupabaseStorageObject {
  name: string;
  storageKey: string;
  bucketName: string;
  fileSize: number;
  mimeType: string;
  createdAt?: string;
  updatedAt?: string;
}

export class SupabasePrivateStorageService {
  private static DEFAULT_BUCKET = 'products-private';

  /**
   * Instantiate an authenticated server-side Supabase client using Service Role Key.
   * Service Role Key is strictly server-side and never exposed to client.
   */
  static async getAdminClient(configOverride?: Partial<SupabaseStorageConfig>): Promise<{
    client: SupabaseClient;
    config: SupabaseStorageConfig;
  }> {
    const config = await InfrastructureConfigService.getSupabaseStorageConfig(configOverride);

    if (!config.isConfigured) {
      throw new Error(
        'Supabase Private Storage is not configured. SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required.'
      );
    }

    const client = createClient(config.projectUrl, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return { client, config };
  }

  /**
   * Verify Supabase connection and ensure products-private bucket exists and is private
   */
  static async testConnection(configOverride?: Partial<SupabaseStorageConfig>): Promise<{
    success: boolean;
    message: string;
    error?: string;
    details?: Record<string, any>;
  }> {
    try {
      const { client, config } = await this.getAdminClient(configOverride);
      const bucketName = config.bucketName || this.DEFAULT_BUCKET;

      // 1. List buckets to verify credentials and bucket existence
      const { data: buckets, error: listErr } = await client.storage.listBuckets();
      if (listErr) {
        return {
          success: false,
          message: 'Failed to access Supabase Storage buckets.',
          error: listErr.message,
        };
      }

      const existingBucket = (buckets || []).find((b) => b.name === bucketName);

      // If bucket missing, attempt to create it as private
      if (!existingBucket) {
        const { error: createErr } = await client.storage.createBucket(bucketName, {
          public: false,
        });

        if (createErr && !createErr.message.includes('already exists')) {
          return {
            success: false,
            message: `Private bucket '${bucketName}' does not exist and could not be created automatically.`,
            error: createErr.message,
          };
        }
      }

      return {
        success: true,
        message: `Supabase Private Paid Storage connected successfully! Bucket '${bucketName}' is active and private.`,
        details: {
          projectUrl: config.projectUrl,
          bucketName,
          isPrivate: true,
          totalBuckets: buckets?.length || 0,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Supabase Storage connection failed.',
        error: err?.message || 'Check your SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.',
      };
    }
  }

  /**
   * Diagnostic probe: perform real test upload, generate signed download link, and clean up probe
   */
  static async testUploadAndDownload(configOverride?: Partial<SupabaseStorageConfig>): Promise<{
    success: boolean;
    message: string;
    error?: string;
    details?: Record<string, any>;
  }> {
    try {
      const { client, config } = await this.getAdminClient(configOverride);
      const bucketName = config.bucketName || this.DEFAULT_BUCKET;
      const probeId = `probe-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const probeKey = `_diagnostic_probes/${probeId}.txt`;
      const probeContent = Buffer.from(`BenzWell Supabase Paid Storage Verification Probe - ${new Date().toISOString()}`);

      // 1. Upload probe
      const { error: uploadErr } = await client.storage.from(bucketName).upload(probeKey, probeContent, {
        contentType: 'text/plain',
        upsert: true,
      });

      if (uploadErr) {
        return {
          success: false,
          message: `Failed to upload test file to bucket '${bucketName}'.`,
          error: uploadErr.message,
        };
      }

      // 2. Generate 60-second signed download URL
      const { data: signData, error: signErr } = await client.storage
        .from(bucketName)
        .createSignedUrl(probeKey, 60, {
          download: `test-${probeId}.txt`,
        });

      if (signErr || !signData?.signedUrl) {
        return {
          success: false,
          message: 'Probe uploaded, but failed to generate signed download URL.',
          error: signErr?.message || 'Signed URL generation failed',
        };
      }

      // 3. Clean up probe
      await client.storage.from(bucketName).remove([probeKey]);

      return {
        success: true,
        message: `✓ Supabase Private Storage verification probe succeeded! Real upload, signed download generation, and cleanup verified in bucket '${bucketName}'.`,
        details: {
          bucketName,
          testKey: probeKey,
          signedUrlPreview: signData.signedUrl.substring(0, 80) + '...',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Supabase Private Storage probe failed.',
        error: err?.message,
      };
    }
  }

  /**
   * Recursively scans and lists all objects in the private bucket.
   * Discovers files uploaded through BenzWell as well as files uploaded directly via Supabase Console.
   */
  static async listAllObjects(): Promise<{
    success: boolean;
    objects: SupabaseStorageObject[];
    bucketName: string;
    error?: string;
  }> {
    try {
      const { client, config } = await this.getAdminClient();
      const bucketName = config.bucketName || this.DEFAULT_BUCKET;

      const discoveredObjects: SupabaseStorageObject[] = [];
      const visitedPaths = new Set<string>();

      // Recursive directory walker
      const walk = async (folderPath: string, depth: number = 0) => {
        if (depth > 8) return;
        if (visitedPaths.has(folderPath)) return;
        visitedPaths.add(folderPath);

        const { data, error } = await client.storage.from(bucketName).list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

        if (error) {
          console.warn(`Supabase Storage list warning at "${folderPath}":`, error.message);
          return;
        }

        if (!data || data.length === 0) return;

        for (const item of data) {
          if (!item.name || item.name === '.emptyFolderPlaceholder') continue;
          if (item.name.startsWith('_diagnostic_probes')) continue;

          const itemKey = folderPath ? `${folderPath}/${item.name}` : item.name;

          // In Supabase Storage, directory entries have item.id === null or item.metadata === null
          const isDirectory = item.id === null || item.metadata === null;

          if (isDirectory) {
            await walk(itemKey, depth + 1);
          } else {
            discoveredObjects.push({
              name: item.name,
              storageKey: itemKey,
              bucketName,
              fileSize: item.metadata?.size || 0,
              mimeType: item.metadata?.mimetype || 'application/octet-stream',
              createdAt: item.created_at || item.updated_at || undefined,
              updatedAt: item.updated_at || item.created_at || undefined,
            });
          }
        }
      };

      // Scan root, products, and unassigned prefixes
      await walk('');
      if (!visitedPaths.has('products')) await walk('products');
      if (!visitedPaths.has('unassigned')) await walk('unassigned');

      // Deduplicate by storageKey
      const uniqueMap = new Map<string, SupabaseStorageObject>();
      for (const obj of discoveredObjects) {
        uniqueMap.set(obj.storageKey, obj);
      }

      return {
        success: true,
        objects: Array.from(uniqueMap.values()),
        bucketName,
      };
    } catch (err: any) {
      console.error('Supabase listAllObjects failed:', err);
      return {
        success: false,
        objects: [],
        bucketName: this.DEFAULT_BUCKET,
        error: err?.message || 'Failed to list objects from Supabase Storage.',
      };
    }
  }

  /**
   * Generate collision-free structured storage key
   * Format: products/<cleanSlug>/<timestamp-token>/<cleanFilename>
   * Or: unassigned/<timestamp-token>/<cleanFilename>
   */
  static generateObjectKey({
    productSlug,
    originalFilename,
  }: {
    productSlug?: string;
    originalFilename: string;
  }): { storageKey: string; sanitizedFilename: string } {
    const isUnassigned = !productSlug || productSlug.trim() === '' || productSlug === 'unassigned';

    const safeBaseName = originalFilename
      .replace(/^.*[\\\/]/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    const uniqueToken = crypto.randomBytes(6).toString('hex');

    if (isUnassigned) {
      const storageKey = `unassigned/${uniqueToken}/${safeBaseName}`;
      return { storageKey, sanitizedFilename: safeBaseName };
    }

    const cleanSlug = productSlug
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'product';

    const storageKey = `products/${cleanSlug}/${uniqueToken}/${safeBaseName}`;
    return { storageKey, sanitizedFilename: safeBaseName };
  }

  /**
   * Upload digital deliverable buffer to private Supabase Storage
   */
  static async uploadBuffer({
    fileBuffer,
    storageKey,
    contentType = 'application/octet-stream',
  }: {
    fileBuffer: Buffer;
    storageKey: string;
    contentType?: string;
  }): Promise<SupabaseUploadResult> {
    try {
      const { client, config } = await this.getAdminClient();
      const bucketName = config.bucketName || this.DEFAULT_BUCKET;

      // Clean leading slashes
      const cleanKey = storageKey.replace(/^\/+/, '');

      console.log(`[Supabase Storage] Uploading object "${cleanKey}" to bucket "${bucketName}" (${fileBuffer.length} bytes)...`);

      let { error: uploadErr } = await client.storage.from(bucketName).upload(cleanKey, fileBuffer, {
        contentType,
        upsert: true,
      });

      // If bucket not found, attempt creation and retry
      if (uploadErr && (uploadErr.message.includes('Bucket not found') || uploadErr.message.includes('bucket'))) {
        try {
          console.log(`[Supabase Storage] Creating bucket "${bucketName}"...`);
          await client.storage.createBucket(bucketName, { public: false });
          const retry = await client.storage.from(bucketName).upload(cleanKey, fileBuffer, {
            contentType,
            upsert: true,
          });
          uploadErr = retry.error;
        } catch (createErr) {
          console.warn('Auto-create bucket failed:', createErr);
        }
      }

      if (uploadErr) {
        console.error(`[Supabase Storage] Upload error for "${cleanKey}":`, uploadErr.message);
        return {
          success: false,
          storageKey: cleanKey,
          bucketName,
          error: uploadErr.message,
        };
      }

      // Verify the object exists by generating a short-lived test signed URL
      const { data: verifyData, error: verifyErr } = await client.storage
        .from(bucketName)
        .createSignedUrl(cleanKey, 60);

      if (verifyErr || !verifyData?.signedUrl) {
        return {
          success: false,
          storageKey: cleanKey,
          bucketName,
          error: 'File uploaded, but could not be verified in Supabase Storage.',
        };
      }

      console.log(`[Supabase Storage] Upload succeeded and verified for "${cleanKey}".`);

      return {
        success: true,
        storageKey: cleanKey,
        bucketName,
        fileSize: fileBuffer.length,
        mimeType: contentType,
      };
    } catch (err: any) {
      console.error('[Supabase Storage] Exception during upload:', err);
      return {
        success: false,
        storageKey,
        bucketName: this.DEFAULT_BUCKET,
        error: err?.message || 'Failed to upload deliverable to Supabase Storage',
      };
    }
  }

  /**
   * Generate short-lived signed download URL (default 300s / 5min)
   */
  static async createPresignedDownloadUrl({
    storageKey,
    downloadFilename,
    expiresInSeconds = 300,
  }: {
    storageKey: string;
    downloadFilename?: string;
    expiresInSeconds?: number;
  }): Promise<SupabaseDownloadUrlResult> {
    try {
      const { client, config } = await this.getAdminClient();
      const bucketName = config.bucketName || this.DEFAULT_BUCKET;

      const cleanKey = storageKey
        .replace(/^products-private\//, '')
        .replace(/^product-files\//, '')
        .replace(/^\/+/, '');

      const filename = downloadFilename || cleanKey.split('/').pop() || 'benzwell-download.pdf';

      let { data, error } = await client.storage.from(bucketName).createSignedUrl(cleanKey, expiresInSeconds, {
        download: filename,
      });

      if (error || !data?.signedUrl) {
        // Retry with product-files bucket alias if legacy
        const retry = await client.storage.from('product-files').createSignedUrl(cleanKey, expiresInSeconds, {
          download: filename,
        });
        if (retry.data?.signedUrl) {
          data = retry.data;
          error = null;
        }
      }

      if (error || !data?.signedUrl) {
        return {
          success: false,
          expiresInSeconds,
          error: error?.message || 'Could not generate signed download URL.',
        };
      }

      return {
        success: true,
        downloadUrl: data.signedUrl,
        filename,
        expiresInSeconds,
      };
    } catch (err: any) {
      return {
        success: false,
        expiresInSeconds,
        error: err?.message || 'Failed to generate signed download URL from Supabase Storage.',
      };
    }
  }

  /**
   * Delete an object from Supabase private storage
   */
  static async deleteObject(storageKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { client, config } = await this.getAdminClient();
      const bucketName = config.bucketName || this.DEFAULT_BUCKET;

      const cleanKey = storageKey
        .replace(/^products-private\//, '')
        .replace(/^product-files\//, '')
        .replace(/^\/+/, '');

      console.log(`[Supabase Storage] Deleting object "${cleanKey}" from bucket "${bucketName}"...`);
      const { error } = await client.storage.from(bucketName).remove([cleanKey]);
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
}
