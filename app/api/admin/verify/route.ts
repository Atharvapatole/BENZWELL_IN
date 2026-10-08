import { NextResponse } from 'next/server';
import { requireAdmin, AdminAuthorizationError } from '@/lib/auth/admin';

export async function GET() {
  try {
    const { user, profile } = await requireAdmin();

    return NextResponse.json({
      success: true,
      authorized: true,
      admin: {
        id: user.id,
        email: user.email,
        role: profile.role,
        is_verified: profile.is_verified,
      },
    });
  } catch (error: any) {
    if (error instanceof AdminAuthorizationError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json(
        {
          success: false,
          authorized: false,
          error: error.message,
          code: error.code,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        authorized: false,
        error: 'Internal authorization error',
      },
      { status: 500 }
    );
  }
}
