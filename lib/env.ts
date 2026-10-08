/**
 * Centralized Safe Environment Configuration & Validation Module for BenzWell.
 * Strictly separates Public variables (NEXT_PUBLIC_*) from Server-Only Secrets.
 * Prevents build crashes while ensuring clear diagnostic errors when runtime services are accessed.
 */

// -----------------------------------------------------------------------------
// Public Variables (Safe to expose to client-side components)
// -----------------------------------------------------------------------------
export interface PublicConfig {
  siteUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  imagekitUrlEndpoint: string;
  imagekitPublicKey: string;
  razorpayKeyId: string;
  ga4MeasurementId?: string;
  metaPixelId?: string;
  gtmContainerId?: string;
}

// -----------------------------------------------------------------------------
// Server-Only Secrets (MUST NEVER BE EXPOSED TO CLIENT-SIDE)
// -----------------------------------------------------------------------------
export interface ServerSecrets {
  // Appwrite (Application Database & Free Tool Deployments)
  appwriteEndpoint: string;
  appwriteProjectId: string;
  appwriteApiKey: string;
  appwriteDatabaseId: string;
  appwriteWebhookSecret?: string;

  // Supabase (Private Storage & Server-Side Auth Admin)
  supabaseServiceRoleKey: string;
  supabasePrivateBucket: string;

  // ImageKit (Server Uploads & Asset Management)
  imagekitPrivateKey: string;
  imagekitWebhookSecret?: string;

  // Resend (Transactional Emails)
  resendApiKey: string;
  resendFromEmail: string;
  resendFromName: string;
  resendReplyTo: string;

  // Razorpay (Payment Processing & Webhooks)
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;

  // Database Encryption Key
  credentialEncryptionKey: string;

  // Google OAuth Credentials
  googleClientId?: string;
  googleClientSecret?: string;

  // GitHub & Deployments
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;

  // AI Providers
  groqApiKey?: string;
  mistralApiKey?: string;
  geminiApiKey?: string;

  // Admin Notification Recipient
  adminNotificationEmail: string;
}

/**
 * Get Public Configuration (Safe for Client & Server)
 */
export function getPublicEnv(): PublicConfig {
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      '',
    imagekitUrlEndpoint:
      process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
      process.env.IMAGEKIT_URL_ENDPOINT ||
      '',
    imagekitPublicKey:
      process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
      process.env.IMAGEKIT_PUBLIC_KEY ||
      '',
    razorpayKeyId:
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      '',
    ga4MeasurementId:
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_GA_ID,
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    gtmContainerId:
      process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ||
      process.env.NEXT_PUBLIC_GTM_ID,
  };
}

/**
 * Get Server-Side Configuration & Secrets (Server-Only execution)
 */
export function getServerEnv(): ServerSecrets {
  if (typeof window !== 'undefined') {
    throw new Error('[Security Exception] Server environment secrets accessed on client-side!');
  }

  return {
    // Appwrite
    appwriteEndpoint:
      process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      'https://cloud.appwrite.io/v1',
    appwriteProjectId:
      process.env.APPWRITE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      '',
    appwriteApiKey:
      process.env.APPWRITE_API_KEY ||
      process.env.APPWRITE_API_SECRET ||
      '',
    appwriteDatabaseId:
      process.env.APPWRITE_DATABASE_ID ||
      '',
    appwriteWebhookSecret: process.env.APPWRITE_WEBHOOK_SECRET,

    // Supabase
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabasePrivateBucket: process.env.SUPABASE_PRIVATE_BUCKET || 'products-private',

    // ImageKit
    imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    imagekitWebhookSecret: process.env.IMAGEKIT_WEBHOOK_SECRET,

    // Resend
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'info@benzwell.in',
    resendFromName: process.env.RESEND_FROM_NAME || 'BenzWell',
    resendReplyTo: process.env.RESEND_REPLY_TO || 'info@benzwell.in',

    // Razorpay
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

    // Encryption
    credentialEncryptionKey:
      process.env.CREDENTIAL_ENCRYPTION_KEY ||
      process.env.BENZWELL_CREDENTIAL_ENCRYPTION_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '',

    // Google OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

    // GitHub
    githubToken: process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
    githubOwner: process.env.GITHUB_OWNER || 'Atharvapatole',
    githubRepo: process.env.GITHUB_REPO || 'Benzwell.in',

    // AI Providers
    groqApiKey: process.env.GROQ_API_KEY,
    mistralApiKey: process.env.MISTRAL_API_KEY,
    geminiApiKey:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY,

    // Admin
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'ceo.office.atharva@gmail.com',
  };
}

/**
 * Diagnostic Service Readiness Checkers
 */
export const envStatus = {
  isSupabaseConfigured(): boolean {
    const pub = getPublicEnv();
    const srv = typeof window === 'undefined' ? getServerEnv() : null;
    return !!(pub.supabaseUrl && pub.supabaseAnonKey && (!srv || srv.supabaseServiceRoleKey));
  },
  isAppwriteConfigured(): boolean {
    if (typeof window !== 'undefined') return false;
    const srv = getServerEnv();
    return !!(srv.appwriteProjectId && srv.appwriteApiKey && srv.appwriteDatabaseId);
  },
  isImageKitConfigured(): boolean {
    const pub = getPublicEnv();
    const srv = typeof window === 'undefined' ? getServerEnv() : null;
    return !!(pub.imagekitUrlEndpoint && pub.imagekitPublicKey && (!srv || srv.imagekitPrivateKey));
  },
  isResendConfigured(): boolean {
    if (typeof window !== 'undefined') return false;
    const srv = getServerEnv();
    return !!srv.resendApiKey;
  },
  isRazorpayConfigured(): boolean {
    if (typeof window !== 'undefined') return false;
    const srv = getServerEnv();
    return !!(srv.razorpayKeyId && srv.razorpayKeySecret);
  },
};
