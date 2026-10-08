import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'info@benzwell.in';

/**
 * GET: Safe non-destructive diagnostic check for Supabase Auth connection & Admin status.
 * Returns health status without leaking any secrets or credentials.
 */
export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json(
        {
          healthy: false,
          supabaseConnected: false,
          error: `Supabase Auth connection check failed: ${listErr.message}. Verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.`,
        },
        { status: 500 }
      );
    }

    const adminUser = (usersData?.users || []).find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

    let profileRole: string | null = null;
    if (adminUser) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', adminUser.id)
        .single();
      profileRole = profile?.role || null;
    }

    return NextResponse.json({
      healthy: true,
      supabaseConnected: true,
      adminEmail: ADMIN_EMAIL,
      adminUserExists: Boolean(adminUser),
      emailConfirmed: Boolean(adminUser?.email_confirmed_at),
      profileRole: profileRole || (adminUser ? 'admin (pending profile sync)' : 'none'),
      authConfigured: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        healthy: false,
        supabaseConnected: false,
        error: err?.message || 'Supabase Auth diagnostic check failed.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Diagnostic & Admin Provisioning Route.
 * Verifies Supabase connection and ensures info@benzwell.in exists with role: 'admin'.
 * Can optionally accept a password in the request body to set/update the admin password securely.
 */
export async function POST(req: NextRequest) {
  try {
    const adminClient = createAdminClient();

    let requestPassword: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.password === 'string' && body.password.length >= 6) {
        requestPassword = body.password;
      }
    } catch {
      // Body may be empty if called without JSON
    }

    const passwordToSet = requestPassword || process.env.ADMIN_INITIAL_PASSWORD;

    // 1. Check if user exists in auth.users
    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json(
        {
          success: false,
          error: `Supabase Auth admin access failed: ${listErr.message}. Verify SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in Vercel.`,
        },
        { status: 500 }
      );
    }

    const existingUser = (usersData?.users || []).find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

    let userId = existingUser?.id;

    if (!existingUser) {
      // Create admin user in auth.users
      const createParams: {
        email: string;
        email_confirm: boolean;
        user_metadata: { full_name: string; role: string };
        password?: string;
      } = {
        email: ADMIN_EMAIL,
        email_confirm: true,
        user_metadata: { full_name: 'BenzWell Administrator', role: 'admin' },
      };

      if (passwordToSet) {
        createParams.password = passwordToSet;
      }

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser(createParams);

      if (createErr) {
        return NextResponse.json(
          { success: false, error: `Failed to create auth user: ${createErr.message}` },
          { status: 500 }
        );
      }
      userId = created.user.id;
    } else {
      // Ensure email is confirmed and metadata is admin
      const updateParams: {
        email_confirm: boolean;
        user_metadata: Record<string, any>;
        password?: string;
      } = {
        email_confirm: true,
        user_metadata: { ...existingUser.user_metadata, role: 'admin' },
      };

      if (passwordToSet) {
        updateParams.password = passwordToSet;
      }

      await adminClient.auth.admin.updateUserById(existingUser.id, updateParams);
    }

    // 2. Upsert profile with role: 'admin'
    if (userId) {
      await adminClient.from('profiles').upsert(
        {
          id: userId,
          email: ADMIN_EMAIL,
          full_name: 'BenzWell Administrator',
          role: 'admin',
          is_verified: true,
          is_disabled: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Admin account '${ADMIN_EMAIL}' successfully provisioned and verified with role 'admin'.`,
      userId,
      emailConfirmed: true,
      role: 'admin',
      passwordUpdated: Boolean(passwordToSet),
    });
  } catch (err: any) {
    console.error('[Admin Setup Route Error]', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Admin provisioning failed. Please verify Supabase environment variables in Vercel.',
      },
      { status: 500 }
    );
  }
}
