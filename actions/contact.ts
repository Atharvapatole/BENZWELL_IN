'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { sendContactInquiryNotificationEmail, sendContactReplyEmail } from '@/lib/email/resend';
import { revalidatePath } from 'next/cache';

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/**
 * Customer submits Contact Us inquiry
 */
export async function submitContactInquiryAction(payload: ContactSubmissionPayload) {
  try {
    const { name, email, phone, subject, message } = payload;

    if (!name || !name.trim()) {
      return { success: false, error: 'Please enter your name.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!message || !message.trim()) {
      return { success: false, error: 'Please enter your message.' };
    }

    const supabase = createAdminClient();

    // 1. Insert into contact_messages
    const { data: inserted, error: dbError } = await supabase
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        subject: subject?.trim() || null,
        message: message.trim(),
        status: 'new',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save contact message:', dbError);
      return { success: false, error: 'Failed to record your inquiry. Please try again.' };
    }

    // 2. Dispatch notification email to ceo.office.atharva@gmail.com
    await sendContactInquiryNotificationEmail({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      subject: subject?.trim(),
      message: message.trim(),
    });

    return { success: true, messageId: inserted.id };
  } catch (err: any) {
    console.error('submitContactInquiryAction exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

/**
 * Admin: Get contact messages list with optional status filter and search
 */
export async function getContactMessagesAction(statusFilter?: string, query?: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    let q = supabase
      .from('contact_messages')
      .select('*, replies:contact_replies(count)')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    if (query && query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`name.ilike.${term},email.ilike.${term},subject.ilike.${term},message.ilike.${term}`);
    }

    const { data, error } = await q;

    if (error) {
      return { success: false, error: error.message, messages: [] };
    }

    return { success: true, messages: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch contact inquiries.', messages: [] };
  }
}

/**
 * Admin: Get single message thread with all replies
 */
export async function getContactMessageThreadAction(messageId: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const [msgRes, repliesRes] = await Promise.all([
      supabase.from('contact_messages').select('*').eq('id', messageId).single(),
      supabase.from('contact_replies').select('*').eq('message_id', messageId).order('sent_at', { ascending: true }),
    ]);

    if (msgRes.error || !msgRes.data) {
      return { success: false, error: msgRes.error?.message || 'Message not found' };
    }

    // Auto mark as 'read' if it was 'new'
    if (msgRes.data.status === 'new') {
      await supabase.from('contact_messages').update({ status: 'read' }).eq('id', messageId);
      msgRes.data.status = 'read';
    }

    return {
      success: true,
      message: msgRes.data,
      replies: repliesRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to load inquiry thread' };
  }
}

/**
 * Admin: Send direct reply to customer from info@benzwell.in
 */
export async function replyContactMessageAction({
  messageId,
  customerEmail,
  customerName,
  subject,
  replyText,
}: {
  messageId: string;
  customerEmail: string;
  customerName: string;
  subject?: string;
  replyText: string;
}) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    if (!replyText || !replyText.trim()) {
      return { success: false, error: 'Reply text cannot be empty.' };
    }

    // 1. Send email to customer via Resend from info@benzwell.in
    const emailRes = await sendContactReplyEmail({
      toEmail: customerEmail,
      customerName,
      subject,
      replyText: replyText.trim(),
    });

    if (!emailRes.success) {
      return { success: false, error: emailRes.error || 'Failed to dispatch email to customer.' };
    }

    // 2. Save reply in contact_replies
    const { data: replyRecord, error: replyError } = await supabase
      .from('contact_replies')
      .insert({
        message_id: messageId,
        admin_id: user.id,
        admin_email: profile.email || 'info@benzwell.in',
        reply_text: replyText.trim(),
      })
      .select()
      .single();

    if (replyError) {
      console.error('Failed to save reply record:', replyError);
    }

    // 3. Update message status to 'replied'
    await supabase
      .from('contact_messages')
      .update({ status: 'replied', updated_at: new Date().toISOString() })
      .eq('id', messageId);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'REPLY_CONTACT_INQUIRY',
      entity: 'contact_messages',
      entity_id: messageId,
      metadata: { customerEmail, subject },
    });

    revalidatePath('/admin/contact');
    return { success: true, reply: replyRecord };
  } catch (err: any) {
    console.error('replyContactMessageAction exception:', err);
    return { success: false, error: err?.message || 'Failed to send reply.' };
  }
}

/**
 * Admin: Update status of inquiry (new, read, replied, closed)
 */
export async function updateContactStatusAction(messageId: string, status: 'new' | 'read' | 'replied' | 'closed') {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('contact_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'UPDATE_CONTACT_STATUS',
      entity: 'contact_messages',
      entity_id: messageId,
      metadata: { status },
    });

    revalidatePath('/admin/contact');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}

/**
 * Get unread inquiries count for badges
 */
export async function getUnreadContactCountAction() {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');

    return { success: true, count: count || 0 };
  } catch {
    return { success: true, count: 0 };
  }
}
