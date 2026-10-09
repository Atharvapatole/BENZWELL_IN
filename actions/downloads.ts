'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabasePrivateStorageService } from '@/lib/services/supabase-private-storage-service';

export interface DownloadUrlResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

/**
 * Internal helper to resolve deliverable file across product_files and product metadata fallbacks,
 * generating short-lived signed URLs from Supabase Private Storage (products-private).
 */
async function resolveAndSignProductDownload(
  adminClient: any,
  productId: string,
  productData?: any,
  fileId?: string,
  expiresInSeconds: number = 300
): Promise<{ success: boolean; signedUrl?: string; filename?: string; error?: string }> {
  let targetPath = '';
  let filename = `${productData?.slug || 'benzwell-download'}.pdf`;

  // 0. Check external URL delivery first
  const externalUrl =
    productData?.external_download_url ||
    (typeof productData?.file_info === 'object' ? productData?.file_info?.external_download_url : null);
  const deliveryType =
    productData?.delivery_type ||
    (typeof productData?.file_info === 'object' ? productData?.file_info?.delivery_type : null) ||
    (externalUrl ? 'external_url' : 'upload');

  if (
    (deliveryType === 'external_url' && externalUrl) ||
    (externalUrl && (externalUrl.startsWith('http://') || externalUrl.startsWith('https://')))
  ) {
    return {
      success: true,
      signedUrl: externalUrl,
      filename: `${productData?.slug || 'product'}-download`,
    };
  }

  // 1. Query product_files table
  let fileQuery = adminClient.from('product_files').select('*').eq('product_id', productId);
  if (fileId) {
    fileQuery = fileQuery.eq('id', fileId);
  } else {
    fileQuery = fileQuery.order('created_at', { ascending: false }).limit(1);
  }

  const { data: files } = await fileQuery;
  const file = files?.[0];

  if (file && file.storage_path) {
    targetPath = file.storage_path;
    filename = file.original_filename || filename;
  } else if (productData) {
    // 2. Fallback to product JSON / column metadata
    const fileInfo = typeof productData.file_info === 'object' && productData.file_info !== null ? productData.file_info : null;
    if (fileInfo?.storage_path || fileInfo?.file_path || fileInfo?.path) {
      targetPath = fileInfo.storage_path || fileInfo.file_path || fileInfo.path;
      filename = fileInfo.original_filename || fileInfo.file_name || `${productData.slug || 'product'}.pdf`;
    } else if (fileInfo?.file_url || fileInfo?.url || productData.product_file_url || productData.file_path || productData.download_url) {
      const urlOrPath = fileInfo?.file_url || fileInfo?.url || productData.product_file_url || productData.file_path || productData.download_url;
      if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://'))) {
        return { success: true, signedUrl: urlOrPath, filename: `${productData.slug || 'product'}.pdf` };
      } else if (typeof urlOrPath === 'string' && urlOrPath.length > 0) {
        targetPath = urlOrPath;
        filename = `${productData.slug || 'product'}.pdf`;
      }
    }
  }

  if (!targetPath) {
    return {
      success: false,
      error: 'Product digital files are currently being updated. Please contact support.',
    };
  }

  // If targetPath is already an external URL
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    return { success: true, signedUrl: targetPath, filename };
  }

  // 3. Generate signed download URL via SupabasePrivateStorageService
  const cleanPath = targetPath
    .replace(/^products-private\//, '')
    .replace(/^product-files\//, '')
    .replace(/^\/+/, '');

  const signRes = await SupabasePrivateStorageService.createPresignedDownloadUrl({
    storageKey: cleanPath,
    downloadFilename: filename,
    expiresInSeconds,
  });

  if (!signRes.success || !signRes.downloadUrl) {
    console.error('Supabase signed URL generation error:', signRes.error, { targetPath, cleanPath });
    return { success: false, error: 'Could not generate secure download link from storage.' };
  }

  return {
    success: true,
    signedUrl: signRes.downloadUrl,
    filename: signRes.filename || filename,
  };
}

/**
 * Generate a short-lived (5-minute / 300s) signed Supabase Storage URL
 * from the private bucket for a customer's purchased digital asset.
 */
export async function getSecureDownloadUrl(
  entitlementId: string,
  fileId?: string
): Promise<DownloadUrlResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required. Please sign in to download.' };
  }

  const adminClient = createAdminClient();

  // 1. Fetch customer entitlement and verify ownership
  const { data: entitlement, error: entError } = await adminClient
    .from('customer_entitlements')
    .select('*, products(*)')
    .eq('id', entitlementId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (entError || !entitlement) {
    return { success: false, error: 'Access denied: Valid purchase entitlement not found.' };
  }

  // 2. Check expiration date
  if (entitlement.expires_at && new Date() > new Date(entitlement.expires_at)) {
    return { success: false, error: 'Download access period has expired for this product.' };
  }

  // 3. Check download limit
  if (entitlement.download_limit && entitlement.downloads_used >= entitlement.download_limit) {
    return {
      success: false,
      error: `Download limit of ${entitlement.download_limit} downloads reached for this product.`,
    };
  }

  // 4. Resolve file and generate signed URL
  const signRes = await resolveAndSignProductDownload(
    adminClient,
    entitlement.product_id,
    entitlement.products,
    fileId,
    300
  );

  if (!signRes.success || !signRes.signedUrl) {
    return { success: false, error: signRes.error || 'Could not generate download link.' };
  }

  // 5. Record download audit log & increment downloads_used
  await adminClient.from('downloads').insert({
    entitlement_id: entitlement.id,
    user_id: user.id,
    product_id: entitlement.product_id,
  });

  await adminClient
    .from('customer_entitlements')
    .update({
      downloads_used: (entitlement.downloads_used || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entitlement.id);

  // 6. Update order claimed_at and fulfillment/delivery status
  if (entitlement.order_id) {
    await adminClient
      .from('orders')
      .update({
        claimed_at: new Date().toISOString(),
        fulfillment_status: 'claimed',
        delivery_status: 'claimed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', entitlement.order_id)
      .is('claimed_at', null);
  }

  return {
    success: true,
    downloadUrl: signRes.signedUrl,
    filename: signRes.filename,
  };
}

/**
 * Fetch all entitlements for the authenticated customer with attached product files
 */
export async function getCustomerPurchasesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required', entitlements: [] };
  }

  const adminClient = createAdminClient();

  const { data: entitlements, error } = await adminClient
    .from('customer_entitlements')
    .select('*, products(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !entitlements) {
    return { success: false, error: error?.message, entitlements: [] };
  }

  const productIds = entitlements.map((e) => e.product_id).filter(Boolean);

  const { data: files } = await adminClient
    .from('product_files')
    .select('*')
    .in('product_id', productIds)
    .order('created_at', { ascending: true });

  const filesByProduct = (files || []).reduce((acc: any, f: any) => {
    if (!acc[f.product_id]) acc[f.product_id] = [];
    acc[f.product_id].push(f);
    return acc;
  }, {});

  const enriched = entitlements.map((ent) => ({
    ...ent,
    files: filesByProduct[ent.product_id] || [],
  }));

  return { success: true, entitlements: enriched };
}

/**
 * Generate a short-lived signed Supabase Storage URL
 * using a valid temporary 5-minute fulfillment token.
 * After 5 minutes, this function will reject requests.
 */
export async function getSecureDownloadUrlByToken({
  token,
  fileId,
  entitlementId,
}: {
  token: string;
  fileId?: string;
  entitlementId?: string;
}): Promise<DownloadUrlResult> {
  if (!token) {
    return { success: false, error: 'Temporary download token is required.' };
  }

  const adminClient = createAdminClient();

  // 1. Look up fulfillment token in database
  const { data: tokenRecord, error: tokenError } = await adminClient
    .from('order_fulfillment_tokens')
    .select('*, orders(*)')
    .eq('token', token)
    .maybeSingle();

  if (tokenError || !tokenRecord || !tokenRecord.orders) {
    return { success: false, error: 'Invalid or missing download link token.' };
  }

  // 2. Check 5-minute expiry
  const now = new Date();
  const expiresAt = new Date(tokenRecord.expires_at);
  if (now > expiresAt) {
    return {
      success: false,
      error: 'This temporary download link has expired (5-minute limit). Please log in to Account → My Downloads to access your permanent download.',
    };
  }

  const order = tokenRecord.orders;

  // 3. Find matching customer entitlement
  let entQuery = adminClient
    .from('customer_entitlements')
    .select('*, products(*)')
    .eq('order_id', order.id)
    .eq('is_active', true);

  if (entitlementId) {
    entQuery = entQuery.eq('id', entitlementId);
  }

  const { data: entitlements, error: entError } = await entQuery;
  const entitlement = entitlements?.[0];

  if (entError || !entitlement) {
    return { success: false, error: 'Valid purchase entitlement not found for this order.' };
  }

  // Check download limits on entitlement
  if (entitlement.download_limit && entitlement.downloads_used >= entitlement.download_limit) {
    return {
      success: false,
      error: `Download limit of ${entitlement.download_limit} reached for this product.`,
    };
  }

  // 4. Resolve file and generate signed URL (valid for 300s)
  const signRes = await resolveAndSignProductDownload(
    adminClient,
    entitlement.product_id,
    entitlement.products,
    fileId,
    300
  );

  if (!signRes.success || !signRes.signedUrl) {
    return { success: false, error: signRes.error || 'Could not generate download link.' };
  }

  // 5. Record download audit log & increment downloads_used
  await adminClient.from('downloads').insert({
    entitlement_id: entitlement.id,
    user_id: order.user_id,
    product_id: entitlement.product_id,
  });

  await adminClient
    .from('customer_entitlements')
    .update({
      downloads_used: (entitlement.downloads_used || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entitlement.id);

  // 6. Update order claimed_at and fulfillment/delivery status
  await adminClient
    .from('orders')
    .update({
      claimed_at: new Date().toISOString(),
      fulfillment_status: 'claimed',
      delivery_status: 'claimed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .is('claimed_at', null);

  return {
    success: true,
    downloadUrl: signRes.signedUrl,
    filename: signRes.filename,
  };
}
