import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic & Admin Provisioning Route.
 * Verifies Supabase connection and ensures info@benzwell.in exists with role: 'admin'.
 * Requires server-side SUPABASE_SERVICE_ROLE_KEY to be configured in Vercel.
 */
export async function POST(req: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const adminEmail = 'info@benzwell.in';

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
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    );

    let userId = existingUser?.id;

    if (!existingUser) {
      // Create admin user in auth.users
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        user_metadata: { full_name: 'BenzWell Administrator', role: 'admin' },
      });

      if (createErr) {
        return NextResponse.json(
          { success: false, error: `Failed to create auth user: ${createErr.message}` },
          { status: 500 }
        );
      }
      userId = created.user.id;
    } else {
      // Ensure email is confirmed and metadata is admin
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
        user_metadata: { ...existingUser.user_metadata, role: 'admin' },
      });
    }

    // 2. Upsert profile with role: 'admin'
    if (userId) {
      await adminClient.from('profiles').upsert(
        {
          id: userId,
          email: adminEmail,
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
      message: `Admin account '${adminEmail}' successfully verified and provisioned with role 'admin'.`,
      userId,
      emailConfirmed: true,
      role: 'admin',
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
