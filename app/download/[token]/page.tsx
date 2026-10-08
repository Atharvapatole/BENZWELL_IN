import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/shop/download-button';
import { DownloadTimer } from '@/components/shop/download-timer';
import { OrderAnalyticsTracker } from '@/components/marketing/order-analytics-tracker';
import {
  CheckCircle2,
  Download,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  FileText,
  Video,
  FileArchive,
  Music,
  Package,
  Lock,
} from 'lucide-react';

export const revalidate = 0;

interface DownloadPageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Secure Product Download | BENZWELL',
  description: 'Instant secure download access for your purchased digital products on BenzWell.',
};

export default async function ProductDownloadPage({ params }: DownloadPageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  // 1. Look up fulfillment token in database
  const { data: tokenRecord } = await supabase
    .from('order_fulfillment_tokens')
    .select('*, orders(*, order_items(*, product:products(*)))')
    .eq('token', token)
    .maybeSingle();

  // If token does not exist or order is missing
  if (!tokenRecord || !tokenRecord.orders) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 max-w-xl mx-auto text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Download Link Not Found</h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              We couldn&apos;t verify this temporary download token. If you recently placed an order, all your purchased assets are securely available in your account.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/account/downloads"
              className="px-6 py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs transition-colors shadow-md"
            >
              Access My Downloads
            </Link>
            <Link
              href="/shop"
              className="px-6 py-3 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs transition-colors"
            >
              Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Check 5-Minute Token Expiration
  const now = new Date();
  const expiresAt = new Date(tokenRecord.expires_at);
  const isExpired = now > expiresAt;

  if (isExpired) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 max-w-xl mx-auto text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-sky-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Temporary Download Link Expired</h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              This single-use 5-minute checkout download link has expired for your security.
              <br />
              <strong className="text-white">Your permanent purchase entitlement remains active</strong> in your customer account.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 text-xs text-zinc-400 text-left space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How to access your files:</span>
            </p>
            <p>1. Open your <strong>Account → My Downloads</strong> dashboard.</p>
            <p>2. Click Download on any purchased resource to generate a fresh secure link.</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/account/downloads"
              className="px-6 py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <span>Go to My Downloads</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/account/orders"
              className="px-6 py-3 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs transition-colors"
            >
              View Order History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const order = tokenRecord.orders;
  const items = order.order_items || [];
  const productIds = items.map((i: any) => i.product_id).filter(Boolean);

  // 3. Fetch Product Deliverable Files & Customer Entitlements
  const [filesRes, entitlementsRes] = await Promise.all([
    supabase.from('product_files').select('*').in('product_id', productIds).order('created_at', { ascending: true }),
    supabase.from('customer_entitlements').select('*').eq('order_id', order.id),
  ]);

  const filesByProduct = (filesRes.data || []).reduce((acc: any, file: any) => {
    if (!acc[file.product_id]) acc[file.product_id] = [];
    acc[file.product_id].push(file);
    return acc;
  }, {});

  const entitlementMap = (entitlementsRes.data || []).reduce((acc: any, ent: any) => {
    acc[ent.product_id] = ent;
    return acc;
  }, {});

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    if (mimeType?.includes('pdf') || ext === 'pdf') return <FileText className="w-5 h-5 text-red-400" />;
    if (mimeType?.includes('video') || ext === 'mp4' || ext === 'mov') return <Video className="w-5 h-5 text-sky-400" />;
    if (mimeType?.includes('audio') || ext === 'mp3' || ext === 'wav') return <Music className="w-5 h-5 text-amber-400" />;
    if (mimeType?.includes('zip') || mimeType?.includes('tar') || ext === 'zip' || ext === 'rar')
      return <FileArchive className="w-5 h-5 text-purple-400" />;
    return <FileText className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <OrderAnalyticsTracker
        order={{
          orderId: order.order_number,
          total: parseFloat(order.total) || 0,
          items: items.map((i: any) => ({
            id: i.product_id,
            name: i.product_name_snapshot,
            price: parseFloat(i.price_snapshot) || 0,
          })),
        }}
      />

      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Product Download Page
        </h1>
        <p className="text-sm text-zinc-300 max-w-md mx-auto">
          Your payment has been verified. Download your purchased digital files using the secure buttons below.
        </p>
      </div>

      {/* 5-Minute Link Validity Countdown Timer */}
      <DownloadTimer expiresAt={tokenRecord.expires_at} />

      {/* Main Download Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-2xl space-y-8">
        {/* Products Breakdown */}
        <div className="space-y-6 divide-y divide-zinc-800/80">
          {items.map((item: any) => {
            const product = item.product;
            const productFiles = filesByProduct[item.product_id] || [];
            const entitlement = entitlementMap[item.product_id];
            const productTitle = item.product_name_snapshot || product?.title || 'Digital Product';
            const productImage = product?.main_image;

            return (
              <div key={item.id} className="pt-6 first:pt-0 space-y-6">
                {/* Product Header Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* [Product Image] */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#0e1017] border border-zinc-700/80 flex-shrink-0 flex items-center justify-center p-1.5 shadow-lg">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={productTitle}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-sky-500/10 flex items-center justify-center">
                        <Package className="w-8 h-8 text-sky-400" />
                      </div>
                    )}
                  </div>

                  {/* [Product Name] & Metadata */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {product?.product_type || 'Digital Deliverable'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Purchase</span>
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate" title={productTitle}>
                      {productTitle}
                    </h2>

                    <p className="text-xs text-zinc-400">
                      Order #{order.order_number} • Lifetime Entitlement Activated
                    </p>
                  </div>
                </div>

                {/* [Download Button] / Attached Deliverables */}
                {productFiles.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Available Deliverables ({productFiles.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {productFiles.map((file: any) => (
                        <div
                          key={file.id}
                          className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-700/80 flex items-center justify-between gap-3 hover:border-zinc-600 transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-zinc-800/80 flex-shrink-0">
                              {getFileIcon(file.mime_type, file.original_filename)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate" title={file.original_filename}>
                                {file.original_filename}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                {file.file_size ? `${(file.file_size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                                Version {file.file_version || '1.0'}
                              </p>
                            </div>
                          </div>

                          <DownloadButton
                            token={token}
                            entitlementId={entitlement?.id}
                            fileId={file.id}
                            productTitle={file.original_filename}
                            label="Download"
                            size="sm"
                            className="bg-white text-zinc-950 hover:bg-zinc-200"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-white">Full Digital Package</p>
                      <p className="text-[11px] text-zinc-400">Click below to generate your secure signed download link.</p>
                    </div>
                    <DownloadButton
                      token={token}
                      entitlementId={entitlement?.id}
                      productTitle={productTitle}
                      label="Download Package"
                      size="md"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Permanent Access Reassurance Box */}
        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Permanent Purchase Entitlement Policy</span>
          </div>
          <p className="leading-relaxed">
            While this temporary unique link will expire after 5 minutes, <strong>your digital product access never expires</strong>. You can always access, view, and re-download this product at any time from your account under <strong>Account → My Downloads</strong>.
          </p>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-zinc-400">
            A confirmation receipt has been sent to <strong className="text-white">{order.customer_email}</strong>.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/account/downloads"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-center transition-colors shadow-md"
            >
              Go to My Downloads
            </Link>
            <Link
              href="/account/orders"
              className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white font-bold text-center transition-colors"
            >
              View Order History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
