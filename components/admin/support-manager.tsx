'use client';

import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  User,
  Shield,
  Bot,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Lock,
  Mail,
  ShoppingBag,
  Download,
  AlertTriangle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAdminSupportTicketsAction,
  getAdminSupportTicketDetailAction,
  adminReplyToTicketAction,
  adminAddInternalNoteAction,
  adminUpdateTicketMetaAction,
} from '@/actions/support';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'waiting_for_admin', label: 'Waiting for Admin' },
  { value: 'waiting_for_customer', label: 'Waiting for Customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export function SupportManager() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    open: 0,
    urgent: 0,
    waitingForCustomer: 0,
    waitingForAdmin: 0,
    resolved: 0,
    createdToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Workspace Detail Modal State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Admin Actions State
  const [replyText, setReplyText] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [statusUpdateOption, setStatusUpdateOption] = useState('waiting_for_customer');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [internalNoteText, setInternalNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const loadTickets = React.useCallback(async () => {
    setIsLoading(true);
    const res = await getAdminSupportTicketsAction({
      status: statusFilter,
      priority: priorityFilter,
      search,
      page,
      limit: 15,
    });
    setIsLoading(false);

    if (res.success) {
      setTickets(res.tickets || []);
      setStats(res.stats);
      setTotalPages(res.totalPages || 1);
    }
  }, [statusFilter, priorityFilter, search, page]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTickets();
  };

  const handleOpenTicketWorkspace = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsDetailLoading(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    const res = await getAdminSupportTicketDetailAction(ticketId);
    setIsDetailLoading(false);

    if (res.success) {
      setTicketDetail(res);
      setStatusUpdateOption(res.ticket.status === 'open' ? 'waiting_for_customer' : res.ticket.status);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setIsSendingReply(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const res = await adminReplyToTicketAction({
      ticketId: ticketDetail.ticket.id,
      replyText,
      sendEmailNotification,
      statusUpdate: statusUpdateOption,
    });

    setIsSendingReply(false);

    if (res.success) {
      setReplyText('');
      setActionSuccessMsg('Reply sent successfully and logged.');
      // Refresh workspace detail
      handleOpenTicketWorkspace(ticketDetail.ticket.id);
      loadTickets();
    } else {
      setActionErrorMsg(res.error || 'Failed to send reply.');
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedTicketId) return;

    setIsAddingNote(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const res = await adminAddInternalNoteAction(ticketDetail.ticket.id, internalNoteText);
    setIsAddingNote(false);

    if (res.success) {
      setInternalNoteText('');
      setActionSuccessMsg('Internal note recorded.');
      handleOpenTicketWorkspace(ticketDetail.ticket.id);
    } else {
      setActionErrorMsg(res.error || 'Failed to add note.');
    }
  };

  const handleUpdateStatusOrPriority = async (updates: { status?: string; priority?: string }) => {
    if (!ticketDetail?.ticket?.id) return;
    const res = await adminUpdateTicketMetaAction(ticketDetail.ticket.id, updates);
    if (res.success) {
      handleOpenTicketWorkspace(ticketDetail.ticket.id);
      loadTickets();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">Open</span>;
      case 'waiting_for_admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Action Required</span>;
      case 'waiting_for_customer':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Waiting on Customer</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-300">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">URGENT</span>;
      case 'high':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">High</span>;
      case 'normal':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300">Normal</span>;
      case 'low':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/60 text-zinc-400">Low</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-300">{priority}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-sky-400" />
            <span>Customer Support Center</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage customer support tickets, AI escalations, orders, entitlements, and direct customer correspondence.
          </p>
        </div>

        <Button
          onClick={loadTickets}
          variant="outline"
          size="sm"
          className="rounded-xl border-zinc-700 text-xs gap-2 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#161822] border border-zinc-800/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Tickets</span>
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161822] border border-sky-900/40 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Open</span>
          <p className="text-2xl font-extrabold text-sky-400">{stats.open}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161822] border border-indigo-900/40 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Needs Admin</span>
          <p className="text-2xl font-extrabold text-indigo-400">{stats.waitingForAdmin}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161822] border border-amber-900/40 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Needs Customer</span>
          <p className="text-2xl font-extrabold text-amber-400">{stats.waitingForCustomer}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161822] border border-red-900/40 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Urgent</span>
          <p className="text-2xl font-extrabold text-red-400">{stats.urgent}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161822] border border-emerald-900/40 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Resolved</span>
          <p className="text-2xl font-extrabold text-emerald-400">{stats.resolved}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161822] border border-zinc-800/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Created Today</span>
          <p className="text-2xl font-extrabold text-white">{stats.createdToday}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#161822] border border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, customer name, email, order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl text-xs font-bold bg-sky-500 text-zinc-950 hover:bg-sky-400">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {PRIORITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl bg-[#161822] border border-zinc-800/80 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#11131a] border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Ticket #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Category & Order</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No support tickets found matching your query.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-sky-400">
                      #{t.ticket_number}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{t.customer_name}</span>
                        {t.user_id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Registered User" />
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">{t.customer_email}</span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-medium text-zinc-200">{t.category}</div>
                      {t.benzwell_order_number && (
                        <span className="font-mono text-[11px] text-sky-400">
                          {t.benzwell_order_number}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">{getPriorityBadge(t.priority)}</td>

                    <td className="py-4 px-4">{getStatusBadge(t.status)}</td>

                    <td className="py-4 px-4">
                      <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                        {t.source === 'support_ai' ? '🤖 AI Chat' : '📝 Contact'}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-zinc-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenTicketWorkspace(t.id)}
                        className="rounded-xl text-xs gap-1.5 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>Workspace</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Workspace Drawer / Modal */}
      {selectedTicketId && ticketDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-[#11131a] border-l border-zinc-800 min-h-screen flex flex-col shadow-2xl overflow-y-auto">
            {/* Workspace Header */}
            <div className="p-6 border-b border-zinc-800 bg-[#161822] flex items-center justify-between sticky top-0 z-20">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedTicketId(null);
                      setTicketDetail(null);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Ticket #{ticketDetail.ticket.ticket_number}</span>
                    {getStatusBadge(ticketDetail.ticket.status)}
                    {getPriorityBadge(ticketDetail.ticket.priority)}
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 pl-8">{ticketDetail.ticket.subject}</p>
              </div>

              {/* Status Update Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={ticketDetail.ticket.status}
                  onChange={(e) => handleUpdateStatusOrPriority({ status: e.target.value })}
                  className="h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
                >
                  <option value="open">Mark Open</option>
                  <option value="waiting_for_customer">Mark Waiting on Customer</option>
                  <option value="waiting_for_admin">Mark Waiting on Admin</option>
                  <option value="resolved">Mark Resolved</option>
                  <option value="closed">Mark Closed</option>
                </select>

                <select
                  value={ticketDetail.ticket.priority}
                  onChange={(e) => handleUpdateStatusOrPriority({ priority: e.target.value })}
                  className="h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>
            </div>

            {/* Notification Messages */}
            {actionSuccessMsg && (
              <div className="mx-6 mt-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}
            {actionErrorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionErrorMsg}</span>
              </div>
            )}

            {/* Workspace Content Grid */}
            <div className="p-6 space-y-6 flex-1">
              {/* Context Panels: Customer 360 + Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer 360 */}
                <div className="p-4 rounded-2xl bg-[#161822] border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                    <User className="w-4 h-4" />
                    <span>Customer Profile</span>
                  </div>
                  <div className="text-xs space-y-1 text-zinc-300">
                    <p><strong>Name:</strong> {ticketDetail.ticket.customer_name}</p>
                    <p><strong>Email:</strong> {ticketDetail.ticket.customer_email}</p>
                    {ticketDetail.ticket.customer_phone && (
                      <p><strong>Phone:</strong> {ticketDetail.ticket.customer_phone}</p>
                    )}
                    <p>
                      <strong>Account Status:</strong>{' '}
                      {ticketDetail.customerProfile ? (
                        <span className="text-emerald-400 font-semibold">Registered Customer</span>
                      ) : (
                        <span className="text-zinc-500">Guest User</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Purchase Information */}
                <div className="p-4 rounded-2xl bg-[#161822] border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Purchase & Order Data</span>
                  </div>
                  {ticketDetail.customerOrders && ticketDetail.customerOrders.length > 0 ? (
                    <div className="text-xs space-y-1.5 text-zinc-300">
                      {ticketDetail.customerOrders.map((ord: any) => (
                        <div key={ord.id} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sky-400">{ord.order_number}</span>
                            <span className="text-[10px] uppercase font-bold text-emerald-400">{ord.status}</span>
                          </div>
                          <p className="text-zinc-400">
                            Total: ₹{ord.total} • RZP Order: {ord.razorpay_order_id || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No linked orders found for this customer.</p>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              {ticketDetail.attachments && ticketDetail.attachments.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#161822] border border-zinc-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Uploaded Screenshots & Files (Private)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ticketDetail.attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.signedUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-xl text-xs text-sky-400 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{att.original_filename}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white px-1">Full Thread Timeline</h3>

                <div className="space-y-3">
                  {ticketDetail.messages.map((m: any) => {
                    const isInternal = m.internal_note;
                    const isCustomer = m.sender_type === 'customer';
                    const isAi = m.sender_type === 'support_ai';

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                          isInternal
                            ? 'bg-amber-950/20 border-amber-700/60'
                            : isCustomer
                            ? 'bg-sky-950/20 border-sky-800/60'
                            : isAi
                            ? 'bg-purple-950/20 border-purple-800/60'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            {isInternal ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>INTERNAL STAFF NOTE</span>
                              </span>
                            ) : (
                              <span className="font-bold text-white">
                                {isCustomer
                                  ? `Customer (${m.sender_name || 'Customer'})`
                                  : isAi
                                  ? '🤖 BenzWell Support AI'
                                  : `Staff (${m.sender_name || 'Admin'})`}
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-500 text-[10px]">
                            {new Date(m.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-zinc-200 whitespace-pre-wrap">{m.message}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply / Internal Note Composer */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                {/* Send Reply Form */}
                <form onSubmit={handleSendAdminReply} className="p-5 rounded-2xl bg-[#161822] border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      <span>Reply to Customer</span>
                    </h4>
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendEmailNotification}
                        onChange={(e) => setSendEmailNotification(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-sky-500"
                      />
                      <span>Email customer via info@benzwell.in</span>
                    </label>
                  </div>

                  <textarea
                    rows={4}
                    required
                    placeholder="Type official response to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">After reply, set status:</span>
                      <select
                        value={statusUpdateOption}
                        onChange={(e) => setStatusUpdateOption(e.target.value)}
                        className="h-8 px-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
                      >
                        <option value="waiting_for_customer">Waiting on Customer</option>
                        <option value="resolved">Resolved</option>
                        <option value="open">Keep Open</option>
                      </select>
                    </div>

                    <Button type="submit" size="sm" isLoading={isSendingReply} className="font-bold bg-sky-500 text-zinc-950 hover:bg-sky-400 gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reply</span>
                    </Button>
                  </div>
                </form>

                {/* Add Internal Staff Note */}
                <form onSubmit={handleAddInternalNote} className="p-4 rounded-2xl bg-amber-950/10 border border-amber-900/40 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Add Private Staff Note (Hidden from Customer)</span>
                  </h4>

                  <textarea
                    rows={2}
                    placeholder="Private investigation notes, razorpay transaction notes..."
                    value={internalNoteText}
                    onChange={(e) => setInternalNoteText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />

                  <div className="text-right">
                    <Button type="submit" size="sm" variant="outline" isLoading={isAddingNote} className="border-amber-700 text-amber-300 hover:bg-amber-950/40 text-xs">
                      Save Internal Note
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
