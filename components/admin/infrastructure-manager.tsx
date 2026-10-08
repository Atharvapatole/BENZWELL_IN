'use client';

import React, { useState, useTransition } from 'react';
import {
  saveInfrastructureConfigAction,
  testInfrastructureServiceAction,
  deleteInfrastructureSecretAction,
} from '@/actions/infrastructure';
import { SupportedService, InfrastructureTestResult } from '@/lib/services/credential-service';
import {
  Server,
  Database,
  Image as ImageIcon,
  HardDrive,
  Mail,
  CreditCard,
  Github,
  Triangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  ShieldAlert,
  Webhook,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InfrastructureManagerProps {
  initialConfigs: Record<string, any>;
  lastAppwriteWebhook: {
    timestamp: string;
    event: string;
    status: string;
    signatureVerified: boolean;
  } | null;
}

export function InfrastructureManager({
  initialConfigs,
  lastAppwriteWebhook,
}: InfrastructureManagerProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [testResults, setTestResults] = useState<Record<string, InfrastructureTestResult | null>>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Test recipient for Resend
  const [resendTestRecipient, setResendTestRecipient] = useState('');

  // Local form changes per service
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [showReplaceInput, setShowReplaceInput] = useState<Record<string, boolean>>({});

  const handleInputChange = (service: string, field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [service]: {
        ...(prev[service] || {}),
        [field]: value,
      },
    }));
  };

  const getFieldValue = (service: string, field: string, fallback = '') => {
    if (formState[service]?.[field] !== undefined) {
      return formState[service][field];
    }
    return configs[service]?.[field] ?? fallback;
  };

  const handleSave = (service: SupportedService) => {
    const payload = formState[service] || {};
    setSaveSuccess(null);
    setSaveError(null);

    startTransition(async () => {
      const res = await saveInfrastructureConfigAction(service, payload);
      if (res.success) {
        setSaveSuccess(`Successfully updated and encrypted ${service.toUpperCase()} configuration.`);
        // Update local configs state to reflect masked values
        setConfigs((prev: any) => ({
          ...prev,
          [service]: {
            ...prev[service],
            ...payload,
          },
        }));
        // reset replace inputs
        setShowReplaceInput((prev) => ({ ...prev, [service]: false }));
      } else {
        setSaveError(res.error || `Failed to save ${service} configuration.`);
      }
    });
  };

  const handleTest = async (service: SupportedService, options?: any) => {
    setTestingService(service);
    setTestResults((prev) => ({ ...prev, [service]: null }));

    try {
      const testPayload = { ...(options || {}), ...(formState[service] || {}) };
      const res = await testInfrastructureServiceAction(service, testPayload);
      setTestResults((prev) => ({ ...prev, [service]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          success: false,
          service,
          error: err.message || 'Test encountered unexpected error.',
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setTestingService(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. UNIFIED INFRASTRUCTURE HEALTH SUMMARY */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
              <Server className="w-5 h-5 text-sky-400" />
              <span>Enterprise Infrastructure Health</span>
            </h2>
            <p className="text-zinc-400 text-xs mt-1">
              Production status of Appwrite database, ImageKit CDN, Cloudflare R2 storage, Resend, Razorpay, and Vercel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Plaintext Storage</span>
            </span>
          </div>
        </div>

        {/* Health Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { key: 'appwrite', label: 'Appwrite', icon: Database, isConfigured: configs.appwrite?.has_api_key || !!configs.appwrite?.project_id },
            { key: 'imagekit', label: 'ImageKit CDN', icon: ImageIcon, isConfigured: configs.imagekit?.has_private_key || !!configs.imagekit?.public_key },
            { key: 'tigris', label: 'Tigris Storage', icon: HardDrive, isConfigured: configs.tigris?.has_secret_access_key || !!configs.tigris?.bucket_name },
            { key: 'resend', label: 'Resend Email', icon: Mail, isConfigured: configs.resend?.has_api_key },
            { key: 'razorpay', label: 'Razorpay', icon: CreditCard, isConfigured: configs.razorpay?.has_key_secret || !!configs.razorpay?.key_id },
            { key: 'vercel', label: 'Vercel Deployer', icon: Triangle, isConfigured: configs.vercel?.has_api_token },
            { key: 'supabase_migration', label: 'Migration Source', icon: Server, isConfigured: configs.supabase_migration?.has_service_role_key },
          ].map((svc) => (
            <div
              key={svc.key}
              className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <svc.icon className="w-4 h-4 text-zinc-400" />
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    svc.isConfigured ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
                  )}
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{svc.label}</div>
                <div className="text-[10px] text-zinc-400">
                  {svc.isConfigured ? 'Configured ✓' : 'Setup Required'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 2. APPWRITE CONFIGURATION CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Appwrite Backend & Database</h3>
              <p className="text-zinc-400 text-xs">Primary data store for Auth, Profiles, Orders, Entitlements, Coupons, and Leads.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTest('appwrite')}
              disabled={testingService === 'appwrite'}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testingService === 'appwrite' && 'animate-spin')} />
              <span>Test Connection</span>
            </button>
            <button
              onClick={() => handleSave('appwrite')}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save Appwrite
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResults.appwrite && (
          <div className={cn(
            'p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5',
            testResults.appwrite.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            {testResults.appwrite.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1.5 flex-1">
              <div>{testResults.appwrite.message || testResults.appwrite.error}</div>
              {testResults.appwrite.details?.availableDatabases && (
                <div className="mt-2 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300">
                  <span className="font-bold text-sky-300">Databases found in this Appwrite Project:</span>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {testResults.appwrite.details.availableDatabases.map((db: any) => (
                      <li key={db.id} className="font-mono">
                        {db.name} (ID: <strong className="text-white">{db.id}</strong>)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {testResults.appwrite.details?.collections && testResults.appwrite.details.collections.length > 0 && (
                <div className="mt-2 text-[11px] text-zinc-400">
                  <span className="font-bold text-zinc-300">Active Collections/Tables ({testResults.appwrite.details.collectionsCount}):</span>{' '}
                  {testResults.appwrite.details.collections.map((c: any) => c.name || c.id).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Appwrite Endpoint URL
            </label>
            <input
              type="text"
              value={getFieldValue('appwrite', 'endpoint', 'https://cloud.appwrite.io/v1')}
              onChange={(e) => handleInputChange('appwrite', 'endpoint', e.target.value)}
              placeholder="https://cloud.appwrite.io/v1"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Project ID
            </label>
            <input
              type="text"
              value={getFieldValue('appwrite', 'project_id', '')}
              onChange={(e) => handleInputChange('appwrite', 'project_id', e.target.value)}
              placeholder="e.g. 670123abc..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Database ID
            </label>
            <input
              type="text"
              value={getFieldValue('appwrite', 'database_id', '')}
              onChange={(e) => handleInputChange('appwrite', 'database_id', e.target.value)}
              placeholder="e.g. benzwell-db or 670456def..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* API Key with Mask & Replace */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Appwrite API Key (Server Secret)
              </label>
              {configs.appwrite?.has_api_key && (
                <span className="text-[11px] font-bold text-emerald-400">Configured ✓</span>
              )}
            </div>
            {configs.appwrite?.has_api_key && !showReplaceInput.appwrite_api_key ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowReplaceInput((p) => ({ ...p, appwrite_api_key: true }))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <input
                type="password"
                placeholder="Paste new Appwrite API Key"
                onChange={(e) => handleInputChange('appwrite', 'api_key', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            )}
          </div>
        </div>

        {/* Webhook Configuration Sub-Section */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 mb-6">
          <h4 className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Webhook className="w-4 h-4 text-sky-400" />
            <span>Appwrite Webhook Endpoint & Security</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">Webhook URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://benzwell.in/api/webhooks/appwrite"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard('https://benzwell.in/api/webhooks/appwrite')}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="Copy Webhook URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">Webhook Secret Key</label>
              {configs.appwrite?.has_webhook_secret && !showReplaceInput.appwrite_webhook_secret ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    value="••••••••••••••••"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowReplaceInput((p) => ({ ...p, appwrite_webhook_secret: true }))}
                    className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <input
                  type="password"
                  placeholder="Appwrite Webhook Signing Secret"
                  onChange={(e) => handleInputChange('appwrite', 'webhook_secret', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              )}
            </div>
          </div>

          {/* Last Webhook Received Banner */}
          <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
            <div>
              Last Webhook Received:{' '}
              <strong className="text-zinc-200">
                {lastAppwriteWebhook ? new Date(lastAppwriteWebhook.timestamp).toLocaleString() : 'No webhooks received yet'}
              </strong>
            </div>
            {lastAppwriteWebhook && (
              <span className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold',
                lastAppwriteWebhook.signatureVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              )}>
                {lastAppwriteWebhook.signatureVerified ? 'Signature Verified ✓' : 'Signature Unverified'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. SUPABASE PRIVATE PAID STORAGE CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Supabase Private Storage (Paid Digital Deliverables)</h3>
              <p className="text-zinc-400 text-xs">Dedicated private object storage bucket for customer-only downloadable assets (PDFs, eBooks, ZIPs, Courses) delivered via short-lived signed URLs.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTest('supabase_storage')}
              disabled={testingService === 'supabase_storage'}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testingService === 'supabase_storage' && 'animate-spin')} />
              <span>Test Connection</span>
            </button>
            <button
              onClick={() => handleTest('supabase_storage', { uploadProbe: true, downloadProbe: true })}
              disabled={testingService === 'supabase_storage'}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testingService === 'supabase_storage' && 'animate-spin')} />
              <span>Test Upload & Download</span>
            </button>
            <button
              onClick={() => handleSave('supabase_storage')}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save Storage Settings
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResults.supabase_storage && (
          <div className={cn(
            'p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5',
            testResults.supabase_storage.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            {testResults.supabase_storage.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div>{testResults.supabase_storage.message || testResults.supabase_storage.error}</div>
              {testResults.supabase_storage.details && (
                <div className="mt-1 text-[11px] text-zinc-400 font-mono">
                  Bucket: {testResults.supabase_storage.details.bucketName} | Private: {testResults.supabase_storage.details.isPrivate ? 'Yes (Restricted)' : 'No'}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={getFieldValue('supabase_storage', 'project_url', '')}
              onChange={(e) => handleInputChange('supabase_storage', 'project_url', e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Private Bucket Name
            </label>
            <input
              type="text"
              value={getFieldValue('supabase_storage', 'bucket_name', 'products-private')}
              onChange={(e) => handleInputChange('supabase_storage', 'bucket_name', e.target.value)}
              placeholder="products-private"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Service Role Key */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Supabase Service Role Key (Encrypted Server-Side)
              </label>
              {configs.supabase_storage?.has_service_role_key && (
                <span className="text-[11px] font-bold text-emerald-400">Configured ✓</span>
              )}
            </div>
            {configs.supabase_storage?.has_service_role_key && !showReplaceInput.supabase_storage_key ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowReplaceInput((p) => ({ ...p, supabase_storage_key: true }))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <input
                type="password"
                placeholder="Paste Supabase Service Role Secret Key (eyJhbGciOi...)"
                onChange={(e) => handleInputChange('supabase_storage', 'service_role_key', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* 4. IMAGEKIT CDN CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">ImageKit (Public Media & Product Images)</h3>
              <p className="text-zinc-400 text-xs">Real-time image optimization, WebP/AVIF transformation, and global CDN delivery.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTest('imagekit')}
              disabled={testingService === 'imagekit'}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testingService === 'imagekit' && 'animate-spin')} />
              <span>Test ImageKit</span>
            </button>
            <button
              onClick={() => handleSave('imagekit')}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save ImageKit
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResults.imagekit && (
          <div className={cn(
            'p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5',
            testResults.imagekit.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            {testResults.imagekit.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div>{testResults.imagekit.message || testResults.imagekit.error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              URL Endpoint
            </label>
            <input
              type="text"
              value={getFieldValue('imagekit', 'url_endpoint')}
              onChange={(e) => handleInputChange('imagekit', 'url_endpoint', e.target.value)}
              placeholder="https://ik.imagekit.io/benzwell"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Public Key
            </label>
            <input
              type="text"
              value={getFieldValue('imagekit', 'public_key')}
              onChange={(e) => handleInputChange('imagekit', 'public_key', e.target.value)}
              placeholder="public_xxxxxx"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Private Key (Server Only)
              </label>
              {configs.imagekit?.has_private_key && (
                <span className="text-[11px] font-bold text-emerald-400">Configured ✓</span>
              )}
            </div>
            {configs.imagekit?.has_private_key && !showReplaceInput.imagekit_private ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowReplaceInput((p) => ({ ...p, imagekit_private: true }))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <input
                type="password"
                placeholder="private_xxxxxx"
                onChange={(e) => handleInputChange('imagekit', 'private_key', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* 5. RESEND TRANSACTIONAL EMAIL CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Resend Transactional Email</h3>
              <p className="text-zinc-400 text-xs">High-deliverability email service for order receipts, download links, and support replies.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('resend')}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save Resend
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResults.resend && (
          <div className={cn(
            'p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5',
            testResults.resend.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            {testResults.resend.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div>{testResults.resend.message || testResults.resend.error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              From Name
            </label>
            <input
              type="text"
              value={getFieldValue('resend', 'from_name', 'BenzWell')}
              onChange={(e) => handleInputChange('resend', 'from_name', e.target.value)}
              placeholder="BenzWell"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              From Email Address
            </label>
            <input
              type="email"
              value={getFieldValue('resend', 'from_email', 'info@benzwell.in')}
              onChange={(e) => handleInputChange('resend', 'from_email', e.target.value)}
              placeholder="info@benzwell.in"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Resend API Key (re_xxxx)
              </label>
              {configs.resend?.has_api_key && (
                <span className="text-[11px] font-bold text-emerald-400">Configured ✓</span>
              )}
            </div>
            {configs.resend?.has_api_key && !showReplaceInput.resend_key ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowReplaceInput((p) => ({ ...p, resend_key: true }))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <input
                type="password"
                placeholder="re_xxxxxxxxxxxxxx"
                onChange={(e) => handleInputChange('resend', 'api_key', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            )}
          </div>
        </div>

        {/* Live Email Test Probe Form */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            Send Live Infrastructure Test Email
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={resendTestRecipient}
              onChange={(e) => setResendTestRecipient(e.target.value)}
              placeholder="Enter recipient email (e.g. your@email.com)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => handleTest('resend', { recipientEmail: resendTestRecipient })}
              disabled={testingService === 'resend'}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. RAZORPAY GATEWAY CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Razorpay Payment Gateway</h3>
              <p className="text-zinc-400 text-xs">Primary Indian payment infrastructure for Cards, UPI, Netbanking, and Wallets.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTest('razorpay')}
              disabled={testingService === 'razorpay'}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testingService === 'razorpay' && 'animate-spin')} />
              <span>Test Razorpay</span>
            </button>
            <button
              onClick={() => handleSave('razorpay')}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save Razorpay
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResults.razorpay && (
          <div className={cn(
            'p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5',
            testResults.razorpay.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            {testResults.razorpay.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div>{testResults.razorpay.message || testResults.razorpay.error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Key ID (rzp_live_xxx / rzp_test_xxx)
            </label>
            <input
              type="text"
              value={getFieldValue('razorpay', 'key_id')}
              onChange={(e) => handleInputChange('razorpay', 'key_id', e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxx"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Key Secret (Encrypted)
              </label>
              {configs.razorpay?.has_key_secret && (
                <span className="text-[11px] font-bold text-emerald-400">Configured ✓</span>
              )}
            </div>
            {configs.razorpay?.has_key_secret && !showReplaceInput.razorpay_secret ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowReplaceInput((p) => ({ ...p, razorpay_secret: true }))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <input
                type="password"
                placeholder="Paste Razorpay Key Secret"
                onChange={(e) => handleInputChange('razorpay', 'key_secret', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
              />
            )}
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5">
          <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">Razorpay Webhook URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value="https://benzwell.in/api/webhooks/razorpay"
              className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono select-all"
            />
            <button
              type="button"
              onClick={() => copyToClipboard('https://benzwell.in/api/webhooks/razorpay')}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Copy URL"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. GITHUB & VERCEL DEPLOYER CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">GitHub & Vercel Free Tool Deployer</h3>
              <p className="text-zinc-400 text-xs">Automated deployment infrastructure for hosting isolated Free Tool sub-applications.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTest('github')}
              disabled={testingService === 'github'}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
            >
              Test GitHub
            </button>
            <button
              onClick={() => handleTest('vercel')}
              disabled={testingService === 'vercel'}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
            >
              Test Vercel
            </button>
            <button
              onClick={() => {
                handleSave('github');
                handleSave('vercel');
              }}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save Deployer
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {(testResults.github || testResults.vercel) && (
          <div className="space-y-2 mb-6">
            {testResults.github && (
              <div className={cn(
                'p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2',
                testResults.github.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'
              )}>
                {testResults.github.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span>{testResults.github.message || testResults.github.error}</span>
              </div>
            )}
            {testResults.vercel && (
              <div className={cn(
                'p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2',
                testResults.vercel.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'
              )}>
                {testResults.vercel.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span>{testResults.vercel.message || testResults.vercel.error}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={getFieldValue('github', 'personal_access_token')}
              onChange={(e) => handleInputChange('github', 'personal_access_token', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Vercel API Token
            </label>
            <input
              type="password"
              placeholder="Vercel Access Token"
              value={getFieldValue('vercel', 'api_token')}
              onChange={(e) => handleInputChange('vercel', 'api_token', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 8. SUPABASE MIGRATION SOURCE CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Supabase Migration Source (One-Time Import Only)</h3>
              <p className="text-zinc-400 text-xs">Connect legacy Supabase instance to migrate existing products, orders, users, and files into Appwrite, ImageKit, and Tigris.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTest('supabase_migration')}
              disabled={testingService === 'supabase_migration'}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', testingService === 'supabase_migration' && 'animate-spin')} />
              <span>Test Connection</span>
            </button>
            <button
              onClick={() => handleSave('supabase_migration')}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all"
            >
              Save Migration Source
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResults.supabase_migration && (
          <div className={cn(
            'p-4 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5',
            testResults.supabase_migration.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            {testResults.supabase_migration.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <div>{testResults.supabase_migration.message || testResults.supabase_migration.error}</div>
              {testResults.supabase_migration.details && (
                <div className="mt-1 text-[11px] text-zinc-400">
                  Project: {testResults.supabase_migration.details.projectUrl} | Total Auth Users: {testResults.supabase_migration.details.totalUsers} | Buckets: {(testResults.supabase_migration.details.buckets || []).join(', ') || 'None'}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xxxx.supabase.co"
              value={getFieldValue('supabase_migration', 'project_url')}
              onChange={(e) => handleInputChange('supabase_migration', 'project_url', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Service Role Key (Server-Only / Encrypted)
              </label>
              {configs.supabase_migration?.has_service_role_key && (
                <span className="text-[11px] font-bold text-emerald-400">Configured ✓</span>
              )}
            </div>
            {configs.supabase_migration?.has_service_role_key && !showReplaceInput.supabase_srv_key ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowReplaceInput((p) => ({ ...p, supabase_srv_key: true }))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <input
                type="password"
                placeholder="Paste Supabase Service Role Key (eyJ...)"
                onChange={(e) => handleInputChange('supabase_migration', 'service_role_key', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
