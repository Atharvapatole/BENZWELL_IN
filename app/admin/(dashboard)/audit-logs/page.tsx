import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils';
import { Shield, Lock, CheckCircle2, User, Clock } from 'lucide-react';
import { AuditLog } from '@/types';

export const revalidate = 0;

export default async function AdminAuditLogsPage() {
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const logList: AuditLog[] = logs || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Security Audit Logs ({logList.length})
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 mt-1">
          Cryptographic records of administrative events, logins, publishing actions, and critical changes.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        {logList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-300 uppercase tracking-wider font-bold">
                  <th className="pb-3.5">Action</th>
                  <th className="pb-3.5">Entity</th>
                  <th className="pb-3.5">Admin / Actor</th>
                  <th className="pb-3.5">Details</th>
                  <th className="pb-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {logList.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3.5 font-bold text-white">
                      <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-mono font-semibold">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 text-zinc-200 capitalize font-medium">{log.entity}</td>

                    <td className="py-3.5 text-zinc-300">
                      {log.user_email || 'System Operation'}
                    </td>

                    <td className="py-3.5 text-zinc-400 font-mono text-[11px] max-w-[240px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>

                    <td className="py-3.5 text-right text-zinc-300">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 py-12 text-center">No security audit logs recorded yet.</p>
        )}
      </div>
    </div>
  );
}
