'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generateSupportAiResponse,
  type ChatMessage,
} from '@/lib/support-ai/provider-fallback';
import {
  SUPPORT_AI_TOOL_DEFINITIONS,
  executeSupportAiTool,
  type ToolExecutionContext,
} from '@/lib/support-ai/tools';
import crypto from 'crypto';

const SYSTEM_SUPPORT_PROMPT = `
You are the official AI Support Specialist for BENZWELL (benzwell.in), a premier digital products store specializing in AI prompt packs, developer workflows, ebook guides, and digital blueprints.

OBJECTIVE:
Resolve customer inquiries accurately, politely, and efficiently using real backend data.

STORE POLICIES & KNOWLEDGE:
1. Mandatory Customer Account:
   - BenzWell requires customers to create or log in to a verified account before purchasing. Guest checkout is not permitted to guarantee lifetime access and secure token generation.
2. Order Numbers:
   - Every purchase generates a distinct order number in the format: BZ-YYYYMMDD-XXXXXX (e.g. BZ-20260912-108249).
3. Digital Delivery & Download Access:
   - Upon successful payment or admin gift grant, orders are fulfilled instantly.
   - Customers receive an immediate order confirmation email dispatched via Resend containing the order number and secure download access.
   - Customers have permanent lifetime access in their customer dashboard under "Account → My Downloads".
   - Downloads are generated as secure, temporary signed URLs from private Supabase Storage.
4. Refund Policy:
   - Due to the nature of digital goods and immediate access delivery, sales are generally final. However, if a customer experiences a defective/corrupt file or an accidental duplicate charge, BenzWell will investigate and resolve it promptly.
5. Official Support Email:
   - info@benzwell.in

CRITICAL DECISION TREE & BEHAVIOR RULES:
1. Unauthenticated Guests:
   - If a guest asks for account-specific data (e.g. "Where is my order?", "I can't download my product"), politely explain that they must sign in to their BenzWell account so you can securely retrieve their purchases.
2. Authenticated Customer Inquiries ("Where is my download / order?"):
   - Step 1: FIRST remind the customer that their download link was immediately sent to their registered email address, and is also permanently available in their account under "Account → My Downloads".
   - Step 2: Look up their order history using get_my_orders or get_my_order_by_order_number.
   - Step 3: Check order payment status using verify_order_payment_status.
   - Step 4: Verify entitlement using get_my_entitlement_for_order or get_my_purchased_products.
   - Step 5: If the order is confirmed paid/gifted but the entitlement is not attached, invoke reconcile_missing_entitlement to automatically repair access.
   - Step 6: Generate an instant 5-minute temporary access button using create_secure_download_access.
   - Step 7: If the payment failed or is pending, explain the status clearly and advise them on how to retry checkout.
3. Escalations & Ticket Generation:
   - If a customer requests a refund, reports duplicate billing, is unhappy, or experiences technical file errors, call escalate_to_human_support or create_support_ticket.
4. Tone:
   - Highly professional, concise, reassuring, and premium. Never fabricate fake links, IDs, or mock data.
`;

/**
 * Handle user message in Support AI Chat
 */
export async function sendSupportAiMessageAction(payload: {
  sessionToken: string;
  messageText: string;
  attachments?: {
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
  }[];
}) {
  try {
    const { sessionToken, messageText, attachments = [] } = payload;
    if (!messageText?.trim() && attachments.length === 0) {
      return { success: false, error: 'Please enter a message or attach a screenshot.' };
    }

    // 1. Authenticate user if session exists
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    const supabase = createAdminClient();

    // 2. Retrieve or create support_ai_sessions record
    let { data: session } = await supabase
      .from('support_ai_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      const { data: newSession, error: sErr } = await supabase
        .from('support_ai_sessions')
        .insert({
          session_token: sessionToken,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (sErr) throw sErr;
      session = newSession;
    } else if (user && !session.user_id) {
      // Update session with user_id if customer logged in during session
      await supabase
        .from('support_ai_sessions')
        .update({ user_id: user.id })
        .eq('id', session.id);
      session.user_id = user.id;
    }

    // 3. Save User Message
    await supabase.from('support_ai_messages').insert({
      session_id: session.id,
      role: 'user',
      content: messageText.trim(),
      attachment_metadata: attachments,
    });

    // 4. Load recent conversation history (last 10 messages)
    const { data: dbMessages } = await supabase
      .from('support_ai_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(12);

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_SUPPORT_PROMPT },
      ...(dbMessages || []).map((m) => ({
        role: m.role as any,
        content: m.content,
      })),
    ];

    const executionContext: ToolExecutionContext = {
      userId: user?.id || null,
      customerEmail: user?.email || null,
      sessionId: session.id,
    };

    // 5. Invoke Multi-Provider AI Fallback (Groq -> Mistral -> Gemini)
    let aiResponse = await generateSupportAiResponse({
      messages: chatMessages,
      tools: SUPPORT_AI_TOOL_DEFINITIONS,
    });

    const uiActions: any[] = [];

    // 6. Handle Tool Calling Loop if tool calls requested
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      // Must append the assistant message with tool_calls first (required by OpenAI/Groq/Mistral specs)
      chatMessages.push({
        role: 'assistant',
        content: aiResponse.content || null,
        tool_calls: aiResponse.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });

      for (const toolCall of aiResponse.toolCalls) {
        const toolResult = await executeSupportAiTool(
          toolCall.name,
          toolCall.arguments,
          executionContext
        );

        // Record AI Action in audit table
        await supabase.from('support_ai_actions').insert({
          session_id: session.id,
          user_id: user?.id || null,
          action_type: toolCall.name,
          action_result_summary: toolResult.success
            ? JSON.stringify(toolResult.data).slice(0, 300)
            : toolResult.error,
          metadata: { args: toolCall.arguments, success: toolResult.success },
        });

        if (toolResult.uiAction) {
          uiActions.push(toolResult.uiAction);
        }

        // Add tool result to context
        chatMessages.push({
          role: 'tool',
          name: toolCall.name,
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult.data || { error: toolResult.error }),
        });
      }

      // Generate final assistant response after tool execution
      const followUpResponse = await generateSupportAiResponse({
        messages: chatMessages,
      });

      if (followUpResponse.content) {
        aiResponse.content = followUpResponse.content;
      }
    }

    // 7. Save Assistant Message
    await supabase.from('support_ai_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: aiResponse.content,
      model_used: aiResponse.modelUsed,
      provider_used: aiResponse.providerUsed,
    });

    // Update session model/provider
    await supabase
      .from('support_ai_sessions')
      .update({
        model_used: aiResponse.modelUsed,
        provider_used: aiResponse.providerUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    return {
      success: true,
      message: {
        role: 'assistant',
        content: aiResponse.content,
        provider: aiResponse.providerUsed,
        model: aiResponse.modelUsed,
      },
      uiActions,
    };
  } catch (err: any) {
    console.error('sendSupportAiMessageAction exception:', err);
    return {
      success: false,
      error: err?.message || 'Support AI service is temporarily unavailable.',
      message: {
        role: 'assistant',
        content:
          "I'm temporarily experiencing technical difficulty. Please contact our support team directly at info@benzwell.in or click 'Talk to Human Support' to submit your issue.",
        provider: 'fallback',
        model: 'system-human-fallback',
      },
      uiActions: [],
    };
  }
}

/**
 * Upload support screenshot or attachment into private bucket 'support-private'
 */
export async function uploadSupportAttachmentAction(formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    // File size check: Maximum 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File size exceeds 5MB limit.' };
    }

    // MIME type check
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Allowed formats: PNG, JPG, JPEG, WEBP, PDF.',
      };
    }

    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    const supabase = createAdminClient();

    // Auto-create bucket if missing
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.id === 'support-private')) {
      await supabase.storage.createBucket('support-private', {
        public: false,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ALLOWED_TYPES,
      });
    }

    const scopeFolder = user?.id || 'guest';
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${scopeFolder}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${cleanName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from('support-private')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      throw uploadErr;
    }

    // Generate temporary 15-minute preview signed URL
    const { data: signed } = await supabase.storage
      .from('support-private')
      .createSignedUrl(storagePath, 900);

    return {
      success: true,
      attachment: {
        storagePath,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        previewUrl: signed?.signedUrl || null,
      },
    };
  } catch (err: any) {
    console.error('uploadSupportAttachmentAction error:', err);
    return { success: false, error: err?.message || 'Attachment upload failed.' };
  }
}

/**
 * Retrieve session messages for persistent chat experience
 */
export async function getSupportAiSessionMessagesAction(sessionToken: string) {
  try {
    const supabase = createAdminClient();
    const { data: session } = await supabase
      .from('support_ai_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      return { success: true, messages: [] };
    }

    const { data: messages } = await supabase
      .from('support_ai_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    return { success: true, messages: messages || [] };
  } catch (err: any) {
    return { success: false, error: err?.message, messages: [] };
  }
}
