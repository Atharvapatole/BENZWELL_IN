'use client';

import React, { useState } from 'react';
import {
  saveAdminSettingsAction,
  testRazorpayConnectionAction,
  testResendEmailAction,
} from '@/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings,
  Palette,
  CreditCard,
  Mail,
  Lock,
  HardDrive,
  Globe,
  BarChart3,
  Megaphone,
  Share2,
  ShieldCheck,
  Server,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';

interface SettingsManagerProps {
  initialSettings: Record<string, any>;
  systemStatus: {
    supabase: boolean;
    database: boolean;
    storage: boolean;
    storageMediaPublic: boolean;
    storageProductsPrivate: boolean;
    razorpay: boolean;
    resend: boolean;
    googleAuth: boolean;
    siteUrl: string;
    emailDomain: string;
  };
}

export function SettingsManager({ initialSettings, systemStatus }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<
    | 'general'
    | 'branding'
    | 'payments'
    | 'email'
    | 'auth'
    | 'storage'
    | 'seo'
    | 'analytics'
    | 'marketing'
    | 'social'
    | 'security'
    | 'system'
  >('general');

  const [settings, setSettings] = useState(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test states
  const [isTestingRazorpay, setIsTestingRazorpay] = useState(false);
  const [razorpayTestResult, setRazorpayTestResult] = useState<string | null>(null);

  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);

  const handleSave = async (category: string, formData: Record<string, any>) => {
    setIsLoading(true);
    setMessage(null);

    const res = await saveAdminSettingsAction(category, formData);
    setIsLoading(false);

    if (res.success) {
      setSettings((prev) => ({
        ...prev,
        [category]: { ...prev[category], ...formData },
      }));
      setMessage({ type: 'success', text: `✓ ${category.toUpperCase()} settings saved successfully.` });
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({ type: 'error', text: `✕ ${res.error || 'Failed to save settings.'}` });
    }
  };

  const handleTestRazorpay = async () => {
    setIsTestingRazorpay(true);
    setRazorpayTestResult(null);

    const res = await testRazorpayConnectionAction();
    setIsTestingRazorpay(false);

    if (res.success) {
      setRazorpayTestResult(`✓ ${res.message}`);
    } else {
      setRazorpayTestResult(`✕ Connection Failed: ${res.error}`);
    }
  };

  const handleTestResend = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);

    const res = await testResendEmailAction(testEmailAddress || undefined);
    setIsTestingEmail(false);

    if (res.success) {
      setEmailTestResult(`✓ ${res.message}`);
    } else {
      setEmailTestResult(`✕ Dispatch Failed: ${res.error}`);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'payments', label: 'Payments (Razorpay)', icon: CreditCard },
    { id: 'email', label: 'Email (Resend)', icon: Mail },
    { id: 'auth', label: 'Authentication', icon: Lock },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'seo', label: 'SEO & Meta', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'social', label: 'Social Profiles', icon: Share2 },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'system', label: 'System Status', icon: Server },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Navigation Menu (4 cols) */}
      <div className="lg:col-span-4 p-3 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-1">
        <div className="px-4 py-3 border-b border-zinc-800/80 mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Settings Center</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Control platform parameters</p>
        </div>

        <a
          href="/admin/settings/infrastructure"
          className="w-full mb-2 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/40 text-white text-xs font-bold shadow-sm hover:border-sky-400 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Infrastructure & Cloud</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-300">
            Enterprise
          </span>
        </a>

        <a
          href="/admin/settings/migration"
          className="w-full mb-3 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-white text-xs font-bold shadow-sm hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Migration & Import</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
            Scanner
          </span>
        </a>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 text-left ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Form Panel (8 cols) */}
      <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-6">
        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                : 'bg-red-950/60 text-red-300 border border-red-800'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. GENERAL */}
        {activeTab === 'general' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave('general', {
                site_name: fd.get('site_name'),
                tagline: fd.get('tagline'),
                support_email: fd.get('support_email'),
                support_phone: fd.get('support_phone'),
                currency: fd.get('currency'),
                currency_symbol: fd.get('currency_symbol'),
                copyright_text: fd.get('copyright_text'),
              });
            }}
            className="space-y-4"
          >
            <h3 className="text-base font-bold text-white">General Platform Settings</h3>
            <Input
              name="site_name"
              label="Platform Name"
              defaultValue={settings.general?.site_name || 'BENZWELL'}
              required
            />
            <Input
              name="tagline"
              label="Platform Tagline"
              defaultValue={settings.general?.tagline || 'Digital Products Built for Better Work'}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="support_email"
                label="Support Contact Email"
                type="email"
                defaultValue={settings.general?.support_email || 'info@benzwell.in'}
                required
              />
              <Input
                name="support_phone"
                label="Support Phone (Optional)"
                defaultValue={settings.general?.support_phone || '+91 98765 43210'}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="currency"
                label="Primary Currency Code"
                defaultValue={settings.general?.currency || 'INR'}
                required
              />
              <Input
                name="currency_symbol"
                label="Currency Symbol"
                defaultValue={settings.general?.currency_symbol || '₹'}
                required
              />
            </div>
            <Input
              name="copyright_text"
              label="Footer Copyright Text"
              defaultValue={settings.general?.copyright_text || '© 2026 BENZWELL. All rights reserved.'}
            />
            <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
              Save General Settings
            </Button>
          </form>
        )}

        {/* 2. BRANDING */}
        {activeTab === 'branding' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave('branding', {
                logo_url: fd.get('logo_url'),
                favicon_url: fd.get('favicon_url'),
                primary_accent_color: fd.get('primary_accent_color'),
                theme_mode: fd.get('theme_mode'),
              });
            }}
            className="space-y-4"
          >
            <h3 className="text-base font-bold text-white">Branding & Visual Identity</h3>
            <Input
              name="logo_url"
              label="Logo Image URL"
              defaultValue={settings.branding?.logo_url || '/logo.svg'}
              placeholder="https://..."
            />
            <Input
              name="favicon_url"
              label="Favicon URL"
              defaultValue={settings.branding?.favicon_url || '/favicon.ico'}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="primary_accent_color"
                label="Primary Accent Color (HEX)"
                defaultValue={settings.branding?.primary_accent_color || '#38bdf8'}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Theme Mode</label>
                <select
                  name="theme_mode"
                  defaultValue={settings.branding?.theme_mode || 'dark'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="dark">Dark (Apple Glassmorphism - Default)</option>
                  <option value="auto">Auto / System</option>
                </select>
              </div>
            </div>
            <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
              Save Branding Settings
            </Button>
          </form>
        )}

        {/* 3. PAYMENTS (RAZORPAY) */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Razorpay Payment Gateway</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure UPI, Cards, and Net Banking credentials. All secrets are encrypted with AES-256-GCM.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  systemStatus.razorpay
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${systemStatus.razorpay ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{systemStatus.razorpay ? 'Gateway Active' : 'Not Configured'}</span>
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleSave('payments', {
                  key_id: fd.get('key_id'),
                  key_secret: fd.get('key_secret'),
                  webhook_secret: fd.get('webhook_secret'),
                  mode: fd.get('mode'),
                });
              }}
              className="space-y-4 p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Gateway Mode</label>
                <div className="flex items-center gap-6 text-xs text-zinc-200 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="test"
                      defaultChecked={settings.payments?.mode !== 'live'}
                      className="text-sky-500"
                    />
                    <span>Test Mode (Safe Sandbox)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="live"
                      defaultChecked={settings.payments?.mode === 'live'}
                      className="text-emerald-500"
                    />
                    <span>Live Mode (Real Customer Payments)</span>
                  </label>
                </div>
              </div>

              <Input
                name="key_id"
                label="Razorpay Key ID"
                defaultValue={settings.payments?.key_id || ''}
                placeholder="rzp_test_... or rzp_live_..."
                required
              />

              <Input
                name="key_secret"
                label="Razorpay Key Secret (Encrypted)"
                type="password"
                placeholder={settings.payments?.has_key_secret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Secret Key'}
              />

              <Input
                name="webhook_secret"
                label="Razorpay Webhook Secret (Encrypted)"
                type="password"
                placeholder={settings.payments?.has_webhook_secret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Webhook Secret'}
              />

              <div className="pt-2 flex items-center gap-3">
                <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
                  Save Razorpay Credentials
                </Button>
              </div>
            </form>

            {/* Test Connection Box */}
            <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Connection Verification</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestRazorpay}
                  isLoading={isTestingRazorpay}
                  className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Test Connection</span>
                </Button>
              </div>

              {razorpayTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    razorpayTestResult.startsWith('✓')
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950/60 text-red-300 border border-red-800'
                  }`}
                >
                  {razorpayTestResult}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#0e1017] border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
                <p className="font-semibold text-zinc-300">Razorpay Dashboard Webhook Configuration:</p>
                <p>Webhook URL: <code className="text-sky-300 select-all font-mono">https://benzwell.in/api/webhooks/razorpay</code></p>
                <p>Active Events: <code>order.paid</code>, <code>payment.captured</code>, <code>payment.failed</code></p>
              </div>
            </div>
          </div>
        )}

        {/* 4. EMAIL (RESEND) */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Resend Transactional Email</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sends customer purchase confirmations, OTP verification codes, and password resets.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  systemStatus.resend
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${systemStatus.resend ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{systemStatus.resend ? 'Resend Active' : 'Not Configured'}</span>
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleSave('email', {
                  api_key: fd.get('api_key'),
                  from_name: fd.get('from_name'),
                  from_email: fd.get('from_email'),
                  reply_to: fd.get('reply_to'),
                });
              }}
              className="space-y-4 p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80"
            >
              <Input
                name="api_key"
                label="Resend API Key (Encrypted)"
                type="password"
                placeholder={settings.email?.has_api_key ? '•••••••••••••••• (Leave blank to keep existing)' : 're_...'}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  name="from_name"
                  label="From Sender Name"
                  defaultValue={settings.email?.from_name || 'BenzWell'}
                  required
                />
                <Input
                  name="from_email"
                  label="From Sender Email"
                  type="email"
                  defaultValue={settings.email?.from_email || 'info@benzwell.in'}
                  required
                />
              </div>

              <Input
                name="reply_to"
                label="Reply-To Email"
                type="email"
                defaultValue={settings.email?.reply_to || 'info@benzwell.in'}
              />

              <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
                Save Email Credentials
              </Button>
            </form>

            {/* Test Email Dispatch */}
            <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Test Email Dispatch</h4>
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="info@benzwell.in"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
                />
                <Button
                  type="button"
                  size="md"
                  onClick={handleTestResend}
                  isLoading={isTestingEmail}
                  className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  <span>Send Test Email</span>
                </Button>
              </div>

              {emailTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    emailTestResult.startsWith('✓')
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950/60 text-red-300 border border-red-800'
                  }`}
                >
                  {emailTestResult}
                </div>
              )}
            </div>

            {/* DNS Records Reference */}
            <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-2 text-xs text-zinc-300">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Resend DNS Domain Verification (benzwell.in)</h4>
              <p className="text-zinc-400 text-[11px]">Add these DNS records in your domain registrar (e.g. Cloudflare / Namecheap / Hostinger):</p>
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left font-mono text-[11px] border border-zinc-800">
                  <thead className="bg-[#0e1017] text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Name / Host</th>
                      <th className="p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    <tr>
                      <td className="p-2 text-sky-300 font-bold">MX</td>
                      <td className="p-2">send.benzwell.in</td>
                      <td className="p-2 text-zinc-400">feedback-smtp.resend.com (Priority 10)</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-sky-300 font-bold">TXT</td>
                      <td className="p-2">send.benzwell.in</td>
                      <td className="p-2 text-zinc-400">v=spf1 include:resend.com ~all</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-sky-300 font-bold">TXT</td>
                      <td className="p-2">resend._domainkey.benzwell.in</td>
                      <td className="p-2 text-zinc-400">p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. AUTHENTICATION */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Authentication & OAuth Configuration</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleSave('auth', {
                  client_id: fd.get('client_id'),
                  client_secret: fd.get('client_secret'),
                  otp_cooldown_seconds: fd.get('otp_cooldown_seconds'),
                  otp_expiry_minutes: fd.get('otp_expiry_minutes'),
                });
              }}
              className="space-y-4 p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80"
            >
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Google OAuth 2.0 Credentials</h4>
              <Input
                name="client_id"
                label="Google Client ID"
                defaultValue={settings.auth?.client_id || ''}
                placeholder="...apps.googleusercontent.com"
              />
              <Input
                name="client_secret"
                label="Google Client Secret (Encrypted)"
                type="password"
                placeholder={settings.auth?.has_client_secret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Client Secret'}
              />

              {/* Dynamic Google Cloud Configuration Reference */}
              <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    1. Authorized JavaScript Origins
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={systemStatus.siteUrl || 'https://benzwell.in'}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/80 text-xs font-mono text-emerald-400 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = systemStatus.siteUrl || 'https://benzwell.in';
                        navigator.clipboard.writeText(url);
                        setMessage({ type: 'success', text: 'JavaScript Origin copied to clipboard!' });
                        setTimeout(() => setMessage(null), 3000);
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors border border-zinc-700 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    2. Authorized Redirect URI (Add to Google Cloud Console)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${systemStatus.siteUrl || 'https://benzwell.in'}/api/auth/callback/google`}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/80 text-xs font-mono text-sky-400 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${systemStatus.siteUrl || 'https://benzwell.in'}/api/auth/callback/google`;
                        navigator.clipboard.writeText(url);
                        setMessage({ type: 'success', text: 'Redirect URI copied to clipboard!' });
                        setTimeout(() => setMessage(null), 3000);
                      }}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors border border-zinc-700 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Google OAuth Consent Screen Branding Checklist:</p>
                  <p>• App Name: <strong className="text-white">BENZWELL</strong></p>
                  <p>• User Support Email: <strong className="text-white">info@benzwell.in</strong></p>
                  <p>• App Home Page: <code className="text-sky-300">https://benzwell.in</code></p>
                  <p>• Privacy Policy: <code className="text-sky-300">https://benzwell.in/privacy</code></p>
                  <p>• Terms of Service: <code className="text-sky-300">https://benzwell.in/terms</code></p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-white uppercase tracking-wider pt-2">Security & OTP Rules</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  name="otp_cooldown_seconds"
                  label="OTP Cooldown (Seconds)"
                  type="number"
                  defaultValue={settings.auth?.otp_cooldown_seconds || '60'}
                />
                <Input
                  name="otp_expiry_minutes"
                  label="OTP Code Expiry (Minutes)"
                  type="number"
                  defaultValue={settings.auth?.otp_expiry_minutes || '10'}
                />
              </div>

              <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
                Save Authentication Settings
              </Button>
            </form>
          </div>
        )}

        {/* 6. STORAGE */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Supabase Storage Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">media-public</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Public Bucket</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Used for public product mockups, thumbnails, hero banners, blog images, and page builder assets.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">products-private</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">Private Encrypted</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Stores paid digital deliverables (PDF, MP4, ZIP). Never publicly accessible. Access requires verified customer entitlement.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleSave('storage', {
                  max_upload_size_mb: fd.get('max_upload_size_mb'),
                  signed_url_expiry_seconds: fd.get('signed_url_expiry_seconds'),
                });
              }}
              className="space-y-4 p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  name="max_upload_size_mb"
                  label="Max File Upload Size (MB)"
                  type="number"
                  defaultValue={settings.storage?.max_upload_size_mb || '500'}
                />
                <Input
                  name="signed_url_expiry_seconds"
                  label="Signed Download URL Lifetime (Seconds)"
                  type="number"
                  defaultValue={settings.storage?.signed_url_expiry_seconds || '300'}
                />
              </div>
              <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
                Save Storage Rules
              </Button>
            </form>
          </div>
        )}

        {/* 7. SEO */}
        {activeTab === 'seo' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave('seo', {
                meta_title: fd.get('meta_title'),
                meta_description: fd.get('meta_description'),
                og_image: fd.get('og_image'),
                twitter_handle: fd.get('twitter_handle'),
                canonical_url: fd.get('canonical_url'),
              });
            }}
            className="space-y-4"
          >
            <h3 className="text-base font-bold text-white">Search Engine Optimization (SEO)</h3>
            <Input
              name="meta_title"
              label="Default Meta Title"
              defaultValue={settings.seo?.meta_title || 'BENZWELL — Premium Digital Products & Playbooks'}
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Default Meta Description</label>
              <textarea
                name="meta_description"
                rows={3}
                defaultValue={settings.seo?.meta_description || 'High-performance ebooks, blueprints, courses, and AI frameworks engineered for creators, founders, and learners.'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              />
            </div>
            <Input
              name="og_image"
              label="Default OpenGraph Image URL"
              defaultValue={settings.seo?.og_image || 'https://benzwell.in/og-image.png'}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="twitter_handle"
                label="Twitter / X Creator Handle"
                defaultValue={settings.seo?.twitter_handle || '@benzwell_in'}
              />
              <Input
                name="canonical_url"
                label="Canonical Domain"
                defaultValue={settings.seo?.canonical_url || 'https://benzwell.in'}
              />
            </div>
            <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
              Save SEO Settings
            </Button>
          </form>
        )}

        {/* 8. ANALYTICS */}
        {activeTab === 'analytics' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave('analytics', {
                ga4_id: fd.get('ga4_id'),
                gtm_id: fd.get('gtm_id'),
                meta_pixel_id: fd.get('meta_pixel_id'),
              });
            }}
            className="space-y-4"
          >
            <h3 className="text-base font-bold text-white">Analytics & Conversion Tracking</h3>
            <Input
              name="ga4_id"
              label="Google Analytics 4 Measurement ID"
              defaultValue={settings.analytics?.ga4_id || ''}
              placeholder="G-XXXXXXXXXX"
            />
            <Input
              name="gtm_id"
              label="Google Tag Manager Container ID"
              defaultValue={settings.analytics?.gtm_id || ''}
              placeholder="GTM-XXXXXXX"
            />
            <Input
              name="meta_pixel_id"
              label="Meta Pixel ID (Facebook Ads)"
              defaultValue={settings.analytics?.meta_pixel_id || ''}
              placeholder="123456789012345"
            />
            <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
              Save Analytics Trackers
            </Button>
          </form>
        )}

        {/* 9. MARKETING */}
        {activeTab === 'marketing' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave('marketing', {
                announcement_enabled: fd.get('announcement_enabled') === 'on',
                announcement_badge: fd.get('announcement_badge'),
                announcement_text: fd.get('announcement_text'),
                announcement_cta: fd.get('announcement_cta'),
                announcement_link: fd.get('announcement_link'),
                target_pages: fd.get('target_pages'),
                start_date: fd.get('start_date'),
                end_date: fd.get('end_date'),
              });
            }}
            className="space-y-4"
          >
            <h3 className="text-base font-bold text-white">Marketing & Announcement Bars</h3>
            
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#11131a] border border-zinc-700">
              <input
                type="checkbox"
                name="announcement_enabled"
                id="announcement_enabled"
                defaultChecked={settings.marketing?.announcement_enabled || false}
                className="w-4 h-4 rounded text-sky-500"
              />
              <label htmlFor="announcement_enabled" className="text-xs font-semibold text-white cursor-pointer">
                Enable Top Announcement Banner
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="announcement_badge"
                label="Banner Badge"
                defaultValue={settings.marketing?.announcement_badge || 'SPECIAL OFFER'}
                placeholder="e.g. LIMITED TIME"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Target Pages
                </label>
                <select
                  name="target_pages"
                  defaultValue={settings.marketing?.target_pages || 'all'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
                >
                  <option value="all">All Pages (Sitewide)</option>
                  <option value="/">Homepage Only (/)</option>
                  <option value="/shop">Shop Only (/shop)</option>
                  <option value="/blog">Blog Only (/blog)</option>
                  <option value="/product">Product Detail Pages (/product/*)</option>
                </select>
              </div>
            </div>

            <Input
              name="announcement_text"
              label="Banner Message"
              defaultValue={settings.marketing?.announcement_text || 'Get 25% off all bundles with code LAUNCH25 at checkout.'}
              placeholder="Text message displayed in the banner bar"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="announcement_cta"
                label="CTA Button / Link Text"
                defaultValue={settings.marketing?.announcement_cta || 'Shop Deals'}
                placeholder="e.g. Claim Offer"
              />
              <Input
                name="announcement_link"
                label="CTA Link Destination"
                defaultValue={settings.marketing?.announcement_link || '/shop'}
                placeholder="e.g. /shop or https://..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="start_date"
                label="Start Date (Optional Schedule)"
                type="datetime-local"
                defaultValue={settings.marketing?.start_date || ''}
              />
              <Input
                name="end_date"
                label="End Date (Optional Expiration)"
                type="datetime-local"
                defaultValue={settings.marketing?.end_date || ''}
              />
            </div>

            <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
              Save Marketing Banner
            </Button>
          </form>
        )}

        {/* 10. SOCIAL */}
        {activeTab === 'social' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleSave('social', {
                instagram: fd.get('instagram'),
                twitter: fd.get('twitter'),
                youtube: fd.get('youtube'),
                linkedin: fd.get('linkedin'),
                github: fd.get('github'),
                discord: fd.get('discord'),
              });
            }}
            className="space-y-4"
          >
            <h3 className="text-base font-bold text-white">Official Social Profiles</h3>
            <Input
              name="instagram"
              label="Instagram URL"
              defaultValue={settings.social?.instagram || 'https://instagram.com/benzwell'}
            />
            <Input
              name="twitter"
              label="Twitter / X URL"
              defaultValue={settings.social?.twitter || 'https://twitter.com/benzwell_in'}
            />
            <Input
              name="youtube"
              label="YouTube Channel URL"
              defaultValue={settings.social?.youtube || 'https://youtube.com/@benzwell'}
            />
            <Input
              name="linkedin"
              label="LinkedIn Company URL"
              defaultValue={settings.social?.linkedin || 'https://linkedin.com/company/benzwell'}
            />
            <Input
              name="github"
              label="GitHub Organization URL"
              defaultValue={settings.social?.github || 'https://github.com/benzwell'}
            />
            <Button type="submit" size="md" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold" isLoading={isLoading}>
              Save Social Links
            </Button>
          </form>
        )}

        {/* 11. SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Security Controls & Token Lifetimes</h3>
            <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-3 text-xs text-zinc-300">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                <span className="font-semibold text-white">Temporary Success Token Lifetime</span>
                <span className="font-mono text-sky-400 font-bold">5 Minutes (300s)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                <span className="font-semibold text-white">Supabase Storage Signed URL Duration</span>
                <span className="font-mono text-sky-400 font-bold">5 Minutes (300s)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                <span className="font-semibold text-white">Row Level Security (RLS)</span>
                <span className="font-bold text-emerald-400">Strictly Enforced (22 Tables)</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-white">Credential Encryption</span>
                <span className="font-bold text-emerald-400">AES-256-GCM Hardware Cipher</span>
              </div>
            </div>
          </div>
        )}

        {/* 12. SYSTEM STATUS */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">System Health & Cloud Infrastructure</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Database (PostgreSQL)</span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.database ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-xs font-bold text-white">{systemStatus.database ? 'Connected & Healthy' : 'Disconnected / Needs Migration'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Supabase Storage</span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.storage ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-xs font-bold text-white">{systemStatus.storage ? 'media-public & products-private Active' : 'Check Bucket Setup'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Razorpay Gateway</span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.razorpay ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-xs font-bold text-white">{systemStatus.razorpay ? 'Active & Ready' : 'Credentials Missing'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#11131a] border border-zinc-700/80 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Resend Transactional Email</span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.resend ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-xs font-bold text-white">{systemStatus.resend ? 'API Configured' : 'Credentials Missing'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#11131a] border border-zinc-700/80 text-xs text-zinc-400 space-y-2">
              <p className="font-bold text-white">Environment Details:</p>
              <p>• Site Domain: <code className="text-sky-300">{systemStatus.siteUrl}</code></p>
              <p>• Email Domain: <code className="text-sky-300">{systemStatus.emailDomain}</code></p>
              <p>• Security Layer: Next.js 15 Server Actions + Supabase Service Role + RLS</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
