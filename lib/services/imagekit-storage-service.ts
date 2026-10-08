import ImageKit from 'imagekit';
import { InfrastructureConfigService, ImageKitConfig } from './infrastructure-config-service';

export interface ImageKitUploadResult {
  success: boolean;
  fileId?: string;
  name?: string;
  url?: string;
  thumbnailUrl?: string;
  height?: number;
  width?: number;
  size?: number;
  filePath?: string;
  error?: string;
}

export class ImageKitStorageService {
  /**
   * Instantiate an authenticated ImageKit client
   */
  static async getClient(configOverride?: Partial<ImageKitConfig>): Promise<{ client: ImageKit; config: ImageKitConfig }> {
    const config = await InfrastructureConfigService.getImageKitConfig(configOverride);

    if (!config.isConfigured) {
      const missing = [];
      if (!config.urlEndpoint) missing.push('URL Endpoint');
      if (!config.publicKey) missing.push('Public Key');
      if (!config.privateKey) missing.push('Private Key');

      throw new Error(
        `ImageKit is not fully configured. Missing: ${missing.join(', ')}. Please configure in Admin → Settings → Infrastructure.`
      );
    }

    const client = new ImageKit({
      urlEndpoint: config.urlEndpoint,
      publicKey: config.publicKey,
      privateKey: config.privateKey,
    });

    return { client, config };
  }

  /**
   * Test ImageKit connection and API key validity
   */
  static async testConnection(configOverride?: Partial<ImageKitConfig>): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: any;
  }> {
    try {
      const { client, config } = await this.getClient(configOverride);

      const authParams = client.getAuthenticationParameters();

      const files = await new Promise<any[]>((resolve, reject) => {
        client.listFiles({ limit: 1 }, (err, res) => {
          if (err) reject(err);
          else resolve(res || []);
        });
      });

      return {
        success: true,
        message: 'Connected successfully to ImageKit CDN! Media library and auth parameters are fully operational.',
        details: {
          urlEndpoint: config.urlEndpoint,
          hasAuthTokenGenerated: !!authParams.token,
          mediaSampleCount: files.length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'ImageKit connection failed. Please verify your Private Key, Public Key, and URL Endpoint.',
      };
    }
  }

  /**
   * Upload public media/image buffer directly to ImageKit
   */
  static async uploadImage(params: {
    fileBuffer: Buffer;
    fileName: string;
    folder?: string;
    tags?: string[];
  }): Promise<ImageKitUploadResult> {
    try {
      const { client } = await this.getClient();

      const cleanFileName = params.fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 60);

      const ext = params.fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const finalFileName = `${cleanFileName}_${Date.now()}.${ext}`;

      const res = await new Promise<any>((resolve, reject) => {
        client.upload(
          {
            file: params.fileBuffer,
            fileName: finalFileName,
            folder: params.folder || '/products',
            tags: params.tags || ['product', 'benzwell'],
            useUniqueFileName: true,
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });

      return {
        success: true,
        fileId: res.fileId,
        name: res.name,
        url: res.url,
        thumbnailUrl: res.thumbnailUrl || res.url,
        height: res.height,
        width: res.width,
        size: res.size,
        filePath: res.filePath,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to upload image to ImageKit CDN',
      };
    }
  }

  /**
   * Delete media asset from ImageKit
   */
  static async deleteImage(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { client } = await this.getClient();

      await new Promise<void>((resolve, reject) => {
        client.deleteFile(fileId, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
