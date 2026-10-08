import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit numerical OTP
 */
export function generateSecureOTP(): string {
  const buffer = crypto.randomBytes(4);
  const randomNumber = buffer.readUInt32BE(0);
  const otp = (randomNumber % 900000) + 100000;
  return otp.toString();
}

/**
 * Hash an OTP with sha256 to ensure we never store raw plaintext OTPs
 */
export function hashOTP(otp: string, email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'benzwell-otp-salt';
  return crypto
    .createHmac('sha256', secret)
    .update(`${otp}:${email.toLowerCase().trim()}`)
    .digest('hex');
}

/**
 * Constant time comparison to prevent timing attacks
 */
export function verifyHashedOTP(inputOtp: string, email: string, storedHash: string): boolean {
  const computedHash = hashOTP(inputOtp, email);
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'utf-8'),
    Buffer.from(storedHash, 'utf-8')
  );
}

/**
 * Generate a secure random token for sessions/downloads
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
