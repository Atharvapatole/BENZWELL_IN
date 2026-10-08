import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CredentialService } from '@/lib/services/credential-service';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Verify Appwrite Webhook Signature
 * Appwrite passes signature in `x-appwrite-webhook-signature` or `x-appwrite-webhook-token`.
 * Uses HMAC signature verification.
 */
function verifyAppwriteSignature(
  rawBody: string,
  url: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!secret || !signatureHeader) return false;

  try {
    // Check HMAC-SHA256
    const hmac256 = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(hmac256), Buffer.from(signatureHeader))) {
      return true;
    }

    // Check HMAC-SHA1 (url + rawBody) as per some Appwrite versions
    const hmac1 = crypto.createHmac('sha1', secret).update(`${url}${rawBody}`).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(hmac1), Buffer.from(signatureHeader))) {
      return true;
    }

    // Check direct rawBody sha1
    const hmac1Raw = crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(hmac1Raw), Buffer.from(signatureHeader))) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-appwrite-webhook-signature') || req.headers.get('x-appwrite-webhook-token');
    const webhookEvents = req.headers.get('x-appwrite-webhook-events') || 'unknown';
    const projectId = req.headers.get('x-appwrite-webhook-project-id');
    const webhookId = req.headers.get('x-appwrite-webhook-id');

    const webhookSecret = await CredentialService.getCredentialServerOnly('appwrite', 'webhook_secret');
    const fullUrl = req.nextUrl.toString();

    let isVerified = false;
    if (webhookSecret) {
      isVerified = verifyAppwriteSignature(rawBody, fullUrl, signature, webhookSecret);
    } else {
      // If secret not configured, accept with unverified warning for initial connection tests
      isVerified = true;
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { raw: rawBody };
    }

    const supabase = createAdminClient();

    // Record webhook into audit_logs
    await supabase.from('audit_logs').insert({
      action: `APPWRITE_WEBHOOK_${webhookEvents.toUpperCase().replace(/\./g, '_')}`,
      entity: 'webhook_appwrite',
      entity_id: webhookId || projectId || 'appwrite-event',
      metadata: {
        event: webhookEvents,
        projectId,
        webhookId,
        signatureVerified: isVerified,
        status: isVerified ? 'processed' : 'signature_mismatch',
        receivedAt: new Date().toISOString(),
        payloadSummary: {
          id: payload?.$id || payload?.id,
          collectionId: payload?.$collectionId,
          databaseId: payload?.$databaseId,
        },
      },
    });

    if (webhookSecret && !isVerified) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Appwrite webhook received and processed',
      event: webhookEvents,
      signatureVerified: isVerified,
    });
  } catch (err: any) {
    console.error('[Appwrite Webhook Error]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/appwrite',
    supportedEvents: [
      'account.create',
      'account.update',
      'user.create',
      'user.update',
      'token.create',
      'databases.*.collections.*.documents.*.create',
      'databases.*.collections.*.documents.*.update',
      'databases.*.collections.*.documents.*.delete',
    ],
  });
}
