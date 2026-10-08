import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBaseUrl } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as any;
  const next = requestUrl.searchParams.get('next') || '/account';

  // Determine site base URL canonical origin (always https://benzwell.in in production)
  const baseOrigin = getBaseUrl();

  const supabase = await createClient();

  // 1. Handle PKCE authorization code exchange (OAuth or Email OTP code)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const adminClient = createAdminClient();
      const user = data.user;

      // Check if profile exists to prevent overwriting admin role
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

      const targetPath = next.startsWith('/') ? next : `/${next}`;
      return NextResponse.redirect(new URL(targetPath, baseOrigin));
    }
  }

  // 2. Handle token_hash verification (email confirmation, recovery, magiclink)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error && data.user) {
      const adminClient = createAdminClient();
      const user = data.user;

      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = existingProfile?.role || 'customer';

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

      const redirectDestination = type === 'recovery' ? '/reset-password' : next;
      const targetPath = redirectDestination.startsWith('/') ? redirectDestination : `/${redirectDestination}`;
      return NextResponse.redirect(new URL(targetPath, baseOrigin));
    }
  }

  // If callback verification fails
  return NextResponse.redirect(
    new URL('/login?error=auth_callback_failed', baseOrigin)
  );
}
