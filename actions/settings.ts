'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/security/encryption';
import { revalidatePath } from 'next/cache';
import Razorpay from 'razorpay';
import { Resend } from 'resend';

/**
 * Fetch all site settings, masking all sensitive secret keys before sending to the client
 */
export async function getAdminSettingsAction() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: rawSettings } = await supabase.from('site_settings').select('*');

  const settingsMap: Record<string, any> = {};

  (rawSettings || []).forEach((row) => {
    let val = row.value;

    // Mask sensitive fields in payments
    if (row.key === 'payments' && val) {
      val = {
        ...val,
        key_id_masked: val.key_id ? maskSecret(val.key_id, 8, 4) : '',
        key_secret_masked: val.key_secret_encrypted ? '••••••••••••••••' : '',
        webhook_secret_masked: val.webhook_secret_encrypted ? '••••••••••••••••' : '',
        has_key_secret: !!val.key_secret_encrypted,
        has_webhook_secret: !!val.webhook_secret_encrypted,
        // Remove raw encrypted strings from client payload
        key_secret_encrypted: undefined,
        webhook_secret_encrypted: undefined,
      };
    }

    // Mask sensitive fields in email
    if (row.key === 'email' && val) {
      val = {
        ...val,
        api_key_masked: val.api_key_encrypted ? '••••••••••••••••' : '',
        has_api_key: !!val.api_key_encrypted,
        api_key_encrypted: undefined,
      };
    }

    // Mask sensitive fields in auth
    if (row.key === 'auth' && val) {
      val = {
        ...val,
        client_secret_masked: val.client_secret_encrypted ? '••••••••••••••••' : '',
        has_client_secret: !!val.client_secret_encrypted,
        client_secret_encrypted: undefined,
      };
    }

    settingsMap[row.key] = val;
  });

  return { success: true, settings: settingsMap };
}

/**
 * Save settings with server-side AES-256-GCM encryption for credentials
 */
export async function saveAdminSettingsAction(category: string, formData: Record<string, any>) {
  const { user, profile } = await requireAdmin();
  const supabase = createAdminClient();

  // Retrieve existing settings for this category to preserve existing secrets if not overwritten
  const { data: existingRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', category)
    .maybeSingle();

  const existingValue = existingRow?.value || {};
  let finalValue: Record<string, any> = { ...existingValue, ...formData };

  // Handle payments encryption
  if (category === 'payments') {
    if (formData.key_secret && formData.key_secret.trim()) {
      finalValue.key_secret_encrypted = encryptSecret(formData.key_secret.trim());
    }
    if (formData.webhook_secret && formData.webhook_secret.trim()) {
      finalValue.webhook_secret_encrypted = encryptSecret(formData.webhook_secret.trim());
    }
    delete finalValue.key_secret;
    delete finalValue.webhook_secret;
  }

  // Handle email encryption
  if (category === 'email') {
    if (formData.api_key && formData.api_key.trim()) {
      finalValue.api_key_encrypted = encryptSecret(formData.api_key.trim());
    }
    delete finalValue.api_key;
  }

  // Handle auth encryption
  if (category === 'auth') {
    if (formData.client_secret && formData.client_secret.trim()) {
      finalValue.client_secret_encrypted = encryptSecret(formData.client_secret.trim());
    }
    delete finalValue.client_secret;
  }

  const { error } = await supabase.from('site_settings').upsert(
    {
      key: category,
      value: finalValue,
      category,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: 'key' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: profile.email,
    action: `UPDATE_SETTINGS_${category.toUpperCase()}`,
    entity: 'site_settings',
    entity_id: category,
    metadata: { timestamp: new Date().toISOString() },
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Server-side helper to get decrypted credentials for internal server services
 */
export async function getDecryptedCredential(category: string, field: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('site_settings').select('value').eq('key', category).maybeSingle();

  if (!data?.value) return '';

  const encryptedKey = `${field}_encrypted`;
  if (data.value[encryptedKey]) {
    return decryptSecret(data.value[encryptedKey]);
  }

  return data.value[field] || '';
}

/**
 * Test Razorpay Gateway Connection
 */
export async function testRazorpayConnectionAction() {
  await requireAdmin();

  // Try database settings first, fallback to env vars
  const supabase = createAdminClient();
  const { data: paySettings } = await supabase.from('site_settings').select('value').eq('key', 'payments').maybeSingle();

  let keyId = paySettings?.value?.key_id;
  let keySecret = paySettings?.value?.key_secret_encrypted
    ? decryptSecret(paySettings.value.key_secret_encrypted)
    : '';

  if (!keyId || !keySecret) {
    keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  if (!keyId || !keySecret) {
    return {
      success: false,
      error: 'Razorpay Key ID or Secret is not configured in settings or environment.',
    };
  }

  try {
    const rzp = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Ping orders API with limit=1 to verify credentials
    await rzp.orders.all({ count: 1 });

    return {
      success: true,
      message: `Razorpay connection verified successfully (${keyId.startsWith('rzp_test_') ? 'Test Mode' : 'Live Mode'})!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.error?.description || err?.message || 'Failed to authenticate with Razorpay API.',
    };
  }
}

/**
 * Test Resend Email Service Connection
 */
export async function testResendEmailAction(recipientEmail?: string) {
  const { user } = await requireAdmin();

  const supabase = createAdminClient();
  const { data: emailSettings } = await supabase.from('site_settings').select('value').eq('key', 'email').maybeSingle();

  let apiKey = emailSettings?.value?.api_key_encrypted
    ? decryptSecret(emailSettings.value.api_key_encrypted)
    : '';

  let fromEmail = emailSettings?.value?.from_email || 'info@benzwell.in';
  let fromName = emailSettings?.value?.from_name || 'BenzWell';

  if (!apiKey) {
    apiKey = process.env.RESEND_API_KEY || '';
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'Resend API Key is not configured in settings or environment.',
    };
  }

  const targetEmail = recipientEmail || user.email;
  if (!targetEmail) {
    return { success: false, error: 'Recipient email address is required.' };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: targetEmail,
      subject: 'BenzWell — Test Email Verification',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #0c0d12; color: #ffffff; border-radius: 12px;">
          <h2 style="color: #38bdf8; margin-bottom: 8px;">BenzWell Email Integration Test</h2>
          <p style="color: #d1d5db; font-size: 14px;">This is a live test email sent from your BenzWell Admin Settings panel via Resend.</p>
          <div style="background: #161822; padding: 12px; border-radius: 8px; font-size: 12px; color: #9ca3af; margin-top: 16px;">
            <strong>Sender:</strong> ${fromName} &lt;${fromEmail}&gt;<br/>
            <strong>Timestamp:</strong> ${new Date().toISOString()}
          </div>
        </div>
      `,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      message: `Test email successfully dispatched to ${targetEmail} (ID: ${result.data?.id})!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch test email via Resend.',
    };
  }
}

/**
 * Get Comprehensive System Status for Admin Dashboard
 */
export async function getSystemStatusAction() {
  await requireAdmin();
  const supabase = createAdminClient();

  // 1. Check Database connection
  let dbStatus = false;
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    dbStatus = !error;
  } catch {
    dbStatus = false;
  }

  // 2. Check Storage & Media (R2 / ImageKit / Supabase)
  let storageMediaPublic = false;
  let storageProductsPrivate = false;
  let r2Configured = false;
  let imageKitConfigured = false;
  let appwriteConfigured = false;

  try {
    const { InfrastructureConfigService } = await import('@/lib/services/infrastructure-config-service');
    const [r2, ik, appw] = await Promise.all([
      InfrastructureConfigService.getR2Config(),
      InfrastructureConfigService.getImageKitConfig(),
      InfrastructureConfigService.getAppwriteConfig(),
    ]);
    r2Configured = r2.isConfigured;
    imageKitConfigured = ik.isConfigured;
    appwriteConfigured = appw.isConfigured;
  } catch (infraErr) {
    console.warn('Infra config check error:', infraErr);
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketNames = (buckets || []).map((b) => b.name);
    storageMediaPublic = bucketNames.includes('media-public') || imageKitConfigured;
    storageProductsPrivate = bucketNames.includes('products-private') || r2Configured;
  } catch {
    storageMediaPublic = imageKitConfigured;
    storageProductsPrivate = r2Configured;
  }

  // 3. Check Razorpay Status
  const { data: payRow } = await supabase.from('site_settings').select('value').eq('key', 'payments').maybeSingle();
  const razorpayConfigured = !!(
    (payRow?.value?.key_id && payRow?.value?.key_secret_encrypted) ||
    (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  );

  // 4. Check Resend Status
  const { data: emailRow } = await supabase.from('site_settings').select('value').eq('key', 'email').maybeSingle();
  const resendConfigured = !!(
    emailRow?.value?.api_key_encrypted ||
    process.env.RESEND_API_KEY
  );

  // 5. Check Google OAuth Status
  const { data: authRow } = await supabase.from('site_settings').select('value').eq('key', 'auth').maybeSingle();
  const googleConfigured = !!(
    (authRow?.value?.client_id && authRow?.value?.client_secret_encrypted) ||
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  );

  return {
    success: true,
    status: {
      supabase: true,
      database: dbStatus,
      storage: (storageMediaPublic || imageKitConfigured) && (storageProductsPrivate || r2Configured),
      storageMediaPublic,
      storageProductsPrivate,
      cloudflareR2: r2Configured,
      imageKit: imageKitConfigured,
      appwrite: appwriteConfigured,
      razorpay: razorpayConfigured,
      resend: resendConfigured,
      googleAuth: googleConfigured,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in',
      emailDomain: 'benzwell.in',
    },
  };
}
