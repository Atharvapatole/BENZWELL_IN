import { NextRequest, NextResponse } from 'next/server';
import { InfrastructureConfigService } from '@/lib/services/infrastructure-config-service';
import { getBaseUrl } from '@/lib/utils';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get('next') || '/account';

  // Sanitize next parameter to prevent open redirect vulnerabilities
  let safeNext = '/account';
  if (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')) {
    safeNext = rawNext;
  }

  const baseUrl = getBaseUrl();
  const config = await InfrastructureConfigService.getGoogleAuthConfig();

  // 1. Direct BenzWell-branded Google OAuth (Custom domain flow)
  if (config.clientId) {
    const state = crypto.randomBytes(24).toString('hex');
    const nonce = crypto.randomBytes(24).toString('hex');

    const statePayload = JSON.stringify({
      state,
      next: safeNext,
      nonce,
      ts: Date.now(),
    });

    const encodedStateCookie = Buffer.from(statePayload).toString('base64url');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', config.clientId);
    googleAuthUrl.searchParams.set('redirect_uri', config.redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('nonce', nonce);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    const response = NextResponse.redirect(googleAuthUrl.toString());

    // Set secure HTTP-only state cookie
    response.cookies.set('benzwell_oauth_state', encodedStateCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  }

  // 2. Fallback to Supabase OAuth if Google credentials are not yet configured in settings
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const supabaseAuthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
    supabaseAuthUrl.searchParams.set('provider', 'google');
    supabaseAuthUrl.searchParams.set('redirect_to', `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`);

    return NextResponse.redirect(supabaseAuthUrl.toString());
  }

  return NextResponse.redirect(
    new URL('/login?error=google_auth_failed', baseUrl)
  );
}
