import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InfrastructureConfigService, TigrisConfig } from './infrastructure-config-service';
import crypto from 'crypto';

export interface TigrisUploadResult {
  success: boolean;
  storageKey: string;
  bucketName: string;
  fileSize?: number;
  mimeType?: string;
  etag?: string;
  error?: string;
}

export interface TigrisPresignedUploadResult {
  success: boolean;
  uploadUrl: string;
  storageKey: string;
  bucketName: string;
  expiresInSeconds: number;
  error?: string;
}

/**
 * Tigris S3-Compatible Storage Service for Secure Paid Digital Products
 * Follows current official Tigris S3 specifications:
 * - Default Endpoint: https://fly.storage.tigris.dev
 * - Default Region: auto
 * - AWS S3 SDK integration
 */
export class TigrisStorageService {
  /**
   * Instantiate an authenticated S3Client connected to Tigris Object Storage
   */
  static async getClient(configOverride?: Partial<TigrisConfig>): Promise<{ client: S3Client; config: TigrisConfig }> {
    const config = await InfrastructureConfigService.getTigrisConfig(configOverride);

    if (!config.isConfigured) {
      const missing = [];
      if (!config.bucketName) missing.push('Bucket Name');
      if (!config.accessKeyId) missing.push('Access Key ID');
      if (!config.secretAccessKey) missing.push('Secret Access Key');
      if (!config.endpoint) missing.push('Endpoint');

      throw new Error(
        `Tigris Private Storage is not fully configured. Missing: ${missing.join(', ')}. Please configure in Admin → Settings → Infrastructure.`
      );
    }

    const client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint || 'https://fly.storage.tigris.dev',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: false,
    });

    return { client, config };
  }

  /**
   * Generate collision-proof, structured private object key for paid digital products
   * Structure: products/{productSlug}/{langCode}/{uniqueToken}/{sanitizedFilename}
   */
  static generateObjectKey(params: {
    productSlug: string;
    languageCode?: string;
    originalFilename: string;
  }): { storageKey: string; sanitizedFilename: string } {
    const cleanSlug = (params.productSlug || 'digital-product')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);

    const lang = (params.languageCode || 'en')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 10);

    const ext = params.originalFilename.split('.').pop()?.toLowerCase() || 'dat';
    const baseName = params.originalFilename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    const sanitizedFilename = `${baseName}.${ext}`;
    const uniqueToken = crypto.randomBytes(8).toString('hex');
    const storageKey = `products/${cleanSlug}/${lang}/${uniqueToken}/${sanitizedFilename}`;

    return { storageKey, sanitizedFilename };
  }

  /**
   * Test basic connection & bucket accessibility to Tigris
   */
  static async testConnection(configOverride?: Partial<TigrisConfig>): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
  }> {
    try {
      const { client, config } = await this.getClient(configOverride);

      // Verify bucket existence
      await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));

      // Test list permissions (1 item)
      const listRes = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucketName,
          MaxKeys: 1,
        })
      );

      return {
        success: true,
        message: `Connected successfully to Tigris Object Storage! Bucket '${config.bucketName}' is active and reachable via ${config.endpoint}.`,
        details: {
          bucketName: config.bucketName,
          endpoint: config.endpoint,
          region: config.region,
          sampleCount: listRes.KeyCount || 0,
        },
      };
    } catch (err: any) {
      let friendlyError = err.message || 'Failed to connect to Tigris bucket.';

      if (err.$metadata?.httpStatusCode === 403 || err.name === 'AccessDenied') {
        friendlyError = 'Access Denied: Please verify your Tigris Access Key ID and Secret Access Key have Read/Write permissions for this bucket.';
      } else if (err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchBucket' || err.name === 'NotFound') {
        friendlyError = `Bucket '${configOverride?.bucketName || 'unknown'}' not found in Tigris. Please verify the bucket name in your Tigris console.`;
      }

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Test End-to-End Upload, Download, and Deletion probe on Tigris
   */
  static async testUploadAndDownload(configOverride?: Partial<TigrisConfig>): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
  }> {
    try {
      const { client, config } = await this.getClient(configOverride);
      const probeKey = `_probes/benzwell-probe-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
      const probePayload = `BenzWell Tigris Integrity Probe — Verified at ${new Date().toISOString()}`;

      // 1. Put Object
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: probeKey,
          Body: probePayload,
          ContentType: 'text/plain',
        })
      );

      // 2. Get Object and verify content
      const getRes = await client.send(
        new GetObjectCommand({
          Bucket: config.bucketName,
          Key: probeKey,
        })
      );
      const retrievedBody = await getRes.Body?.transformToString();
      const contentMatches = retrievedBody === probePayload;

      // 3. Delete probe object
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: probeKey,
        })
      );

      if (!contentMatches) {
        return {
          success: false,
          error: 'Probe content mismatch: Retrieved data did not match uploaded payload.',
        };
      }

      return {
        success: true,
        message: `Tigris End-to-End Integrity Test Passed! PutObject, GetObject, and DeleteObject verified on bucket '${config.bucketName}'.`,
        details: {
          bucketName: config.bucketName,
          endpoint: config.endpoint,
          putObjectPassed: true,
          getObjectPassed: true,
          deleteObjectPassed: true,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to complete Tigris upload/download test probe.',
      };
    }
  }

  /**
   * Upload buffer directly to private Tigris storage
   */
  static async uploadBuffer(params: {
    fileBuffer: Buffer;
    storageKey: string;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<TigrisUploadResult> {
    try {
      const { client, config } = await this.getClient();

      const putRes = await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: params.storageKey,
          Body: params.fileBuffer,
          ContentType: params.contentType || 'application/octet-stream',
          Metadata: params.metadata,
        })
      );

      return {
        success: true,
        storageKey: params.storageKey,
        bucketName: config.bucketName,
        fileSize: params.fileBuffer.length,
        mimeType: params.contentType,
        etag: putRes.ETag,
      };
    } catch (err: any) {
      return {
        success: false,
        storageKey: params.storageKey,
        bucketName: '',
        error: err.message || 'Failed to upload buffer to Tigris',
      };
    }
  }

  /**
   * Generate presigned URL for direct client-to-Tigris upload (avoids server bandwidth limits)
   */
  static async createPresignedUploadUrl(params: {
    storageKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<TigrisPresignedUploadResult> {
    try {
      const { client, config } = await this.getClient();
      const expiresIn = params.expiresInSeconds || 600; // 10 minutes

      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: params.storageKey,
        ContentType: params.contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn });

      return {
        success: true,
        uploadUrl,
        storageKey: params.storageKey,
        bucketName: config.bucketName,
        expiresInSeconds: expiresIn,
      };
    } catch (err: any) {
      return {
        success: false,
        uploadUrl: '',
        storageKey: params.storageKey,
        bucketName: '',
        expiresInSeconds: 0,
        error: err.message || 'Failed to generate Tigris presigned upload URL',
      };
    }
  }

  /**
   * Generate short-lived secure presigned download URL for paid customer entitlements
   */
  static async createPresignedDownloadUrl(params: {
    storageKey: string;
    downloadFilename?: string;
    expiresInSeconds?: number;
  }): Promise<{ success: boolean; downloadUrl: string; expiresInSeconds: number; error?: string }> {
    try {
      const { client, config } = await this.getClient();
      const expiresIn = params.expiresInSeconds || 300; // 5 minutes default

      const filename = params.downloadFilename || params.storageKey.split('/').pop() || 'benzwell-download.pdf';
      const cleanFilename = encodeURIComponent(filename.replace(/"/g, ''));

      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: params.storageKey,
        ResponseContentDisposition: `attachment; filename="${cleanFilename}"; filename*=UTF-8''${cleanFilename}`,
      });

      const downloadUrl = await getSignedUrl(client, command, { expiresIn });

      return {
        success: true,
        downloadUrl,
        expiresInSeconds: expiresIn,
      };
    } catch (err: any) {
      return {
        success: false,
        downloadUrl: '',
        expiresInSeconds: 0,
        error: err.message || 'Failed to generate Tigris secure download URL',
      };
    }
  }

  /**
   * Verify object exists in Tigris bucket
   */
  static async checkObjectExists(storageKey: string): Promise<boolean> {
    try {
      const { client, config } = await this.getClient();
      await client.send(
        new HeadObjectCommand({
          Bucket: config.bucketName,
          Key: storageKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete object from Tigris bucket
   */
  static async deleteObject(storageKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { client, config } = await this.getClient();
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: storageKey,
        })
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
