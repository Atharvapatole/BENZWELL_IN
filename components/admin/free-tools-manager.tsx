'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  toggleFreeToolStatusAction,
  deleteFreeToolAction,
} from '@/actions/free-tools';
import {
  Wrench,
  Plus,
  BarChart3,
  ExternalLink,
  Edit,
  Trash2,
  Power,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Github,
  Upload,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FreeToolDeployModal } from '@/components/admin/free-tool-deploy-modal';

export interface FreeToolsManagerProps {
  initialTools: any[];
}

export function FreeToolsManager({ initialTools }: FreeToolsManagerProps) {
  const [tools, setTools] = useState(initialTools);
  const [activeDeployTool, setActiveDeployTool] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = (tool: any) => {
    const nextStatus = tool.status === 'live' ? 'disabled' : 'live';
    startTransition(async () => {
      const res = await toggleFreeToolStatusAction(tool.id, nextStatus);
      if (res.success) {
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, status: nextStatus } : t))
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteFreeToolAction(id);
      if (res.success) {
        setTools((prev) => prev.filter((t) => t.id !== id));
        setDeleteConfirmId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-sky-400" />
            <span>Lead Generation & Free Tools</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Publish interactive tools that attract high-intent visitors and naturally recommend relevant BenzWell digital guides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/free-tools/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span>Funnel Analytics</span>
          </Link>
          <Link
            href="/admin/free-tools/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-sky-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Tool</span>
          </Link>
        </div>
      </div>

      {/* Tools Table */}
      <div className="bg-[#11131a] border border-zinc-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Tool & Slug</th>
                <th className="p-4">Status</th>
                <th className="p-4">Source / Method</th>
                <th className="p-4">Linked Product</th>
                <th className="p-4 text-center">Views</th>
                <th className="p-4 text-center">Starts</th>
                <th className="p-4 text-center">Leads</th>
                <th className="p-4 text-center">CTA Clicks</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {tools.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-500">
                    <Wrench className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                    <p className="font-semibold text-zinc-400">No Free Tools Created Yet</p>
                    <p className="text-xs mt-1">Create your first lead-generating tool to convert visitors into buyers.</p>
                  </td>
                </tr>
              ) : (
                tools.map((tool) => {
                  const isLive = tool.status === 'live';
                  const isDeploying = tool.status === 'deploying';
                  const isDraft = tool.status === 'draft';

                  return (
                    <tr key={tool.id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Name & Slug */}
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-white text-sm">{tool.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          /free-tools/{tool.slug}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase',
                            isLive && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                            isDeploying && 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse',
                            isDraft && 'bg-zinc-800 text-zinc-400',
                            tool.status === 'disabled' && 'bg-red-500/10 text-red-400 border border-red-500/20'
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isLive && 'bg-emerald-400',
                              isDeploying && 'bg-amber-400',
                              isDraft && 'bg-zinc-500',
                              tool.status === 'disabled' && 'bg-red-400'
                            )}
                          />
                          <span>{tool.status}</span>
                        </span>
                      </td>

                      {/* Deployment Method */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                          {tool.deployment_method === 'built_in' && (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                              <span>Native Engine</span>
                            </>
                          )}
                          {tool.deployment_method === 'github' && (
                            <>
                              <Github className="w-3.5 h-3.5 text-purple-400" />
                              <span className="font-mono text-[11px]">{tool.github_repo || 'GitHub'}</span>
                            </>
                          )}
                          {tool.deployment_method === 'zip' && (
                            <>
                              <Upload className="w-3.5 h-3.5 text-amber-400" />
                              <span>Vercel ZIP</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Linked Product */}
                      <td className="p-4">
                        {tool.product ? (
                          <div className="font-semibold text-sky-300 truncate max-w-[180px]">
                            {tool.product.title}
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">None Linked</span>
                        )}
                      </td>

                      {/* Stats */}
                      <td className="p-4 text-center font-bold text-zinc-200">{tool.stats?.views || 0}</td>
                      <td className="p-4 text-center font-bold text-zinc-200">{tool.stats?.starts || 0}</td>
                      <td className="p-4 text-center font-bold text-emerald-400">{tool.leadsCount || 0}</td>
                      <td className="p-4 text-center font-bold text-sky-400">{tool.stats?.ctaClicks || 0}</td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLive && (
                            <Link
                              href={`/free-tools/${tool.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                              title="Open Live Public Tool"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}

                          <button
                            onClick={() => setActiveDeployTool(tool)}
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors"
                            title="Deploy / Redeploy"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/admin/free-tools/${tool.id}`}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            title="Edit Tool"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleToggleStatus(tool)}
                            disabled={isPending}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              isLive
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                            )}
                            title={isLive ? 'Disable Tool' : 'Enable Tool'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(tool.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete Tool"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11131a] border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Confirm Tool Deletion</span>
            </h3>
            <p className="text-zinc-300 text-xs leading-relaxed mb-6">
              Are you sure you want to delete this Free Tool? This will permanently remove its configuration, associated deployment records, and lead funnel analytics.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {activeDeployTool && (
        <FreeToolDeployModal
          tool={activeDeployTool}
          onClose={() => setActiveDeployTool(null)}
          onDeploySuccess={(updatedTool) => {
            setTools((prev) =>
              prev.map((t) => (t.id === updatedTool.id ? { ...t, ...updatedTool } : t))
            );
            setActiveDeployTool(null);
          }}
        />
      )}
    </div>
  );
}
