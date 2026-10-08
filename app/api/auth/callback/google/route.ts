import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InfrastructureConfigService } from '@/lib/services/infrastructure-config-service';
import { getBaseUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface GoogleIdTokenPayload {
  iss?: string;
  sub: string;
  azp?: string;
  aud?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

function parseJwtPayload(token: string): GoogleIdTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const stateParam = requestUrl.searchParams.get('state');
  const errorParam = requestUrl.searchParams.get('error');

  const baseOrigin = getBaseUrl();

  // If user cancelled Google consent screen
  if (errorParam) {
    const res = NextResponse.redirect(new URL('/login?error=cancelled', baseOrigin));
    res.cookies.delete('benzwell_oauth_state');
    return res;
  }

  // Parse state cookie to recover next redirect destination and nonce
  let next = '/account';
  let expectedNonce: string | undefined;
  const stateCookie = request.cookies.get('benzwell_oauth_state')?.value;
  if (stateCookie) {
    try {
      const decodedJson = Buffer.from(stateCookie, 'base64url').toString('utf8');
      const stateObj = JSON.parse(decodedJson);
      if (stateObj.next && typeof stateObj.next === 'string' && stateObj.next.startsWith('/')) {
        next = stateObj.next;
      }
      if (stateObj.nonce) {
        expectedNonce = stateObj.nonce;
      }
    } catch {
      // ignore parsing error
    }
  }

  const targetPath = next.startsWith('/') ? next : `/${next}`;

  if (code) {
    const config = await InfrastructureConfigService.getGoogleAuthConfig();

    // 1. Direct Google OAuth Token Exchange (Self-Hosted BenzWell flow)
    if (config.isConfigured && config.clientSecret) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const idToken = tokenData.id_token;

          if (idToken) {
            const payload = parseJwtPayload(idToken);
            const email = payload?.email?.toLowerCase().trim();
            const fullName = payload?.name || payload?.given_name || 'Customer';
            const avatarUrl = payload?.picture || null;

            if (email) {
              const supabase = await createClient();
              const adminClient = createAdminClient();

              // 1. Attempt standard signInWithIdToken
              let sessionEstablished = false;
              try {
                const { data: idTokenAuthData, error: idTokenAuthErr } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: idToken,
                  nonce: expectedNonce,
                });
                if (!idTokenAuthErr && idTokenAuthData?.user) {
                  sessionEstablished = true;
                }
              } catch (signInErr) {
                console.warn('signInWithIdToken fallback notice:', signInErr);
              }

              // 2. If signInWithIdToken is not enabled, use admin magic link session establishment
              if (!sessionEstablished) {
                // Ensure user exists in Supabase Auth
                const { data: usersList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 50 });
                let existingAuthUserId = usersList?.users?.find((u) => u.email?.toLowerCase() === email)?.id;

                if (!existingAuthUserId) {
                  const { data: newAuthUser } = await adminClient.auth.admin.createUser({
                    email,
                    email_confirm: true,
                    user_metadata: {
                      full_name: fullName,
                      avatar_url: avatarUrl,
                    },
                  });
                  existingAuthUserId = newAuthUser?.user?.id;
                }

                if (existingAuthUserId) {
                  const { data: linkData } = await adminClient.auth.admin.generateLink({
                    type: 'magiclink',
                    email,
                  });

                  const hashedToken = linkData?.properties?.hashed_token;
                  if (hashedToken) {
                    await supabase.auth.verifyOtp({
                      token_hash: hashedToken,
                      type: 'magiclink',
                    });
                  }
                }
              }

              // 3. Upsert user in profiles database
              const { data: existingProfile } = await adminClient
                .from('profiles')
                .select('id, role')
                .eq('email', email)
                .maybeSingle();

              const userRole = existingProfile?.role || 'customer';

              // Get current user id from auth
              const { data: currentUserData } = await supabase.auth.getUser();
              const authUserId = currentUserData?.user?.id || existingProfile?.id;

              if (authUserId) {
                await adminClient.from('profiles').upsert(
                  {
                    id: authUserId,
                    email,
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    role: userRole,
                    is_verified: true,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'id' }
                );
              }

              const response = NextResponse.redirect(new URL(targetPath, baseOrigin));
              response.cookies.delete('benzwell_oauth_state');
              return response;
            }
          }
        }
      } catch (directExchangeErr) {
        console.error('Direct Google token exchange error:', directExchangeErr);
      }
    }

    // 2. Fallback: Supabase PKCE Code Exchange
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        const adminClient = createAdminClient();
        const user = data.user;

        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        const userRole = existingProfile?.role || user.user_metadata?.role || 'customer';

        await adminClient.from('profiles').upsert(
          {
            id: user.id,
            email: user.email?.toLowerCase().trim() || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || null,
            role: userRole,
            is_verified: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        const response = NextResponse.redirect(new URL(targetPath, baseOrigin));
        response.cookies.delete('benzwell_oauth_state');
        return response;
      }
    } catch (supabaseExchangeErr) {
      console.error('Supabase exchangeCodeForSession error:', supabaseExchangeErr);
    }
  }

  // Redirect to login with user-friendly error
  const response = NextResponse.redirect(new URL('/login?error=google_auth_failed', baseOrigin));
  response.cookies.delete('benzwell_oauth_state');
  return response;
}
