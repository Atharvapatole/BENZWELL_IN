'use server';

import { requireAdmin } from '@/lib/auth/admin';
import { CredentialService, SupportedService, InfrastructureTestResult } from '@/lib/services/credential-service';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Fetch masked infrastructure settings for all enterprise services.
 * All sensitive keys are strictly masked ('••••••••') and unencrypted secrets are never sent to client.
 */
export async function getInfrastructureConfigAction() {
  await requireAdmin();

  const services: SupportedService[] = [
    'appwrite',
    'imagekit',
    'tigris',
    'cloudflare_r2',
    'resend',
    'razorpay',
    'github',
    'vercel',
    'supabase_migration',
  ];

  const configs: Record<string, any> = {};
  for (const s of services) {
    configs[s] = await CredentialService.getMaskedCredential(s);
  }

  // Get last Appwrite webhook event from audit_logs
  const supabase = createAdminClient();
  const { data: lastWebhook } = await supabase
    .from('audit_logs')
    .select('created_at, action, metadata')
    .eq('entity', 'webhook_appwrite')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    success: true,
    configs,
    lastAppwriteWebhook: lastWebhook
      ? {
          timestamp: lastWebhook.created_at,
          event: lastWebhook.metadata?.event || lastWebhook.action,
          status: lastWebhook.metadata?.status || 'received',
          signatureVerified: !!lastWebhook.metadata?.signatureVerified,
        }
      : null,
  };
}

/**
 * Save configuration for a specific infrastructure service with AES-256-GCM encryption.
 */
export async function saveInfrastructureConfigAction(
  service: SupportedService,
  formData: Record<string, any>
) {
  const { user } = await requireAdmin();

  const result = await CredentialService.saveCredential(service, formData, user.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/admin/settings/infrastructure');
  revalidatePath('/admin/settings');

  return { success: true };
}

/**
 * Run a live diagnostic connection test for a service
 */
export async function testInfrastructureServiceAction(
  service: SupportedService,
  options?: any
): Promise<InfrastructureTestResult> {
  await requireAdmin();
  return CredentialService.testCredential(service, options);
}

/**
 * Delete a specific credential field from database
 */
export async function deleteInfrastructureSecretAction(
  service: SupportedService,
  field: string
) {
  const { user } = await requireAdmin();
  const result = await CredentialService.deleteCredential(service, field, user.id);

  revalidatePath('/admin/settings/infrastructure');
  return result;
}

/**
 * Unified health summary of all services
 */
export async function getInfrastructureHealthSummaryAction() {
  await requireAdmin();

  const services: SupportedService[] = [
    'appwrite',
    'imagekit',
    'tigris',
    'resend',
    'razorpay',
    'github',
    'vercel',
    'supabase_migration',
  ];

  const results: Record<string, { configured: boolean; lastTested?: string; status: 'connected' | 'unconfigured' | 'error' | 'pending' }> = {};

  for (const service of services) {
    const masked = await CredentialService.getMaskedCredential(service);
    const hasValues = Object.keys(masked).some((k) => k.startsWith('has_') ? masked[k] : !!masked[k]);

    results[service] = {
      configured: hasValues,
      status: hasValues ? 'connected' : 'unconfigured',
    };
  }

  return { success: true, health: results };
}
