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
import { InfrastructureConfigService, R2Config } from './infrastructure-config-service';
import crypto from 'crypto';

export interface R2UploadResult {
  success: boolean;
  storageKey: string;
  bucketName: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

export interface R2PresignedUploadResult {
  success: boolean;
  uploadUrl: string;
  storageKey: string;
  bucketName: string;
  expiresInSeconds: number;
  error?: string;
}

export class R2StorageService {
  /**
   * Instantiate an authenticated S3Client connected to Cloudflare R2
   */
  static async getClient(configOverride?: Partial<R2Config>): Promise<{ client: S3Client; config: R2Config }> {
    const config = await InfrastructureConfigService.getR2Config(configOverride);

    if (!config.isConfigured) {
      const missing = [];
      if (!config.bucketName) missing.push('Bucket Name');
      if (!config.accessKeyId) missing.push('Access Key ID');
      if (!config.secretAccessKey) missing.push('Secret Access Key');
      if (!config.endpoint) missing.push('Endpoint / Account ID');

      throw new Error(
        `Cloudflare R2 is not fully configured. Missing: ${missing.join(', ')}. Please update in Admin → Settings → Infrastructure.`
      );
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
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
   * Test basic connection & bucket accessibility
   */
  static async testConnection(configOverride?: Partial<R2Config>): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
  }> {
    try {
      const { client, config } = await this.getClient(configOverride);

      // Verify bucket existence
      await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));

      // List 1 object to test list permissions
      const listRes = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucketName,
          MaxKeys: 1,
        })
      );

      return {
        success: true,
        message: `Connected successfully to Cloudflare R2! Bucket '${config.bucketName}' is active and accessible.`,
        details: {
          bucketName: config.bucketName,
          endpoint: config.endpoint,
          sampleCount: listRes.KeyCount || 0,
        },
      };
    } catch (err: any) {
      let friendlyError = err.message || 'Failed to connect to Cloudflare R2 bucket.';

      if (err.$metadata?.httpStatusCode === 403 || err.name === 'AccessDenied') {
        friendlyError = 'Access Denied: Please verify your Access Key ID and Secret Access Key have Admin/ReadWrite permissions for this bucket.';
      } else if (err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchBucket' || err.name === 'NotFound') {
        friendlyError = `Bucket not found: Please ensure the bucket name is correct in your Cloudflare R2 dashboard.`;
      }

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Test End-to-End Upload, Download, and Deletion probe on Cloudflare R2
   */
  static async testUploadAndDownload(configOverride?: Partial<R2Config>): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
  }> {
    try {
      const { client, config } = await this.getClient(configOverride);
      const probeKey = `_probes/benzwell-probe-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
      const probePayload = `BenzWell Cloudflare R2 Integrity Probe — Verified at ${new Date().toISOString()}`;

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
        message: `Cloudflare R2 End-to-End Test Passed! PutObject, GetObject, and DeleteObject are fully operational on bucket '${config.bucketName}'.`,
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
        error: err.message || 'Failed to complete R2 upload/download test probe.',
      };
    }
  }

  /**
   * Upload buffer directly to private R2 storage
   */
  static async uploadBuffer(params: {
    fileBuffer: Buffer;
    storageKey: string;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<R2UploadResult> {
    try {
      const { client, config } = await this.getClient();

      await client.send(
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
      };
    } catch (err: any) {
      return {
        success: false,
        storageKey: params.storageKey,
        bucketName: '',
        error: err.message || 'Failed to upload buffer to Cloudflare R2',
      };
    }
  }

  /**
   * Generate presigned URL for direct client-to-R2 upload (avoids server bandwidth limits)
   */
  static async createPresignedUploadUrl(params: {
    storageKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<R2PresignedUploadResult> {
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
        error: err.message || 'Failed to generate R2 presigned upload URL',
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
        error: err.message || 'Failed to generate R2 secure download URL',
      };
    }
  }

  /**
   * Verify object exists in bucket
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
   * Delete object from R2 bucket
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
