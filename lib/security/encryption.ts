import crypto from 'crypto';

/**
 * Server-side Credential Encryption Utility using AES-256-GCM.
 * Used for securely storing API keys (Razorpay, Resend, etc.) in the database.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derive or retrieve the 32-byte master encryption key from server environment
 */
function getMasterKey(): Buffer {
  const envKey =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.BENZWELL_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'benzwell-production-secret-key-fallback-32bytes!';
  // Hash to ensure fixed 32 bytes (256 bits)
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypt a plaintext secret string (e.g. Razorpay Key Secret, Resend API Key)
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || !plaintext.trim()) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return formatted: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted secret string.
 * Returns empty string if invalid or fails decryption.
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return '';

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption failed for secret:', err);
    return '';
  }
}

/**
 * Mask a secret string for safe display to the admin (e.g. rzp_test_••••••••1234)
 */
export function maskSecret(secret: string, visibleStart = 4, visibleEnd = 4): string {
  if (!secret) return '';
  if (secret.length <= visibleStart + visibleEnd) {
    return '••••••••••••';
  }
  const start = secret.slice(0, visibleStart);
  const end = secret.slice(-visibleEnd);
  return `${start}••••••••••••${end}`;
}
