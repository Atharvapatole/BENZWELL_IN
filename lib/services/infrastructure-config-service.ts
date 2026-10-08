import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret } from '@/lib/security/encryption';
import { getBaseUrl } from '@/lib/utils';

export interface TigrisConfig {
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  isConfigured: boolean;
}

export type R2Config = TigrisConfig;

export interface ImageKitConfig {
  urlEndpoint: string;
  publicKey: string;
  privateKey: string;
  webhookSecret?: string;
  isConfigured: boolean;
}

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  webhookSecret?: string;
  isConfigured: boolean;
}

export interface ResendConfig {
  apiKey: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  isConfigured: boolean;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  isConfigured: boolean;
}

export interface GitHubConfig {
  token: string;
  owner?: string;
  isConfigured: boolean;
}

export interface SupabaseStorageConfig {
  projectUrl: string;
  serviceRoleKey: string;
  bucketName: string;
  isConfigured: boolean;
}

export interface SupabaseMigrationConfig {
  projectUrl: string;
  serviceRoleKey: string;
  isConfigured: boolean;
}

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isConfigured: boolean;
}

/**
 * Centralized Canonical Infrastructure Configuration Service.
 * Unifies credential retrieval from encrypted database settings and environment variables.
 * Resolves all key aliases and ensures identical credentials across every server service.
 */
export class InfrastructureConfigService {
  /**
   * Helper to safely retrieve database setting with decryption
   */
  private static async getDbSetting(serviceKey: string): Promise<Record<string, any>> {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `infra_${serviceKey}`)
        .maybeSingle();

      const val = data?.value || {};
      const resolved: Record<string, any> = {};

      for (const [k, v] of Object.entries(val)) {
        if (k.endsWith('_encrypted') && typeof v === 'string') {
          const rawKey = k.replace('_encrypted', '');
          resolved[rawKey] = decryptSecret(v);
        } else {
          resolved[k] = v;
        }
      }

      return resolved;
    } catch {
      return {};
    }
  }

  /**
   * Get validated Tigris S3 Storage Configuration
   * Official Tigris S3 Endpoint: https://fly.storage.tigris.dev (default)
   * Official Tigris Region: auto (default)
   */
  static async getTigrisConfig(overrideParams?: Partial<TigrisConfig>): Promise<TigrisConfig> {
    const db = await this.getDbSetting('tigris');

    const bucketName = (
      overrideParams?.bucketName ||
      db.bucket_name ||
      process.env.TIGRIS_BUCKET ||
      process.env.TIGRIS_BUCKET_NAME ||
      process.env.BUCKET_NAME ||
      ''
    ).trim();

    const accessKeyId = (
      overrideParams?.accessKeyId ||
      db.access_key_id ||
      process.env.TIGRIS_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID ||
      ''
    ).trim();

    let secretAccessKey = (
      overrideParams?.secretAccessKey ||
      db.secret_access_key ||
      process.env.TIGRIS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      ''
    ).trim();

    // Ignore placeholder masks
    if (secretAccessKey.includes('••••')) {
      secretAccessKey = (
        db.secret_access_key ||
        process.env.TIGRIS_SECRET_ACCESS_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY ||
        ''
      ).trim();
    }

    let endpoint = (
      overrideParams?.endpoint ||
      db.endpoint ||
      process.env.TIGRIS_ENDPOINT ||
      process.env.AWS_ENDPOINT_URL_S3 ||
      'https://fly.storage.tigris.dev'
    ).trim();

    if (endpoint && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `https://${endpoint}`;
    }

    // Strip trailing slashes
    if (endpoint) {
      try {
        const parsed = new URL(endpoint);
        endpoint = `${parsed.protocol}//${parsed.host}`;
      } catch {
        // use raw endpoint
      }
    }

    const region = (
      overrideParams?.region ||
      db.region ||
      process.env.TIGRIS_REGION ||
      process.env.AWS_REGION ||
      'auto'
    ).trim();

    const isConfigured = Boolean(bucketName && accessKeyId && secretAccessKey && endpoint);

    return {
      bucketName,
      accessKeyId,
      secretAccessKey,
      endpoint: endpoint || 'https://fly.storage.tigris.dev',
      region: region || 'auto',
      isConfigured,
    };
  }

  /**
   * Backward-compatible alias for R2 if referenced by older files
   */
  static async getR2Config(overrideParams?: any): Promise<any> {
    const tigris = await this.getTigrisConfig(overrideParams);
    return {
      accountId: '',
      bucketName: tigris.bucketName,
      accessKeyId: tigris.accessKeyId,
      secretAccessKey: tigris.secretAccessKey,
      endpoint: tigris.endpoint,
      isConfigured: tigris.isConfigured,
    };
  }

  /**
   * Get validated ImageKit Configuration
   */
  static async getImageKitConfig(overrideParams?: Partial<ImageKitConfig>): Promise<ImageKitConfig> {
    const db = await this.getDbSetting('imagekit');

    const urlEndpoint = (
      overrideParams?.urlEndpoint ||
      db.url_endpoint ||
      process.env.IMAGEKIT_URL_ENDPOINT ||
      process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
      ''
    ).trim();

    const publicKey = (
      overrideParams?.publicKey ||
      db.public_key ||
      process.env.IMAGEKIT_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
      ''
    ).trim();

    let privateKey = (
      overrideParams?.privateKey ||
      db.private_key ||
      process.env.IMAGEKIT_PRIVATE_KEY ||
      ''
    ).trim();

    if (privateKey.includes('••••')) {
      privateKey = (db.private_key || process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
    }

    const webhookSecret = (
      overrideParams?.webhookSecret ||
      db.webhook_secret ||
      process.env.IMAGEKIT_WEBHOOK_SECRET ||
      ''
    ).trim();

    const isConfigured = Boolean(urlEndpoint && publicKey && privateKey);

    return {
      urlEndpoint,
      publicKey,
      privateKey,
      webhookSecret,
      isConfigured,
    };
  }

  /**
   * Get validated Appwrite Configuration
   */
  static async getAppwriteConfig(overrideParams?: Partial<AppwriteConfig>): Promise<AppwriteConfig> {
    const db = await this.getDbSetting('appwrite');

    const endpoint = (
      overrideParams?.endpoint ||
      db.endpoint ||
      process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      'https://cloud.appwrite.io/v1'
    ).trim();

    const projectId = (
      overrideParams?.projectId ||
      db.project_id ||
      process.env.APPWRITE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      ''
    ).trim();

    let apiKey = (
      overrideParams?.apiKey ||
      db.api_key ||
      process.env.APPWRITE_API_KEY ||
      process.env.APPWRITE_API_SECRET ||
      ''
    ).trim();

    if (apiKey.includes('••••')) {
      apiKey = (db.api_key || process.env.APPWRITE_API_KEY || '').trim();
    }

    const databaseId = (
      overrideParams?.databaseId ||
      db.database_id ||
      process.env.APPWRITE_DATABASE_ID ||
      ''
    ).trim();

    const webhookSecret = (
      overrideParams?.webhookSecret ||
      db.webhook_secret ||
      process.env.APPWRITE_WEBHOOK_SECRET ||
      ''
    ).trim();

    const isConfigured = Boolean(endpoint && projectId && apiKey && databaseId);

    return {
      endpoint,
      projectId,
      apiKey,
      databaseId,
      webhookSecret,
      isConfigured,
    };
  }

  /**
   * Get validated Resend Configuration
   */
  static async getResendConfig(): Promise<ResendConfig> {
    const db = await this.getDbSetting('resend');

    let apiKey = (db.api_key || process.env.RESEND_API_KEY || '').trim();
    if (apiKey.includes('••••')) {
      apiKey = (process.env.RESEND_API_KEY || '').trim();
    }

    const fromName = (db.from_name || process.env.RESEND_FROM_NAME || 'BenzWell').trim();
    const fromEmail = (db.from_email || process.env.RESEND_FROM_EMAIL || 'info@benzwell.in').trim();
    const replyTo = (db.reply_to || process.env.RESEND_REPLY_TO || 'info@benzwell.in').trim();

    return {
      apiKey,
      fromName,
      fromEmail,
      replyTo,
      isConfigured: Boolean(apiKey && fromEmail),
    };
  }

  /**
   * Get validated Razorpay Configuration
   */
  static async getRazorpayConfig(): Promise<RazorpayConfig> {
    const db = await this.getDbSetting('razorpay');

    const keyId = (
      db.key_id ||
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      ''
    ).trim();

    let keySecret = (db.key_secret || process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (keySecret.includes('••••')) {
      keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    }

    let webhookSecret = (db.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    if (webhookSecret.includes('••••')) {
      webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    }

    return {
      keyId,
      keySecret,
      webhookSecret,
      isConfigured: Boolean(keyId && keySecret),
    };
  }

  /**
   * Get GitHub Integration Configuration for Free Tool Repositories
   */
  static async getGitHubConfig(overrideParams?: Partial<GitHubConfig>): Promise<GitHubConfig> {
    const db = await this.getDbSetting('github');

    let token = (
      overrideParams?.token ||
      db.token ||
      process.env.GITHUB_ACCESS_TOKEN ||
      process.env.GITHUB_TOKEN ||
      process.env.GH_TOKEN ||
      ''
    ).trim();

    if (token.includes('••••')) {
      token = (db.token || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN || '').trim();
    }

    const owner = (
      overrideParams?.owner ||
      db.owner ||
      process.env.GITHUB_OWNER ||
      ''
    ).trim();

    return {
      token,
      owner,
      isConfigured: Boolean(token),
    };
  }

  /**
   * Get Supabase Migration Source Configuration
   * Used strictly for migrating data/assets from old/new Supabase into Appwrite/ImageKit/Tigris
   */
  static async getSupabaseMigrationConfig(overrideParams?: Partial<SupabaseMigrationConfig>): Promise<SupabaseMigrationConfig> {
    const db = await this.getDbSetting('supabase_migration');

    const projectUrl = (
      overrideParams?.projectUrl ||
      db.project_url ||
      process.env.SUPABASE_MIGRATION_PROJECT_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ''
    ).trim();

    let serviceRoleKey = (
      overrideParams?.serviceRoleKey ||
      db.service_role_key ||
      process.env.SUPABASE_MIGRATION_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    ).trim();

    if (serviceRoleKey.includes('••••')) {
      serviceRoleKey = (
        db.service_role_key ||
        process.env.SUPABASE_MIGRATION_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        ''
      ).trim();
    }

    return {
      projectUrl,
      serviceRoleKey,
      isConfigured: Boolean(projectUrl && serviceRoleKey),
    };
  }

  /**
   * Get Canonical Google OAuth Configuration.
   * Resolves Google Client ID & Client Secret from encrypted settings or environment variables.
   * Dynamic canonical redirect URI is always https://benzwell.in/api/auth/callback/google in production.
   */
  static async getGoogleAuthConfig(overrideParams?: Partial<GoogleAuthConfig>): Promise<GoogleAuthConfig> {
    let dbAuth: Record<string, any> = {};
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'auth')
        .maybeSingle();
      if (data?.value) {
        dbAuth = data.value;
      }
    } catch {
      // ignore
    }

    const clientId = (
      overrideParams?.clientId ||
      dbAuth.client_id ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.AUTH_GOOGLE_ID ||
      ''
    ).trim();

    let clientSecret = '';
    if (dbAuth.client_secret_encrypted) {
      try {
        clientSecret = decryptSecret(dbAuth.client_secret_encrypted);
      } catch {
        clientSecret = '';
      }
    }
    if (!clientSecret) {
      clientSecret = (
        overrideParams?.clientSecret ||
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.AUTH_GOOGLE_SECRET ||
        ''
      ).trim();
    }

    const siteUrl = getBaseUrl();
    const redirectUri = `${siteUrl}/api/auth/callback/google`;

    return {
      clientId,
      clientSecret,
      redirectUri,
      isConfigured: Boolean(clientId),
    };
  }

  /**
   * Get Supabase Private Paid Storage Configuration.
   * Resolves Project URL, Service Role Key, and Bucket Name from database or environment.
   */
  static async getSupabaseStorageConfig(overrideParams?: Partial<SupabaseStorageConfig>): Promise<SupabaseStorageConfig> {
    const db = await this.getDbSetting('supabase_storage');

    const projectUrl = (
      overrideParams?.projectUrl ||
      db.project_url ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    ).trim();

    let serviceRoleKey = (
      overrideParams?.serviceRoleKey ||
      db.service_role_key ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    ).trim();

    if (serviceRoleKey.includes('••••')) {
      serviceRoleKey = (
        db.service_role_key ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        ''
      ).trim();
    }

    const bucketName = (
      overrideParams?.bucketName ||
      db.bucket_name ||
      process.env.SUPABASE_PRIVATE_BUCKET ||
      'products-private'
    ).trim();

    return {
      projectUrl,
      serviceRoleKey,
      bucketName: bucketName || 'products-private',
      isConfigured: Boolean(projectUrl && serviceRoleKey),
    };
  }
}
