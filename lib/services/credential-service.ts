import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/security/encryption';
import { Client, Databases } from 'node-appwrite';
import ImageKit from 'imagekit';
import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';
import Razorpay from 'razorpay';

export type SupportedService =
  | 'appwrite'
  | 'imagekit'
  | 'supabase_storage'
  | 'tigris'
  | 'cloudflare_r2'
  | 'resend'
  | 'razorpay'
  | 'github'
  | 'vercel'
  | 'supabase_migration'
  | 'ai_providers';

export interface InfrastructureTestResult {
  success: boolean;
  service: SupportedService;
  message?: string;
  error?: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Map of sensitive keys that MUST be encrypted at rest for each service
const SENSITIVE_FIELDS: Record<string, string[]> = {
  appwrite: ['api_key', 'webhook_secret'],
  imagekit: ['private_key', 'webhook_secret'],
  supabase_storage: ['service_role_key'],
  tigris: ['secret_access_key'],
  cloudflare_r2: ['secret_access_key'],
  resend: ['api_key'],
  razorpay: ['key_secret', 'webhook_secret'],
  github: ['personal_access_token', 'client_secret', 'private_key'],
  vercel: ['api_token'],
  supabase_migration: ['service_role_key'],
  ai_providers: ['groq_api_key', 'mistral_api_key', 'gemini_api_key', 'openai_api_key'],
};

export class CredentialService {
  /**
   * Encrypts and securely saves credentials into database for a given service.
   * Never stores raw secrets as plaintext.
   */
  static async saveCredential(
    service: SupportedService,
    data: Record<string, any>,
    adminUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createAdminClient();

      // Retrieve existing config to avoid erasing unedited secrets
      const { data: existingRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `infra_${service}`)
        .maybeSingle();

      const existing = existingRow?.value || {};
      const updated: Record<string, any> = { ...existing };
      const sensitiveKeys = SENSITIVE_FIELDS[service] || [];

      // Process and encrypt all sensitive fields
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;

        if (sensitiveKeys.includes(key)) {
          if (typeof value === 'string' && value.trim() && !value.includes('••••')) {
            updated[`${key}_encrypted`] = encryptSecret(value.trim());
          }
        } else {
          updated[key] = value;
        }
      }

      // Upsert into site_settings with infra_ prefix
      const { error } = await supabase.from('site_settings').upsert(
        {
          key: `infra_${service}`,
          value: updated,
          category: 'infrastructure',
          updated_at: new Date().toISOString(),
          updated_by: adminUserId || null,
        },
        { onConflict: 'key' }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      // Record secure audit log
      if (adminUserId) {
        await supabase.from('audit_logs').insert({
          user_id: adminUserId,
          action: `UPDATE_INFRASTRUCTURE_${service.toUpperCase()}`,
          entity: 'site_settings',
          entity_id: `infra_${service}`,
          metadata: {
            service,
            fieldsUpdated: Object.keys(data).filter((k) => !sensitiveKeys.includes(k)),
            hasSecretsUpdated: Object.keys(data).some((k) => sensitiveKeys.includes(k) && data[k] && !data[k].includes('••••')),
            timestamp: new Date().toISOString(),
          },
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save credential securely.' };
    }
  }

  /**
   * Retrieves decrypted secret for server-only operations.
   * NEVER pass result of this method to client components or API responses.
   */
  static async getCredentialServerOnly(
    service: SupportedService,
    field: string
  ): Promise<string> {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `infra_${service}`)
        .maybeSingle();

      const config = data?.value || {};
      const encryptedKey = `${field}_encrypted`;

      if (config[encryptedKey]) {
        return decryptSecret(config[encryptedKey]);
      }

      if (config[field]) {
        return config[field];
      }

      // Fallback to environment variables if not found in database settings
      const envKeyMap: Record<string, Record<string, string | undefined>> = {
        appwrite: {
          endpoint: process.env.APPWRITE_ENDPOINT,
          project_id: process.env.APPWRITE_PROJECT_ID,
          api_key: process.env.APPWRITE_API_KEY,
          database_id: process.env.APPWRITE_DATABASE_ID,
          webhook_secret: process.env.APPWRITE_WEBHOOK_SECRET,
        },
        imagekit: {
          url_endpoint: process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
          public_key: process.env.IMAGEKIT_PUBLIC_KEY || process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
          private_key: process.env.IMAGEKIT_PRIVATE_KEY,
          webhook_secret: process.env.IMAGEKIT_WEBHOOK_SECRET,
        },
        cloudflare_r2: {
          account_id: process.env.R2_ACCOUNT_ID,
          bucket_name: process.env.R2_BUCKET_NAME,
          access_key_id: process.env.R2_ACCESS_KEY_ID,
          secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
          endpoint: process.env.R2_ENDPOINT,
        },
        resend: {
          api_key: process.env.RESEND_API_KEY,
          from_name: process.env.RESEND_FROM_NAME,
          from_email: process.env.RESEND_FROM_EMAIL,
          reply_to: process.env.RESEND_REPLY_TO,
        },
        razorpay: {
          key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
          webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
        },
        github: {
          personal_access_token: process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN,
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
        },
        vercel: {
          api_token: process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN,
          team_id: process.env.VERCEL_TEAM_ID,
        },
      };

      return envKeyMap[service]?.[field] || '';
    } catch (err) {
      console.error(`[CredentialService] Failed to retrieve credential for ${service}.${field}`);
      return '';
    }
  }

  /**
   * Retrieves all credentials for a service in server memory.
   */
  static async getAllCredentialsServerOnly(
    service: SupportedService
  ): Promise<Record<string, string>> {
    const sensitiveKeys = SENSITIVE_FIELDS[service] || [];
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', `infra_${service}`)
      .maybeSingle();

    const config = data?.value || {};
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (key.endsWith('_encrypted')) {
        const rawField = key.replace('_encrypted', '');
        result[rawField] = decryptSecret(value as string);
      } else {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }

    // Ensure sensitive keys are filled from env fallback if empty
    for (const field of sensitiveKeys) {
      if (!result[field]) {
        result[field] = await this.getCredentialServerOnly(service, field);
      }
    }

    return result;
  }

  /**
   * Returns a sanitized, masked copy of credentials suitable for Admin UI display.
   * Completely strips unencrypted secrets and returns masked status indicators.
   */
  static async getMaskedCredential(
    service: SupportedService
  ): Promise<Record<string, any>> {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `infra_${service}`)
        .maybeSingle();

      const config = data?.value || {};
      const sensitiveKeys = SENSITIVE_FIELDS[service] || [];
      const masked: Record<string, any> = {};

      // 1. Copy non-sensitive fields
      for (const [key, value] of Object.entries(config)) {
        if (!key.endsWith('_encrypted') && !sensitiveKeys.includes(key)) {
          masked[key] = value;
        }
      }

      // 2. Add safe mask flags for sensitive fields
      for (const field of sensitiveKeys) {
        const hasDbSecret = !!config[`${field}_encrypted`];
        const envVal = await this.getCredentialServerOnly(service, field);
        const isConfigured = hasDbSecret || !!envVal;

        masked[`has_${field}`] = isConfigured;
        masked[`${field}_masked`] = isConfigured ? '••••••••••••••••' : '';
        masked[`${field}_source`] = hasDbSecret ? 'database' : (envVal ? 'environment' : 'none');
      }

      return masked;
    } catch {
      return {};
    }
  }

  /**
   * Delete specific credential field or entire service config
   */
  static async deleteCredential(
    service: SupportedService,
    field?: string,
    adminUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createAdminClient();

      if (!field) {
        // Delete entire service record
        await supabase.from('site_settings').delete().eq('key', `infra_${service}`);
      } else {
        // Remove specific key
        const { data: existingRow } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', `infra_${service}`)
          .maybeSingle();

        const updated = { ...(existingRow?.value || {}) };
        delete updated[field];
        delete updated[`${field}_encrypted`];

        await supabase.from('site_settings').upsert({
          key: `infra_${service}`,
          value: updated,
          category: 'infrastructure',
          updated_at: new Date().toISOString(),
          updated_by: adminUserId || null,
        });
      }

      if (adminUserId) {
        await supabase.from('audit_logs').insert({
          user_id: adminUserId,
          action: `DELETE_INFRASTRUCTURE_${service.toUpperCase()}_${field ? field.toUpperCase() : 'ALL'}`,
          entity: 'site_settings',
          entity_id: `infra_${service}`,
          metadata: { service, field: field || 'all', timestamp: new Date().toISOString() },
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // CONNECTION TESTERS
  // =========================================================================

  /**
   * Test Appwrite Connection & verify Project, API Key, Database & Collections
   */
  static async testAppwrite(): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const endpoint =
        (await this.getCredentialServerOnly('appwrite', 'endpoint')) ||
        process.env.APPWRITE_ENDPOINT ||
        'https://cloud.appwrite.io/v1';
      const projectId =
        (await this.getCredentialServerOnly('appwrite', 'project_id')) ||
        process.env.APPWRITE_PROJECT_ID;
      const apiKey =
        (await this.getCredentialServerOnly('appwrite', 'api_key')) ||
        process.env.APPWRITE_API_KEY;
      const databaseId =
        (await this.getCredentialServerOnly('appwrite', 'database_id')) ||
        process.env.APPWRITE_DATABASE_ID;

      if (!projectId || !apiKey) {
        return {
          success: false,
          service: 'appwrite',
          error: 'Appwrite Project ID and API Key must be configured to test connection.',
          timestamp,
        };
      }

      const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

      const databases = new Databases(client);

      // 1. Verify project authentication and query project databases
      let projectDatabases: any[] = [];
      try {
        const listResult = await databases.list();
        projectDatabases = listResult.databases || [];
      } catch (authErr: any) {
        return {
          success: false,
          service: 'appwrite',
          error: `Failed to authenticate with Appwrite project '${projectId}': ${authErr.message}. Please check your Endpoint, Project ID, and API Key permissions.`,
          timestamp,
        };
      }

      // 2. Check if databaseId was provided
      if (!databaseId || !databaseId.trim()) {
        const dbNames = projectDatabases.map((d) => `'${d.name}' (ID: ${d.$id})`);
        return {
          success: false,
          service: 'appwrite',
          error:
            projectDatabases.length > 0
              ? `Appwrite authenticated successfully! Found ${projectDatabases.length} database(s) in project: ${dbNames.join(', ')}. Please configure your Database ID in Admin Settings or set APPWRITE_DATABASE_ID.`
              : 'Appwrite authenticated successfully, but no databases were found in this project. Please create a database in your Appwrite Console and enter its ID.',
          details: {
            endpoint,
            projectId,
            availableDatabases: projectDatabases.map((d) => ({
              id: d.$id,
              name: d.name,
              enabled: d.enabled,
            })),
          },
          timestamp,
        };
      }

      // 3. Verify specific database exists and is accessible
      let dbDetails: any = null;
      try {
        dbDetails = await databases.get(databaseId.trim());
      } catch (dbErr: any) {
        const dbNames = projectDatabases.map((d) => `'${d.name}' (ID: ${d.$id})`);
        return {
          success: false,
          service: 'appwrite',
          error: `Appwrite authenticated successfully, but Database ID '${databaseId}' was not found in project '${projectId}'. Available databases in project: [${dbNames.join(', ') || 'None found'}]. Error: ${dbErr.message}`,
          details: {
            endpoint,
            projectId,
            requestedDatabaseId: databaseId,
            availableDatabases: projectDatabases.map((d) => ({
              id: d.$id,
              name: d.name,
            })),
          },
          timestamp,
        };
      }

      // 4. Verify collections / tables in this database
      let collectionsList: any = { total: 0, collections: [] };
      try {
        collectionsList = await databases.listCollections(databaseId.trim());
      } catch (colErr: any) {
        // If collection listing fails (e.g. scopes), note it
      }

      const availableCollections = (collectionsList.collections || []).map((c: any) => ({
        id: c.$id,
        name: c.name,
      }));

      return {
        success: true,
        service: 'appwrite',
        message: `Connected successfully to Appwrite! Database '${dbDetails.name || databaseId}' (ID: ${databaseId}) is active with ${collectionsList.total || 0} collection(s).`,
        details: {
          endpoint,
          projectId,
          databaseId: dbDetails.$id || databaseId,
          databaseName: dbDetails.name,
          enabled: dbDetails.enabled,
          collectionsCount: collectionsList.total || 0,
          collections: availableCollections,
        },
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'appwrite',
        error: err.message || 'Failed to authenticate with Appwrite API. Please verify endpoint, Project ID, and API Key permissions.',
        timestamp,
      };
    }
  }

  /**
   * Test ImageKit Connection
   */
  static async testImageKit(options?: any): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const { ImageKitStorageService } = await import('./imagekit-storage-service');
      const overrides = {
        urlEndpoint: options?.url_endpoint || options?.urlEndpoint,
        publicKey: options?.public_key || options?.publicKey,
        privateKey: options?.private_key || options?.privateKey,
      };

      const res = await ImageKitStorageService.testConnection(overrides);
      return {
        success: res.success,
        service: 'imagekit',
        message: res.message,
        error: res.error,
        details: res.details,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'imagekit',
        error: err.message || 'ImageKit connection failed. Check Private Key and URL Endpoint.',
        timestamp,
      };
    }
  }

  /**
   * Test Tigris S3-compatible Private Storage
   */
  static async testTigris(options?: any): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const { TigrisStorageService } = await import('./tigris-storage-service');
      const overrides = {
        bucketName: options?.bucket_name || options?.bucketName,
        accessKeyId: options?.access_key_id || options?.accessKeyId,
        secretAccessKey: options?.secret_access_key || options?.secretAccessKey,
        endpoint: options?.endpoint,
        region: options?.region,
      };

      const res = (options?.uploadProbe || options?.downloadProbe)
        ? await TigrisStorageService.testUploadAndDownload(overrides)
        : await TigrisStorageService.testConnection(overrides);

      return {
        success: res.success,
        service: 'tigris',
        message: res.message,
        error: res.error,
        details: res.details,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'tigris',
        error: err.message || 'Failed to connect to Tigris. Verify Access Key ID, Secret Access Key, and Endpoint.',
        timestamp,
      };
    }
  }

  /**
   * Test Supabase Private Paid Storage (products-private bucket & signed download links)
   */
  static async testSupabaseStorage(options?: any): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const { SupabasePrivateStorageService } = await import('./supabase-private-storage-service');
      const overrides = {
        projectUrl: options?.project_url || options?.projectUrl,
        serviceRoleKey: options?.service_role_key || options?.serviceRoleKey,
        bucketName: options?.bucket_name || options?.bucketName || 'products-private',
      };

      const res = (options?.uploadProbe || options?.downloadProbe)
        ? await SupabasePrivateStorageService.testUploadAndDownload(overrides)
        : await SupabasePrivateStorageService.testConnection(overrides);

      return {
        success: res.success,
        service: 'supabase_storage',
        message: res.message,
        error: res.error,
        details: res.details,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'supabase_storage',
        error: err.message || 'Failed to connect to Supabase Storage. Verify Project URL and Service Role Key.',
        timestamp,
      };
    }
  }

  /**
   * Test Cloudflare R2 S3-compatible Private Storage (Backward-compatibility alias delegating to Tigris)
   */
  static async testCloudflareR2(options?: any): Promise<InfrastructureTestResult> {
    const res = await this.testTigris(options);
    return {
      ...res,
      service: 'cloudflare_r2',
    };
  }

  /**
   * Test Supabase Migration Source Connection
   */
  static async testSupabaseMigration(options?: any): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { InfrastructureConfigService } = await import('./infrastructure-config-service');
      const config = await InfrastructureConfigService.getSupabaseMigrationConfig(options);

      if (!config.projectUrl || !config.serviceRoleKey) {
        return {
          success: false,
          service: 'supabase_migration',
          error: 'Supabase Project URL and Service Role Key are required for migration source connection.',
          timestamp,
        };
      }

      const client = createClient(config.projectUrl, config.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Probe auth access
      const { data: usersData, error: authError } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      // Probe storage buckets
      const { data: bucketsData } = await client.storage.listBuckets();

      if (authError) {
        return {
          success: false,
          service: 'supabase_migration',
          error: `Supabase authentication failed: ${authError.message}. Ensure the Service Role Key is used.`,
          timestamp,
        };
      }

      const bucketNames = (bucketsData || []).map((b) => b.name);

      return {
        success: true,
        service: 'supabase_migration',
        message: `Connected successfully to Supabase Migration Source! Verified auth admin access (${usersData?.total || 0} users) and found ${bucketNames.length} storage bucket(s).`,
        details: {
          projectUrl: config.projectUrl,
          totalUsers: usersData?.total || 0,
          buckets: bucketNames,
        },
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'supabase_migration',
        error: err.message || 'Failed to connect to Supabase migration source.',
        timestamp,
      };
    }
  }

  /**
   * Test Resend Transactional Email
   */
  static async testResend(recipientEmail?: string): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const apiKey = await this.getCredentialServerOnly('resend', 'api_key');
      const fromEmail = (await this.getCredentialServerOnly('resend', 'from_email')) || 'info@benzwell.in';
      const fromName = (await this.getCredentialServerOnly('resend', 'from_name')) || 'BenzWell';

      if (!apiKey) {
        return {
          success: false,
          service: 'resend',
          error: 'Resend API Key is not configured.',
          timestamp,
        };
      }

      const target = recipientEmail || 'info@benzwell.in';
      const resend = new Resend(apiKey);

      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: target,
        subject: 'BenzWell Infrastructure — Resend Live Test',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #0c0d12; color: #ffffff; border-radius: 12px; border: 1px solid #27272a;">
            <h2 style="color: #38bdf8; margin: 0 0 12px 0;">BenzWell Infrastructure Test</h2>
            <p style="color: #d1d5db; font-size: 14px; line-height: 1.6;">This test email confirms that your Resend transactional email integration is functioning properly in BenzWell production.</p>
            <div style="background: #18181b; padding: 12px; border-radius: 8px; font-size: 12px; color: #a1a1aa; margin-top: 16px;">
              <strong>Sender:</strong> ${fromName} &lt;${fromEmail}&gt;<br/>
              <strong>Recipient:</strong> ${target}<br/>
              <strong>Timestamp:</strong> ${timestamp}
            </div>
          </div>
        `,
      });

      if (result.error) {
        return {
          success: false,
          service: 'resend',
          error: result.error.message,
          timestamp,
        };
      }

      return {
        success: true,
        service: 'resend',
        message: `Test email dispatched successfully to ${target} (ID: ${result.data?.id})`,
        details: {
          emailId: result.data?.id,
          recipient: target,
          from: `${fromName} <${fromEmail}>`,
        },
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'resend',
        error: err.message || 'Failed to dispatch test email via Resend.',
        timestamp,
      };
    }
  }

  /**
   * Test Razorpay Gateway
   */
  static async testRazorpay(): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const keyId = await this.getCredentialServerOnly('razorpay', 'key_id');
      const keySecret = await this.getCredentialServerOnly('razorpay', 'key_secret');

      if (!keyId || !keySecret) {
        return {
          success: false,
          service: 'razorpay',
          error: 'Razorpay Key ID and Key Secret must be configured.',
          timestamp,
        };
      }

      const rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      await rzp.orders.all({ count: 1 });

      return {
        success: true,
        service: 'razorpay',
        message: `Razorpay connection verified (${keyId.startsWith('rzp_test_') ? 'Test Mode' : 'Live Mode'})!`,
        details: {
          keyIdMasked: maskSecret(keyId, 8, 4),
          mode: keyId.startsWith('rzp_test_') ? 'test' : 'live',
        },
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'razorpay',
        error: err?.error?.description || err?.message || 'Failed to authenticate with Razorpay.',
        timestamp,
      };
    }
  }

  /**
   * Test GitHub Integration
   */
  static async testGitHub(): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const token = await this.getCredentialServerOnly('github', 'personal_access_token');

      if (!token) {
        return {
          success: false,
          service: 'github',
          error: 'GitHub Personal Access Token or OAuth Token is not configured.',
          timestamp,
        };
      }

      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'BenzWell-Platform/1.0',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          service: 'github',
          error: errorData.message || `GitHub API returned ${res.status}`,
          timestamp,
        };
      }

      const user = await res.json();
      return {
        success: true,
        service: 'github',
        message: `Connected to GitHub as @${user.login} (${user.name || user.login})`,
        details: {
          username: user.login,
          avatarUrl: user.avatar_url,
          publicRepos: user.public_repos,
          totalPrivateRepos: user.total_private_repos,
        },
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'github',
        error: err.message || 'Failed to authenticate with GitHub API.',
        timestamp,
      };
    }
  }

  /**
   * Test Vercel Deployment API
   */
  static async testVercel(): Promise<InfrastructureTestResult> {
    const timestamp = new Date().toISOString();
    try {
      const token = await this.getCredentialServerOnly('vercel', 'api_token');
      const teamId = await this.getCredentialServerOnly('vercel', 'team_id');

      if (!token) {
        return {
          success: false,
          service: 'vercel',
          error: 'Vercel API Token is not configured.',
          timestamp,
        };
      }

      const url = teamId ? `https://api.vercel.com/v2/user?teamId=${teamId}` : 'https://api.vercel.com/v2/user';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'BenzWell-Platform/1.0',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          service: 'vercel',
          error: errorData.error?.message || `Vercel API returned ${res.status}`,
          timestamp,
        };
      }

      const data = await res.json();
      return {
        success: true,
        service: 'vercel',
        message: `Connected to Vercel as ${data.user?.username || data.user?.email || 'Authenticated User'}!`,
        details: {
          username: data.user?.username,
          email: data.user?.email,
        },
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        service: 'vercel',
        error: err.message || 'Failed to connect to Vercel API.',
        timestamp,
      };
    }
  }

  /**
   * Universal runner for all services
   */
  static async testCredential(
    service: SupportedService,
    options?: any
  ): Promise<InfrastructureTestResult> {
    switch (service) {
      case 'appwrite':
        return this.testAppwrite();
      case 'imagekit':
        return this.testImageKit();
      case 'supabase_storage':
        return this.testSupabaseStorage(options);
      case 'tigris':
        return this.testTigris(options);
      case 'cloudflare_r2':
        return this.testCloudflareR2(options);
      case 'resend':
        return this.testResend(options?.recipientEmail);
      case 'razorpay':
        return this.testRazorpay();
      case 'github':
        return this.testGitHub();
      case 'vercel':
        return this.testVercel();
      case 'supabase_migration':
        return this.testSupabaseMigration(options);
      default:
        return {
          success: false,
          service,
          error: `Unsupported service tester: ${service}`,
          timestamp: new Date().toISOString(),
        };
    }
  }
}
