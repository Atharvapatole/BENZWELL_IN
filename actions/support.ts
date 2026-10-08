'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';
import { sendSupportTicketNotification, sendCustomerSupportReplyEmail } from '@/lib/email/resend';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export interface CreateSupportTicketPayload {
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject: string;
  description: string;
  benzwellOrderNumber?: string;
  razorpayOrderId?: string;
  attachments?: {
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
  }[];
}

/**
 * Generate collision-safe ticket number: BZ-SUP-YYYYMMDD-XXXX
 */
async function generateUniqueTicketNumber(): Promise<string> {
  const supabase = createAdminClient();
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  for (let attempt = 0; attempt < 5; attempt++) {
    const randomSuffix = crypto.randomInt(1000, 9999);
    const candidate = `BZ-SUP-${todayStr}-${randomSuffix}`;

    const { data: existing } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('ticket_number', candidate)
      .single();

    if (!existing) {
      return candidate;
    }
  }

  // Fallback timestamp-based suffix
  return `BZ-SUP-${todayStr}-${Date.now().toString().slice(-4)}`;
}

/**
 * Public / Customer Action: Submit a new support ticket
 */
export async function createSupportTicketAction(payload: CreateSupportTicketPayload) {
  try {
    const {
      name,
      email,
      phone,
      category,
      subject,
      description,
      benzwellOrderNumber,
      razorpayOrderId,
      attachments = [],
    } = payload;

    if (!name || !name.trim()) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!category || !category.trim()) {
      return { success: false, error: 'Please select an issue category.' };
    }
    if (!subject || !subject.trim()) {
      return { success: false, error: 'Please enter a subject.' };
    }
    if (!description || !description.trim()) {
      return { success: false, error: 'Please describe the problem in detail.' };
    }

    // Check if customer is authenticated
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    const supabase = createAdminClient();
    const ticketNumber = await generateUniqueTicketNumber();

    // Verify linked order if order number is provided
    let linkedOrderId: string | null = null;
    if (benzwellOrderNumber?.trim()) {
      const { data: ord } = await supabase
        .from('orders')
        .select('id')
        .or(`order_number.eq.${benzwellOrderNumber.trim()},id.eq.${benzwellOrderNumber.trim()}`)
        .single();
      if (ord) linkedOrderId = ord.id;
    }

    // 1. Insert support ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        user_id: user?.id || null,
        customer_name: name.trim(),
        customer_email: email.trim().toLowerCase(),
        customer_phone: phone?.trim() || null,
        category: category.trim(),
        subject: subject.trim(),
        description: description.trim(),
        order_id: linkedOrderId,
        benzwell_order_number: benzwellOrderNumber?.trim() || null,
        razorpay_order_id: razorpayOrderId?.trim() || null,
        status: 'open',
        priority: 'normal',
        source: 'contact_form',
      })
      .select()
      .single();

    if (ticketErr || !ticket) {
      console.error('Failed to insert support ticket:', ticketErr);
      return { success: false, error: 'Failed to create support ticket. Please try again.' };
    }

    // 2. Insert initial message
    const { data: msgRecord, error: msgErr } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_user_id: user?.id || null,
        sender_name: name.trim(),
        sender_email: email.trim().toLowerCase(),
        message: description.trim(),
        attachment_metadata: attachments,
      })
      .select()
      .single();

    // 3. Insert attachments if provided
    if (attachments.length > 0) {
      const attachRows = attachments.map((att) => ({
        ticket_id: ticket.id,
        message_id: msgRecord?.id || null,
        user_id: user?.id || null,
        storage_path: att.storagePath,
        original_filename: att.originalFilename,
        mime_type: att.mimeType,
        file_size: att.fileSize,
      }));
      await supabase.from('support_attachments').insert(attachRows);
    }

    // 4. Non-blocking Resend notification to admin (ceo.office.atharva@gmail.com)
    sendSupportTicketNotification({
      ticketNumber: ticket.ticket_number,
      customerName: name.trim(),
      customerEmail: email.trim().toLowerCase(),
      customerPhone: phone?.trim(),
      category: category.trim(),
      subject: subject.trim(),
      description: description.trim(),
      orderNumber: benzwellOrderNumber?.trim(),
    }).catch((err) => console.error('Support ticket email dispatch failed:', err));

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      user_email: email.trim().toLowerCase(),
      action: 'CREATE_SUPPORT_TICKET',
      entity: 'support_tickets',
      entity_id: ticket.id,
      metadata: { ticket_number: ticket.ticket_number, category },
    });

    return {
      success: true,
      ticketNumber: ticket.ticket_number,
      ticketId: ticket.id,
    };
  } catch (err: any) {
    console.error('createSupportTicketAction exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

/**
 * Admin: Get all support tickets with filtering, searching, and dashboard metrics
 */
export async function getAdminSupportTicketsAction(params: {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 15, 1), 50);
    const offset = (page - 1) * limit;

    // Fetch Dashboard Stats in parallel
    const todayISO = new Date();
    todayISO.setHours(0, 0, 0, 0);

    const [
      { count: totalCount },
      { count: openCount },
      { count: urgentCount },
      { count: waitingCustomerCount },
      { count: waitingAdminCount },
      { count: resolvedCount },
      { count: createdTodayCount },
    ] = await Promise.all([
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('priority', 'urgent'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'waiting_for_customer'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'waiting_for_admin'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).gte('created_at', todayISO.toISOString()),
    ]);

    // Build Query
    let q = supabase
      .from('support_tickets')
      .select('*, messages:support_messages(count)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.status && params.status !== 'all') {
      q = q.eq('status', params.status);
    }
    if (params.category && params.category !== 'all') {
      q = q.eq('category', params.category);
    }
    if (params.priority && params.priority !== 'all') {
      q = q.eq('priority', params.priority);
    }
    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      q = q.or(`ticket_number.ilike.${term},customer_name.ilike.${term},customer_email.ilike.${term},subject.ilike.${term},benzwell_order_number.ilike.${term}`);
    }

    q = q.range(offset, offset + limit - 1);

    const { data: tickets, count: filteredCount, error } = await q;

    if (error) throw error;

    return {
      success: true,
      tickets: tickets || [],
      totalCount: filteredCount || 0,
      page,
      limit,
      totalPages: Math.ceil((filteredCount || 0) / limit),
      stats: {
        total: totalCount || 0,
        open: openCount || 0,
        urgent: urgentCount || 0,
        waitingForCustomer: waitingCustomerCount || 0,
        waitingForAdmin: waitingAdminCount || 0,
        resolved: resolvedCount || 0,
        createdToday: createdTodayCount || 0,
      },
    };
  } catch (err: any) {
    console.error('getAdminSupportTicketsAction error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to fetch support tickets',
      tickets: [],
      stats: { total: 0, open: 0, urgent: 0, waitingForCustomer: 0, waitingForAdmin: 0, resolved: 0, createdToday: 0 },
    };
  }
}

/**
 * Admin: Get complete Ticket Detail Workspace
 */
export async function getAdminSupportTicketDetailAction(ticketId: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // 1. Fetch Ticket
    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets')
      .select('*')
      .or(`id.eq.${ticketId},ticket_number.eq.${ticketId}`)
      .single();

    if (tErr || !ticket) {
      return { success: false, error: 'Support ticket not found.' };
    }

    // 2. Fetch Messages & Attachments
    const [messagesRes, attachmentsRes] = await Promise.all([
      supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('support_attachments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true }),
    ]);

    // 3. Generate signed URLs for private attachments (15-minute expiry)
    const attachmentsWithUrls = await Promise.all(
      (attachmentsRes.data || []).map(async (att) => {
        const { data: signedData } = await supabase.storage
          .from('support-private')
          .createSignedUrl(att.storage_path, 900); // 15 mins
        return {
          ...att,
          signedUrl: signedData?.signedUrl || null,
        };
      })
    );

    // 4. Fetch Customer Profile if user_id exists
    let customerProfile = null;
    let customerOrders: any[] = [];
    let customerEntitlements: any[] = [];

    if (ticket.user_id) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', ticket.user_id).single();
      customerProfile = prof;

      const [ordersRes, entRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', ticket.user_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('customer_entitlements')
          .select('*, product:products(id, title, slug)')
          .eq('user_id', ticket.user_id),
      ]);

      customerOrders = ordersRes.data || [];
      customerEntitlements = entRes.data || [];
    } else if (ticket.benzwell_order_number) {
      // Look up specific order if guest provided order number
      const { data: ord } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', ticket.benzwell_order_number)
        .single();
      if (ord) customerOrders = [ord];
    }

    return {
      success: true,
      ticket,
      messages: messagesRes.data || [],
      attachments: attachmentsWithUrls,
      customerProfile,
      customerOrders,
      customerEntitlements,
    };
  } catch (err: any) {
    console.error('getAdminSupportTicketDetailAction exception:', err);
    return { success: false, error: err?.message || 'Failed to load ticket details' };
  }
}

/**
 * Admin: Reply to customer on support ticket
 */
export async function adminReplyToTicketAction(payload: {
  ticketId: string;
  replyText: string;
  sendEmailNotification?: boolean;
  statusUpdate?: string;
}) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const { ticketId, replyText, sendEmailNotification = true, statusUpdate } = payload;

    if (!replyText || !replyText.trim()) {
      return { success: false, error: 'Reply text cannot be empty.' };
    }

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket) return { success: false, error: 'Ticket not found.' };

    // 1. Insert message
    const { data: newMsg, error: msgErr } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_user_id: user.id,
        sender_name: profile.full_name || 'BenzWell Support Admin',
        sender_email: profile.email || 'info@benzwell.in',
        message: replyText.trim(),
        internal_note: false,
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // 2. Update ticket status
    const newStatus = statusUpdate || 'waiting_for_customer';
    await supabase
      .from('support_tickets')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
      })
      .eq('id', ticketId);

    // 3. Dispatch customer email via Resend if enabled
    if (sendEmailNotification) {
      sendCustomerSupportReplyEmail({
        ticketNumber: ticket.ticket_number,
        customerName: ticket.customer_name,
        customerEmail: ticket.customer_email,
        subject: ticket.subject,
        replyText: replyText.trim(),
      }).catch((err) => console.error('Failed to dispatch customer reply email:', err));
    }

    // 4. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'ADMIN_REPLY_SUPPORT_TICKET',
      entity: 'support_tickets',
      entity_id: ticketId,
      metadata: { ticket_number: ticket.ticket_number, newStatus },
    });

    revalidatePath('/admin/support');
    return { success: true, message: newMsg };
  } catch (err: any) {
    console.error('adminReplyToTicketAction error:', err);
    return { success: false, error: err?.message || 'Failed to send admin reply' };
  }
}

/**
 * Admin: Add private internal note to ticket (strictly invisible to customers)
 */
export async function adminAddInternalNoteAction(ticketId: string, noteText: string) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    if (!noteText || !noteText.trim()) {
      return { success: false, error: 'Internal note cannot be empty.' };
    }

    const { data: note, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_user_id: user.id,
        sender_name: profile.full_name || 'Admin',
        sender_email: profile.email || 'info@benzwell.in',
        message: noteText.trim(),
        internal_note: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/support');
    return { success: true, note };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add internal note' };
  }
}

/**
 * Admin: Update ticket status or priority
 */
export async function adminUpdateTicketMetaAction(
  ticketId: string,
  updates: { status?: string; priority?: string }
) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status) {
      payload.status = updates.status;
      if (updates.status === 'resolved') payload.resolved_at = new Date().toISOString();
      if (updates.status === 'closed') payload.closed_at = new Date().toISOString();
    }
    if (updates.priority) {
      payload.priority = updates.priority;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(payload)
      .eq('id', ticketId);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'UPDATE_TICKET_META',
      entity: 'support_tickets',
      entity_id: ticketId,
      metadata: updates,
    });

    revalidatePath('/admin/support');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update ticket metadata' };
  }
}

/**
 * Customer Account: Get user's own support tickets
 */
export async function getCustomerSupportTicketsAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required', tickets: [] };
    }

    const adminSupabase = createAdminClient();
    const { data: tickets, error } = await adminSupabase
      .from('support_tickets')
      .select('*, messages:support_messages(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, tickets: tickets || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch tickets', tickets: [] };
  }
}

/**
 * Customer Account: Get single ticket detail & conversation (Hiding internal notes)
 */
export async function getCustomerTicketDetailAction(ticketNumberOrId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const adminSupabase = createAdminClient();
    const { data: ticket, error: tErr } = await adminSupabase
      .from('support_tickets')
      .select('*')
      .or(`id.eq.${ticketNumberOrId},ticket_number.eq.${ticketNumberOrId}`)
      .single();

    if (tErr || !ticket || ticket.user_id !== user.id) {
      return { success: false, error: 'Support ticket not found.' };
    }

    // Fetch messages (strictly excluding internal notes)
    const { data: messages } = await adminSupabase
      .from('support_messages')
      .select('id, sender_type, sender_name, message, attachment_metadata, created_at')
      .eq('ticket_id', ticket.id)
      .eq('internal_note', false)
      .order('created_at', { ascending: true });

    return {
      success: true,
      ticket,
      messages: messages || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to load ticket' };
  }
}

/**
 * Customer: Add follow-up reply to their own ticket
 */
export async function customerReplyToTicketAction(ticketId: string, message: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Authentication required.' };
    if (!message || !message.trim()) return { success: false, error: 'Message cannot be empty.' };

    const adminSupabase = createAdminClient();
    const { data: ticket } = await adminSupabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket || ticket.user_id !== user.id) {
      return { success: false, error: 'Unauthorized ticket access.' };
    }

    const { data: newMsg, error } = await adminSupabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        sender_user_id: user.id,
        sender_name: ticket.customer_name,
        sender_email: ticket.customer_email,
        message: message.trim(),
        internal_note: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update ticket status to waiting_for_admin
    await adminSupabase
      .from('support_tickets')
      .update({
        status: 'waiting_for_admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    return { success: true, message: newMsg };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit reply.' };
  }
}
