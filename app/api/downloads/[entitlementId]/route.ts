import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabasePrivateStorageService } from '@/lib/services/supabase-private-storage-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entitlementId: string }> }
) {
  const { entitlementId } = await params;
  const fileId = req.nextUrl.searchParams.get('fileId') || undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
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
    return NextResponse.json(
      { error: 'Access denied: Valid purchase entitlement not found.' },
      { status: 403 }
    );
  }

  // 2. Check download limit
  if (entitlement.download_limit && entitlement.downloads_used >= entitlement.download_limit) {
    return NextResponse.json(
      { error: `Download limit of ${entitlement.download_limit} has been reached.` },
      { status: 429 }
    );
  }

  // 3. Resolve file and generate 5-minute signed Supabase Storage URL
  let targetPath = '';
  let filename = `${entitlement.products?.slug || 'benzwell-download'}.pdf`;

  const prod = entitlement.products;
  const externalUrl =
    prod?.external_download_url ||
    (typeof prod?.file_info === 'object' ? prod?.file_info?.external_download_url : null);
  const deliveryType =
    prod?.delivery_type ||
    (typeof prod?.file_info === 'object' ? prod?.file_info?.delivery_type : null) ||
    (externalUrl ? 'external_url' : 'upload');

  if (
    (deliveryType === 'external_url' && externalUrl) ||
    (externalUrl && (externalUrl.startsWith('http://') || externalUrl.startsWith('https://')))
  ) {
    targetPath = externalUrl;
    filename = `${prod?.slug || 'product'}-download`;
  } else {
    let fileQuery = adminClient.from('product_files').select('*').eq('product_id', entitlement.product_id);
    if (fileId) {
      fileQuery = fileQuery.eq('id', fileId);
    } else {
      fileQuery = fileQuery.order('created_at', { ascending: false }).limit(1);
    }

    const { data: fileRows } = await fileQuery;
    const file = fileRows?.[0];

    if (file && file.storage_path) {
      targetPath = file.storage_path;
      filename = file.original_filename || filename;
    } else if (entitlement.products) {
      const productData = entitlement.products;
      const fileInfo = typeof productData.file_info === 'object' && productData.file_info !== null ? productData.file_info : null;
      if (fileInfo?.storage_path || fileInfo?.file_path || fileInfo?.path) {
        targetPath = fileInfo.storage_path || fileInfo.file_path || fileInfo.path;
        filename = fileInfo.original_filename || fileInfo.file_name || `${productData.slug || 'product'}.pdf`;
      } else if (fileInfo?.file_url || fileInfo?.url || productData.product_file_url || productData.file_path || productData.download_url) {
        const urlOrPath = fileInfo?.file_url || fileInfo?.url || productData.product_file_url || productData.file_path || productData.download_url;
        if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://'))) {
          targetPath = urlOrPath;
          filename = `${productData.slug || 'product'}.pdf`;
        } else if (typeof urlOrPath === 'string' && urlOrPath.length > 0) {
          targetPath = urlOrPath;
          filename = `${productData.slug || 'product'}.pdf`;
        }
      }
    }
  }

  if (!targetPath) {
    return NextResponse.json(
      { error: 'Product digital files are currently being updated. Please contact support.' },
      { status: 404 }
    );
  }

  let finalSignedUrl = '';
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    finalSignedUrl = targetPath;
  } else {
    const cleanPath = targetPath
      .replace(/^products-private\//, '')
      .replace(/^product-files\//, '')
      .replace(/^\/+/, '');

    const signRes = await SupabasePrivateStorageService.createPresignedDownloadUrl({
      storageKey: cleanPath,
      downloadFilename: filename,
      expiresInSeconds: 300,
    });

    if (!signRes.success || !signRes.downloadUrl) {
      return NextResponse.json(
        { error: signRes.error || 'Failed to generate secure download URL.' },
        { status: 500 }
      );
    }

    finalSignedUrl = signRes.downloadUrl;
  }

  // 5. Increment usage and log download
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

  // Return download URL or redirect
  if (req.nextUrl.searchParams.get('redirect') === 'true') {
    return NextResponse.redirect(finalSignedUrl);
  }

  return NextResponse.json({
    success: true,
    downloadUrl: finalSignedUrl,
    filename,
    expiresInSeconds: 300,
  });
}
