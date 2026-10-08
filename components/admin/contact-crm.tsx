'use client';

import React, { useState } from 'react';
import {
  getContactMessagesAction,
  getContactMessageThreadAction,
  replyContactMessageAction,
  updateContactStatusAction,
} from '@/actions/contact';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  Phone,
  Calendar,
  X,
  RefreshCw,
  CornerDownRight,
  ShieldCheck,
} from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
  replies?: { count: number }[];
}

interface ContactReply {
  id: string;
  message_id: string;
  admin_id?: string;
  admin_email: string;
  reply_text: string;
  sent_at: string;
}

interface ContactCRMProps {
  initialMessages: ContactMessage[];
}

export function ContactCRM({ initialMessages }: ContactCRMProps) {
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Thread Drawer State
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ContactReply[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMessages = async (filter = statusFilter, query = searchQuery) => {
    setIsLoading(true);
    const res = await getContactMessagesAction(filter, query);
    setIsLoading(false);
    if (res.success && res.messages) {
      setMessages(res.messages as any);
    }
  };

  const handleFilterChange = (filter: 'all' | 'new' | 'read' | 'replied' | 'closed') => {
    setStatusFilter(filter);
    fetchMessages(filter, searchQuery);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(statusFilter, searchQuery);
  };

  const handleOpenThread = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setIsLoadingThread(true);
    setReplyFeedback(null);
    setReplyText('');

    const res = await getContactMessageThreadAction(msg.id);
    setIsLoadingThread(false);

    if (res.success && res.message) {
      setSelectedMessage(res.message);
      setThreadReplies(res.replies || []);
      // Update local state if it transitioned from 'new' to 'read'
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id && m.status === 'new' ? { ...m, status: 'read' } : m))
      );
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setIsSendingReply(true);
    setReplyFeedback(null);

    const res = await replyContactMessageAction({
      messageId: selectedMessage.id,
      customerEmail: selectedMessage.email,
      customerName: selectedMessage.name,
      subject: selectedMessage.subject,
      replyText: replyText.trim(),
    });

    setIsSendingReply(false);

    if (res.success && res.reply) {
      setThreadReplies((prev) => [...prev, res.reply]);
      setReplyText('');
      setReplyFeedback({
        type: 'success',
        text: `✓ Response dispatched to ${selectedMessage.email} via info@benzwell.in.`,
      });
      setSelectedMessage((prev) => (prev ? { ...prev, status: 'replied' } : null));
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessage.id ? { ...m, status: 'replied' } : m))
      );
    } else {
      setReplyFeedback({
        type: 'error',
        text: `✕ ${res.error || 'Failed to dispatch reply.'}`,
      });
    }
  };

  const handleUpdateStatus = async (newStatus: 'new' | 'read' | 'replied' | 'closed') => {
    if (!selectedMessage) return;

    const res = await updateContactStatusAction(selectedMessage.id, newStatus);
    if (res.success) {
      setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessage.id ? { ...m, status: newStatus } : m))
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse">
            New
          </span>
        );
      case 'read':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Read
          </span>
        );
      case 'replied':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Replied
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-700/40 text-zinc-400 border border-zinc-700">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#11131a] border border-zinc-800">
          {(['all', 'new', 'read', 'replied', 'closed'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => handleFilterChange(filter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize ${
                statusFilter === filter
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-700 bg-[#11131a] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => fetchMessages()} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {/* Inquiries Table */}
      <div className="rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass overflow-hidden">
        {messages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#11131a] text-zinc-400 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Subject & Message Snippet</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Received</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => handleOpenThread(msg)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{msg.name}</span>
                        {msg.status === 'new' && (
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">{msg.email}</div>
                      {msg.phone && <div className="text-[10px] text-zinc-500">{msg.phone}</div>}
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="font-semibold text-zinc-200 truncate">
                        {msg.subject || 'General Inquiry'}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {msg.message}
                      </div>
                    </td>

                    <td className="p-4">
                      {getStatusBadge(msg.status)}
                    </td>

                    <td className="p-4 text-zinc-400 whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="p-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs border-zinc-700 hover:border-sky-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenThread(msg);
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1 text-sky-400" />
                        <span>View Thread</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <Mail className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-white">No Contact Inquiries Found</p>
            <p className="text-xs text-zinc-400">
              When customers submit the inquiry form on /contact, their messages will appear here and notify ceo.office.atharva@gmail.com.
            </p>
          </div>
        )}
      </div>

      {/* Thread Drawer Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4 bg-[#11131a]">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">
                    {selectedMessage.subject || 'Inquiry from ' + selectedMessage.name}
                  </h3>
                  {getStatusBadge(selectedMessage.status)}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  From <strong>{selectedMessage.name}</strong> ({selectedMessage.email})
                  {selectedMessage.phone ? ` • Tel: ${selectedMessage.phone}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedMessage.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white font-semibold focus:outline-none focus:border-sky-400 capitalize"
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Customer Initial Message */}
              <div className="p-4 rounded-2xl bg-[#0e1017] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    <span>{selectedMessage.name} (Customer)</span>
                  </div>
                  <span>
                    {new Date(selectedMessage.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <p className="text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed pt-1">
                  {selectedMessage.message}
                </p>
              </div>

              {/* Thread of Admin Replies */}
              {threadReplies.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Admin Reply History ({threadReplies.length})</span>
                  </h4>

                  {threadReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-4 rounded-2xl bg-sky-950/20 border border-sky-800/50 space-y-2 ml-4"
                    >
                      <div className="flex items-center justify-between text-zinc-400 border-b border-sky-900/40 pb-2">
                        <div className="flex items-center gap-2 font-bold text-sky-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>BenzWell Support ({reply.admin_email})</span>
                        </div>
                        <span className="text-[11px]">
                          {new Date(reply.sent_at).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-zinc-100 text-sm whitespace-pre-wrap leading-relaxed pt-1">
                        {reply.reply_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Box */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Send Reply via info@benzwell.in</span>
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    Recipient: <strong className="text-white">{selectedMessage.email}</strong>
                  </span>
                </div>

                {replyFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      replyFeedback.type === 'success'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950/60 text-red-300 border border-red-800'
                    }`}
                  >
                    {replyFeedback.text}
                  </div>
                )}

                <textarea
                  rows={4}
                  placeholder={`Write your response to ${selectedMessage.name}... The customer will receive this exact message in an official BenzWell email from info@benzwell.in.`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 leading-relaxed"
                />

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                    className="text-xs text-zinc-400"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendReply}
                    isLoading={isSendingReply}
                    disabled={!replyText.trim()}
                    className="bg-sky-500 hover:bg-sky-400 text-white font-bold"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>Send Email Response</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
