import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret } from '@/lib/security/encryption';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export async function getRazorpayCredentials(): Promise<RazorpayConfig> {
  const supabase = createAdminClient();
  const { data: row } = await supabase.from('site_settings').select('value').eq('key', 'payments').maybeSingle();

  let keyId = row?.value?.key_id;
  let keySecret = row?.value?.key_secret_encrypted
    ? decryptSecret(row.value.key_secret_encrypted)
    : '';
  let webhookSecret = row?.value?.webhook_secret_encrypted
    ? decryptSecret(row.value.webhook_secret_encrypted)
    : '';

  if (!keyId || !keySecret) {
    keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  if (!webhookSecret) {
    webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  return { keyId, keySecret, webhookSecret };
}

export async function getRazorpayClient(): Promise<Razorpay | null> {
  const { keyId, keySecret } = await getRazorpayCredentials();

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Verify Razorpay payment signature received from client after checkout
 */
export async function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret } = await getRazorpayCredentials();
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}

/**
 * Verify Razorpay Webhook signature using raw request body
 */
export async function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): Promise<boolean> {
  const { webhookSecret } = await getRazorpayCredentials();
  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}
