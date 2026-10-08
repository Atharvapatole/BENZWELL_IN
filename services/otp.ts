import { createAdminClient } from '@/lib/supabase/admin';
import { generateSecureOTP, hashOTP, verifyHashedOTP } from '@/lib/crypto';
import { sendVerificationEmail } from '@/lib/email/resend';

export interface RequestOTPResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
}

export interface VerifyOTPResult {
  success: boolean;
  message: string;
}

/**
 * Generate, store hashed OTP and send verification email
 */
export async function requestVerificationOTP({
  email,
  customerName = 'Customer',
  type = 'email_verification',
}: {
  email: string;
  customerName?: string;
  type?: 'email_verification' | 'password_reset' | 'login';
}): Promise<RequestOTPResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createAdminClient();

  // 1. Check cooldown: Has an OTP been generated within the last 60 seconds?
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recentOtp } = await supabase
    .from('otp_verifications')
    .select('id, created_at')
    .eq('email', normalizedEmail)
    .eq('type', type)
    .gt('created_at', sixtySecondsAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (recentOtp) {
    const elapsed = Math.floor((Date.now() - new Date(recentOtp.created_at).getTime()) / 1000);
    const remaining = Math.max(1, 60 - elapsed);
    return {
      success: false,
      message: `Please wait ${remaining} seconds before requesting a new code.`,
      cooldownSeconds: remaining,
    };
  }

  // 2. Generate 6-digit OTP and compute hash
  const otpCode = generateSecureOTP();
  const otpHash = hashOTP(otpCode, normalizedEmail);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

  // 3. Store in database
  const { error: insertError } = await supabase.from('otp_verifications').insert({
    email: normalizedEmail,
    otp_hash: otpHash,
    type,
    attempts: 0,
    max_attempts: 5,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Failed to store OTP verification:', insertError);
    return { success: false, message: 'Failed to generate verification code. Please try again.' };
  }

  // 4. Send email via Resend
  const emailRes = await sendVerificationEmail({
    email: normalizedEmail,
    customerName,
    otpCode,
  });

  if (!emailRes.success) {
    // If email fails in dev/preview or unconfigured domain, log securely
    console.warn(`[OTP Dispatch] For ${normalizedEmail}, OTP is: ${otpCode} (Email error: ${emailRes.error})`);
  }

  return {
    success: true,
    message: 'Verification code sent to your email address.',
    cooldownSeconds: 60,
  };
}

/**
 * Verify OTP against stored hash with attempt limit & expiry checks
 */
export async function verifyUserOTP({
  email,
  otp,
  type = 'email_verification',
}: {
  email: string;
  otp: string;
  type?: 'email_verification' | 'password_reset' | 'login';
}): Promise<VerifyOTPResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createAdminClient();

  // Find latest active OTP record for email
  const { data: record, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('type', type)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !record) {
    return { success: false, message: 'No active verification code found. Please request a new code.' };
  }

  // Check expiration
  if (new Date() > new Date(record.expires_at)) {
    return { success: false, message: 'Verification code has expired. Please request a new one.' };
  }

  // Check max attempts
  if (record.attempts >= record.max_attempts) {
    return {
      success: false,
      message: 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  // Verify hash
  const isValid = verifyHashedOTP(otp.trim(), normalizedEmail, record.otp_hash);

  if (!isValid) {
    // Increment attempts
    await supabase
      .from('otp_verifications')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);

    const remainingAttempts = record.max_attempts - (record.attempts + 1);
    return {
      success: false,
      message: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Code locked.'}`,
    };
  }

  // Mark OTP as verified
  await supabase
    .from('otp_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', record.id);

  // Mark user profile as verified
  await supabase
    .from('profiles')
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq('email', normalizedEmail);

  return { success: true, message: 'Email verified successfully!' };
}
