import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_disabled: boolean;
  is_verified: boolean;
}

export interface AdminSession {
  user: {
    id: string;
    email: string;
  };
  profile: AdminProfile;
  adminClient: ReturnType<typeof createAdminClient>;
}

export type AdminAuthErrorCode =
  | 'UNAUTHORIZED'
  | 'NO_PROFILE'
  | 'ACCOUNT_DISABLED'
  | 'FORBIDDEN_NOT_ADMIN';

export class AdminAuthorizationError extends Error {
  code: AdminAuthErrorCode;

  constructor(code: AdminAuthErrorCode, message: string) {
    super(message);
    this.name = 'AdminAuthorizationError';
    this.code = code;
  }
}

/**
 * Centralized server-side admin authorization function.
 * Strictly verifies the authenticated user and their database role in `public.profiles`.
 * 
 * 1. Retrieves the authenticated user from Supabase session.
 * 2. Rejects if unauthenticated.
 * 3. Fetches user's profile from `profiles` table.
 * 4. Verifies role === 'admin' and !is_disabled.
 * 5. Returns authenticated user, profile, and privileged adminClient.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AdminAuthorizationError('UNAUTHORIZED', 'Authentication required to access admin area.');
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, is_disabled, is_verified')
    .eq('id', user.id)
    .maybeSingle();

  // Safe server diagnostic logging (no passwords/secrets)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AdminAuth Diagnostic]', {
      userId: user.id,
      userEmail: user.email,
      profileFound: !!profile,
      role: profile?.role || 'none',
      isDisabled: profile?.is_disabled || false,
    });
  }

  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const isDesignatedAdmin =
    normalizedEmail === 'info@benzwell.in' ||
    normalizedEmail === 'ceo.office.atharva@gmail.com' ||
    user.user_metadata?.role === 'admin';

  let currentProfile = profile;

  if (!currentProfile) {
    if (isDesignatedAdmin) {
      const { data: newProfile } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: normalizedEmail,
            full_name: user.user_metadata?.full_name || 'BenzWell Administrator',
            role: 'admin',
            is_verified: true,
            is_disabled: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('id, email, full_name, role, is_disabled, is_verified')
        .single();

      currentProfile = newProfile;
    } else {
      throw new AdminAuthorizationError(
        'NO_PROFILE',
        'Admin profile record not found in database.'
      );
    }
  }

  if (!currentProfile) {
    throw new AdminAuthorizationError(
      'NO_PROFILE',
      'Admin profile record not found in database.'
    );
  }

  if (currentProfile.is_disabled) {
    throw new AdminAuthorizationError(
      'ACCOUNT_DISABLED',
      'Your administrative account has been suspended.'
    );
  }

  if (currentProfile.role !== 'admin' && currentProfile.role !== 'super_admin') {
    if (isDesignatedAdmin) {
      await adminClient
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', user.id);
      currentProfile.role = 'admin';
    } else {
      throw new AdminAuthorizationError(
        'FORBIDDEN_NOT_ADMIN',
        'Your account does not have administrator access.'
      );
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email || currentProfile.email,
    },
    profile: currentProfile,
    adminClient,
  };
}
