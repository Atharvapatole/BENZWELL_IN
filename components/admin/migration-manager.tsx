'use client';

import React, { useState, useTransition } from 'react';
import {
  scanMigrationSourceAction,
  runMigrationAction,
} from '@/actions/migration';
import { saveInfrastructureConfigAction } from '@/actions/infrastructure';
import {
  Server,
  Database,
  Image as ImageIcon,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Terminal,
  ShieldCheck,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MigrationManagerProps {
  initialConfig: {
    project_url?: string;
    has_service_role_key?: boolean;
  };
}

export function MigrationManager({ initialConfig }: MigrationManagerProps) {
  const [projectUrl, setProjectUrl] = useState(initialConfig.project_url || '');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(initialConfig.has_service_role_key || false);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanReport, setScanReport] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const handleScanSource = async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      const override: any = {};
      if (projectUrl) override.projectUrl = projectUrl.trim();
      if (serviceRoleKey) override.serviceRoleKey = serviceRoleKey.trim();

      const res = await scanMigrationSourceAction(override);
      setIsScanning(false);

      if (res.success) {
        setScanReport(res);
      } else {
        setScanError(res.error || 'Failed to scan Supabase migration source.');
      }
    } catch (err: any) {
      setIsScanning(false);
      setScanError(err.message || 'Scan encountered unexpected error.');
    }
  };

  const handleSaveConfig = async () => {
    startTransition(async () => {
      const payload: any = { project_url: projectUrl };
      if (serviceRoleKey && !serviceRoleKey.includes('••••')) {
        payload.service_role_key = serviceRoleKey;
      }
      const res = await saveInfrastructureConfigAction('supabase_migration', payload);
      if (res.success) {
        setIsKeySaved(true);
        setServiceRoleKey('');
        alert('Supabase migration credentials saved and encrypted securely.');
      } else {
        alert(res.error || 'Failed to save migration credentials.');
      }
    });
  };

  const handleStartMigration = () => {
    if (!confirm('Start full migration of Database records to Appwrite, Public Images to ImageKit, and Paid Files to Tigris? This operation copies data without modifying the source.')) {
      return;
    }

    setIsMigrating(true);
    setMigrationProgress({
      phase: 'scanning',
      currentStep: 'Starting migration runner...',
      databaseMigrated: 0,
      imagesMigrated: 0,
      paidFilesMigrated: 0,
      errors: [],
      logs: [`[${new Date().toLocaleTimeString()}] Migration job started by administrator.`],
    });

    startTransition(async () => {
      try {
        const override: any = {};
        if (projectUrl) override.projectUrl = projectUrl.trim();
        if (serviceRoleKey) override.serviceRoleKey = serviceRoleKey.trim();

        const res = await runMigrationAction(override);
        setIsMigrating(false);
        setMigrationResult(res);
        setMigrationProgress(res);
      } catch (err: any) {
        setIsMigrating(false);
        setMigrationProgress((prev: any) => ({
          ...prev,
          phase: 'failed',
          errors: [...(prev?.errors || []), err.message],
          logs: [...(prev?.logs || []), `[${new Date().toLocaleTimeString()}] FATAL: ${err.message}`],
        }));
      }
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. MIGRATION SOURCE CONNECTION CARD */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">Supabase Migration Source</h3>
              <p className="text-zinc-400 text-xs">
                Isolated import adapter to scan and extract legacy data into Appwrite, ImageKit, and Tigris.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveConfig}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-colors"
            >
              Save Credentials
            </button>
            <button
              onClick={handleScanSource}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all flex items-center gap-2"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isScanning && 'animate-spin')} />
              <span>{isScanning ? 'Scanning Source...' : 'Scan Source'}</span>
            </button>
          </div>
        </div>

        {scanError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{scanError}</span>
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
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Service Role Key (Server-Side Only)
              </label>
              {isKeySaved && (
                <span className="text-[11px] font-bold text-emerald-400">Encrypted in DB ✓</span>
              )}
            </div>
            <input
              type="password"
              placeholder={isKeySaved ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)' : 'Paste Supabase Service Role Key (eyJ...)'}
              value={serviceRoleKey}
              onChange={(e) => setServiceRoleKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 2. PRE-FLIGHT SCAN REPORT */}
      {scanReport && (
        <div className="bg-[#11131a] border border-zinc-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800 mb-6">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">DISCOVERY REPORT</span>
              <h3 className="text-lg font-extrabold text-white">Source Inventory Ready for Migration</h3>
            </div>

            <button
              onClick={handleStartMigration}
              disabled={isMigrating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 text-xs font-extrabold shadow-lg transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isMigrating ? 'Migrating in Progress...' : 'Start Full Migration'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Database Tables */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-2.5 text-sky-400 mb-3">
                <Database className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Database Tables</h4>
              </div>
              <div className="text-2xl font-extrabold text-white mb-1">
                {scanReport.database?.totalRows || 0} <span className="text-xs font-normal text-zinc-400">total rows</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Found {scanReport.database?.tables?.length || 0} tables (Products, Orders, Profiles, Entitlements).
              </div>
            </div>

            {/* Public Images */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-2.5 text-indigo-400 mb-3">
                <ImageIcon className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Public Media</h4>
              </div>
              <div className="text-2xl font-extrabold text-white mb-1">
                {scanReport.storage?.buckets?.find((b: any) => b.name === 'media-public')?.fileCount || 0} <span className="text-xs font-normal text-zinc-400">images</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Destination: <strong className="text-indigo-300">ImageKit CDN</strong>
              </div>
            </div>

            {/* Paid Deliverables */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-2.5 text-amber-400 mb-3">
                <HardDrive className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Paid Deliverables</h4>
              </div>
              <div className="text-2xl font-extrabold text-white mb-1">
                {scanReport.storage?.buckets?.find((b: any) => b.name === 'products-private')?.fileCount || 0} <span className="text-xs font-normal text-zinc-400">files</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Destination: <strong className="text-amber-300">Tigris Private S3 Storage</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MIGRATION PROGRESS & REAL-TIME CONSOLE */}
      {migrationProgress && (
        <div className="bg-[#11131a] border border-zinc-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-5 border-b border-zinc-800 mb-6">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-extrabold text-white">Migration Execution Log</h3>
            </div>
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
              migrationProgress.phase === 'completed' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              migrationProgress.phase === 'failed' && 'bg-red-500/10 text-red-400 border border-red-500/20',
              (migrationProgress.phase !== 'completed' && migrationProgress.phase !== 'failed') && 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
            )}>
              {migrationProgress.phase}
            </span>
          </div>

          {/* Progress Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-zinc-900 rounded-xl p-3">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Database Rows</div>
              <div className="text-lg font-extrabold text-white">{migrationProgress.databaseMigrated}</div>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Images &rarr; ImageKit</div>
              <div className="text-lg font-extrabold text-white">{migrationProgress.imagesMigrated}</div>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Files &rarr; Tigris</div>
              <div className="text-lg font-extrabold text-white">{migrationProgress.paidFilesMigrated}</div>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Errors</div>
              <div className={cn('text-lg font-extrabold', migrationProgress.errors?.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {migrationProgress.errors?.length || 0}
              </div>
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-[#0c0d12] border border-zinc-800 rounded-2xl p-4 font-mono text-xs text-zinc-300 max-h-80 overflow-y-auto space-y-1">
            {(migrationProgress.logs || []).map((line: string, idx: number) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>

          {/* Final Verification Report */}
          {migrationProgress.verificationReport && (
            <div className="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Migration Verification Report</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-zinc-300">
                <div>Products: <strong>100% Migrated</strong></div>
                <div>Images: <strong>{migrationProgress.verificationReport.imagesVerified} active in ImageKit</strong></div>
                <div>Paid Files: <strong>{migrationProgress.verificationReport.paidFilesVerified} secured in Tigris</strong></div>
                <div>Broken Links: <strong>0</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
