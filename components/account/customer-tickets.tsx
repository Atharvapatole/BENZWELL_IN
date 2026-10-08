'use client';

import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Send,
  FileText,
  User,
  Shield,
  Bot,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  getCustomerSupportTicketsAction,
  getCustomerTicketDetailAction,
  customerReplyToTicketAction,
} from '@/actions/support';

export function CustomerTicketsManager() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketData, setSelectedTicketData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const loadTickets = async () => {
    setIsLoading(true);
    const res = await getCustomerSupportTicketsAction();
    setIsLoading(false);
    if (res.success) {
      setTickets(res.tickets || []);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleOpenTicket = async (ticketNumber: string) => {
    setSelectedTicketId(ticketNumber);
    setIsDetailLoading(true);
    setReplyError(null);

    const res = await getCustomerTicketDetailAction(ticketNumber);
    setIsDetailLoading(false);

    if (res.success) {
      setSelectedTicketData(res);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketData?.ticket?.id) return;

    setIsReplying(true);
    setReplyError(null);

    const res = await customerReplyToTicketAction(selectedTicketData.ticket.id, replyText);
    setIsReplying(false);

    if (res.success && res.message) {
      setSelectedTicketData((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), res.message],
      }));
      setReplyText('');
      loadTickets();
    } else {
      setReplyError(res.error || 'Failed to send message.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">Open</span>;
      case 'waiting_for_customer':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Action Required</span>;
      case 'waiting_for_admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Under Review</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-300">{status}</span>;
    }
  };

  if (selectedTicketId && selectedTicketData) {
    const { ticket, messages } = selectedTicketData;

    return (
      <div className="space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedTicketId(null);
              setSelectedTicketData(null);
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Tickets</span>
          </button>

          <div>{getStatusBadge(ticket.status)}</div>
        </div>

        {/* Ticket Header Card */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>Ticket #{ticket.ticket_number}</span>
            <span>•</span>
            <span>{new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">{ticket.subject}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-1">
            <span className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-700 dark:text-zinc-300">
              Category: <strong>{ticket.category}</strong>
            </span>
            {ticket.benzwell_order_number && (
              <span className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-700 dark:text-zinc-300">
                Order: <strong className="font-mono text-sky-400">{ticket.benzwell_order_number}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white px-1">Conversation History</h3>

          {messages.map((m: any) => {
            const isCustomer = m.sender_type === 'customer';
            const isAi = m.sender_type === 'support_ai';

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isCustomer
                    ? 'bg-sky-950/20 border-sky-800/60 ml-4 sm:ml-8'
                    : isAi
                    ? 'bg-purple-950/20 border-purple-800/60 mr-4 sm:mr-8'
                    : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800/80 mr-4 sm:mr-8'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    {isCustomer ? (
                      <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    ) : isAi ? (
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="font-bold text-xs text-zinc-950 dark:text-white">
                      {isCustomer ? 'You' : isAi ? 'BenzWell Support AI' : m.sender_name || 'BenzWell Support Team'}
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-500">
                    {new Date(m.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {m.message}
                </div>

                {m.attachment_metadata && m.attachment_metadata.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-200/40 dark:border-zinc-800 flex flex-wrap gap-2">
                    {m.attachment_metadata.map((att: any, idx: number) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg text-xs text-zinc-300"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>{att.originalFilename}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reply Composer */}
        {ticket.status !== 'closed' ? (
          <form onSubmit={handleSendReply} className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Send a Follow-up Message
            </h4>

            {replyError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{replyError}</span>
              </div>
            )}

            <textarea
              rows={4}
              required
              placeholder="Provide any additional details, questions, or clarification..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-3.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">Official reply will be notified via email</span>
              <Button type="submit" isLoading={isReplying} disabled={!replyText.trim()} className="font-bold gap-2">
                <Send className="w-4 h-4" />
                <span>Send Reply</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-700 text-center text-xs text-zinc-400">
            This ticket has been marked as closed. If you need further assistance, please submit a new ticket.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">Support Tickets</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track your open inquiries, conversation history, and responses from the BenzWell support team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/support-ai"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-bold transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Support AI</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading support tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-white">No Support Tickets Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              You haven&apos;t created any support tickets yet. Need help with an order or product download?
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/support-ai"
              className="px-4 py-2 rounded-xl bg-sky-500 text-zinc-950 font-bold text-xs hover:bg-sky-400 transition-colors"
            >
              Ask Support AI
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs hover:bg-zinc-700 transition-colors"
            >
              Submit Ticket
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => handleOpenTicket(t.ticket_number)}
              className="w-full text-left p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-sky-500/50 hover:shadow-glass-lg transition-all flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-sky-400 transition-colors">
                    #{t.ticket_number}
                  </span>
                  {getStatusBadge(t.status)}
                  <span className="text-[11px] text-zinc-500 hidden sm:inline">• {t.category}</span>
                </div>
                <h4 className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                  {t.subject}
                </h4>
                <p className="text-xs text-zinc-500">
                  Created on {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors flex-shrink-0">
                <span className="text-xs font-semibold hidden sm:inline">View Thread</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
