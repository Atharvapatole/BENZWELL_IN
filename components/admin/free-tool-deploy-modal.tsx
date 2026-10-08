'use client';

import React, { useState, useEffect, useTransition } from 'react';
import JSZip from 'jszip';
import {
  deployFreeToolAction,
  validateZipProjectAction,
  fetchGitHubReposAction,
  fetchGitHubBranchesAction,
} from '@/actions/free-tools';
import {
  X,
  Upload,
  FolderUp,
  Github,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Play,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FreeToolDeployModalProps {
  tool: any;
  onClose: () => void;
  onDeploySuccess: (updatedTool: any) => void;
}

export function FreeToolDeployModal({
  tool,
  onClose,
  onDeploySuccess,
}: FreeToolDeployModalProps) {
  const [method, setMethod] = useState<'built_in' | 'zip' | 'github'>(
    tool.deployment_method || 'built_in'
  );

  // Method A (ZIP / Folder) state
  const [uploadType, setUploadType] = useState<'zip' | 'folder'>('zip');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipBase64, setZipBase64] = useState<string>('');
  const [zipValidation, setZipValidation] = useState<any>(null);
  const [isValidatingZip, setIsValidatingZip] = useState(false);

  // Method B (GitHub) state
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>(tool.github_repo || '');
  const [branches, setBranches] = useState<string[]>(['main']);
  const [selectedBranch, setSelectedBranch] = useState<string>(tool.github_branch || 'main');
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // Deployment progress state
  const [deployStep, setDeployStep] = useState<'idle' | 'validating' | 'deploying' | 'verifying' | 'success' | 'error'>('idle');
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // Load GitHub repos when GitHub tab is selected
  useEffect(() => {
    if (method === 'github' && repos.length === 0) {
      setIsLoadingRepos(true);
      fetchGitHubReposAction().then((res) => {
        setIsLoadingRepos(false);
        if (res.success && res.repos) {
          setRepos(res.repos);
          if (!selectedRepo && res.repos.length > 0) {
            setSelectedRepo(res.repos[0].fullName);
          }
        }
      });
    }
  }, [method, repos.length, selectedRepo]);

  // Load branches when selectedRepo changes
  useEffect(() => {
    if (selectedRepo) {
      fetchGitHubBranchesAction(selectedRepo).then((res) => {
        if (res.success && res.branches) {
          setBranches(res.branches);
          if (!res.branches.includes(selectedBranch)) {
            setSelectedBranch(res.branches[0] || 'main');
          }
        }
      });
    }
  }, [selectedRepo, selectedBranch]);

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setDeployError('Only .zip project archives are supported.');
      return;
    }

    setZipFile(file);
    setIsValidatingZip(true);
    setDeployError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setZipBase64(base64);

      const val = await validateZipProjectAction(base64);
      setIsValidatingZip(false);
      setZipValidation(val);
      if (!val.valid) {
        setDeployError(val.error || 'ZIP archive failed validation check.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsValidatingZip(true);
    setDeployError(null);

    try {
      const zip = new JSZip();
      let hasPkg = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = (file as any).webkitRelativePath || file.name;

        // Skip heavy / sensitive dirs
        if (
          relativePath.includes('node_modules/') ||
          relativePath.includes('.next/') ||
          relativePath.includes('.git/') ||
          relativePath.endsWith('.env.local')
        ) {
          continue;
        }

        if (relativePath.endsWith('package.json')) {
          hasPkg = true;
        }

        zip.file(relativePath, file);
      }

      if (!hasPkg) {
        setIsValidatingZip(false);
        setDeployError('The selected folder does not contain a package.json file. Please select a valid Next.js project directory.');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setZipBase64(base64);

        const val = await validateZipProjectAction(base64);
        setIsValidatingZip(false);
        setZipValidation(val);
        if (!val.valid) {
          setDeployError(val.error || 'Folder project failed validation check.');
        }
      };
      reader.readAsDataURL(zipBlob);
    } catch (err: any) {
      setIsValidatingZip(false);
      setDeployError(`Failed to process project folder: ${err.message}`);
    }
  };

  const handleTriggerDeploy = () => {
    setDeployStep('deploying');
    setDeployError(null);

    startTransition(async () => {
      try {
        const payload: any = {};
        if (method === 'zip') {
          if (!zipBase64) {
            setDeployStep('error');
            setDeployError('Please upload and validate a Next.js ZIP project first.');
            return;
          }
          payload.zipBase64 = zipBase64;
        }

        if (method === 'github') {
          if (!selectedRepo) {
            setDeployStep('error');
            setDeployError('Please select a GitHub repository.');
            return;
          }
          payload.repo = selectedRepo;
          payload.branch = selectedBranch;
        }

        const res = await deployFreeToolAction(tool.id, method, payload);

        if (res.success) {
          setDeployStep('success');
          setDeployResult(res);
          onDeploySuccess({
            ...tool,
            status: 'live',
            deployment_method: method,
            production_url: res.productionUrl,
          });
        } else {
          setDeployStep('error');
          setDeployError(res.error || 'Deployment failed');
        }
      } catch (err: any) {
        setDeployStep('error');
        setDeployError(err.message || 'Deployment error');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-zinc-800 mb-6">
          <div>
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              DEPLOYMENT MANAGER
            </span>
            <h3 className="text-xl font-extrabold text-white">
              Deploy & Publish: {tool.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-2.5 p-1.5 bg-zinc-900 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setMethod('built_in')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
              method === 'built_in'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Native Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('zip')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
              method === 'zip'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Upload className="w-4 h-4" />
            <span>Upload ZIP</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('github')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
              method === 'github'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repo</span>
          </button>
        </div>

        {/* 1. NATIVE ENGINE CONFIG */}
        {method === 'built_in' && (
          <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  BenzWell Native AI Interactive Engine
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Deploys instantly on your primary domain at{' '}
                  <strong className="text-sky-300 font-mono">https://benzwell.in/free-tools/{tool.slug}</strong>.
                  Uses server-side multi-provider AI fallback (Groq &rarr; Mistral &rarr; Gemini) and captures leads directly into your database.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. ZIP / FOLDER UPLOAD CONFIG */}
        {method === 'zip' && (
          <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setUploadType('zip')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  uploadType === 'zip' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-zinc-400 hover:text-white'
                )}
              >
                Upload ZIP Archive
              </button>
              <button
                type="button"
                onClick={() => setUploadType('folder')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  uploadType === 'folder' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-zinc-400 hover:text-white'
                )}
              >
                Select Project Folder
              </button>
            </div>

            {uploadType === 'zip' ? (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Upload Next.js Project Archive (.zip)
                </label>
                <div className="border-2 border-dashed border-zinc-700 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                  <div className="text-xs font-bold text-zinc-300">
                    {zipFile ? zipFile.name : 'Click or Drag & Drop project ZIP here'}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Validates package.json, next.config, and prevents path traversal
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Select Project Folder from Device
                </label>
                <div className="border-2 border-dashed border-zinc-700 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    /* @ts-ignore */
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FolderUp className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                  <div className="text-xs font-bold text-zinc-300">
                    Click to select complete Next.js project directory
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Direct folder upload automatically validates package.json and packages project securely.
                  </div>
                </div>
              </div>
            )}

            {isValidatingZip && (
              <div className="text-xs text-sky-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validating Next.js project structure...</span>
              </div>
            )}

            {zipValidation?.valid && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Valid Next.js Project ({zipValidation.filesCount} files analyzed, package.json verified).
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. GITHUB REPOSITORY CONFIG */}
        {method === 'github' && (
          <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-6">
            {isLoadingRepos ? (
              <div className="text-xs text-zinc-400 flex items-center justify-center p-6 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>Fetching repositories from connected GitHub account...</span>
              </div>
            ) : repos.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                No GitHub repositories found. Please configure your GitHub token in Admin &rarr; Settings &rarr; Infrastructure.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Select Repository
                  </label>
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.fullName}>
                        {r.fullName} {r.isPrivate ? '(Private)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Select Branch
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deploy Alerts / Output */}
        {deployError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-2 mb-6">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{deployError}</span>
          </div>
        )}

        {deployStep === 'success' && deployResult && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2 mb-6">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Free Tool Deployed & Live!</span>
            </div>
            <div className="text-xs text-zinc-300">
              Live at:{' '}
              <a
                href={deployResult.productionUrl || `/free-tools/${tool.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline font-mono ml-1 inline-flex items-center gap-1"
              >
                <span>{deployResult.productionUrl || `https://benzwell.in/free-tools/${tool.slug}`}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
          >
            {deployStep === 'success' ? 'Close' : 'Cancel'}
          </button>

          {deployStep !== 'success' && (
            <button
              type="button"
              onClick={handleTriggerDeploy}
              disabled={isPending || deployStep === 'deploying'}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all"
            >
              {deployStep === 'deploying' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deploying to Isolated Host...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Deployment & Publish</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
