/**
 * BenzWell Support AI — Controlled Server-Side Tool Execution Layer
 * 
 * Strict Security Rules:
 * 1. Authenticated user ID is the single source of truth for account/order access.
 * 2. Unauthenticated guests can NEVER inspect order details or download links; they are instructed to sign in.
 * 3. Never expose internal database schemas, API keys, or private storage paths.
 * 4. All download access requires verified paid order + active entitlement + 5-minute cryptographic token.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/razorpay';
import { sendSupportTicketNotification } from '@/lib/email/resend';
import crypto from 'crypto';
import type { ToolDefinition } from './provider-fallback';

export interface ToolExecutionContext {
  userId?: string | null;
  customerEmail?: string | null;
  sessionId: string;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  uiAction?: {
    type: 'download_ready' | 'ticket_created' | 'escalated' | 'auth_required';
    payload: any;
  };
}

/**
 * Tool Definitions exposed to the AI model
 */
export const SUPPORT_AI_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_authenticated_customer_profile',
    description: 'Retrieve safe account information for the currently authenticated customer. Requires logged-in session.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_my_orders',
    description: 'Retrieve the list of recent orders belonging to the currently logged-in customer.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of orders to retrieve (default 5)' },
      },
    },
  },
  {
    name: 'get_my_order_by_order_number',
    description: 'Look up an order by its BenzWell Order Number (e.g. BZ-20260912-XXXXXX). Strictly scoped to the authenticated customer.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number, e.g. BZ-20260912-108249' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'get_order_by_benzwell_order_id',
    description: 'Alias for looking up an order by its BenzWell Order Number.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'verify_order_payment_status',
    description: 'Perform server-side database and live Razorpay verification for a customer order.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'BenzWell order number or internal UUID' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'verify_order_payment',
    description: 'Alias for verifying order payment status.',
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Internal Order UUID or BenzWell order number' },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_my_purchased_products',
    description: 'Get all purchased digital products and entitlements belonging to the logged-in customer.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_my_entitlement_for_order',
    description: 'Check whether an active digital entitlement is linked to a specific customer order.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'verify_order_entitlement',
    description: 'Confirm that digital product rights are active and permanent for an order.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'check_download_availability',
    description: 'Verify remaining download limits, active status, and availability for a purchased product.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'reconcile_missing_entitlement',
    description: 'Auto-reconcile and grant missing digital entitlement if payment is verified paid in database or Razorpay.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'create_secure_download_access',
    description: 'Generate a secure 5-minute temporary download access link for an eligible purchased product.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The BenzWell order number or UUID' },
        product_id: { type: 'string', description: 'Optional product UUID if multiple products exist' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'create_support_ticket',
    description: 'Create an official BenzWell support ticket when an issue requires escalation or customer assistance.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category: payment_issue, download_issue, account_issue, content_issue, refund_request, or general_inquiry',
        },
        subject: { type: 'string', description: 'Concise summary of the problem' },
        description: { type: 'string', description: 'Detailed explanation of the issue and conversation summary' },
        order_number: { type: 'string', description: 'Optional BenzWell Order Number if relevant' },
        customer_name: { type: 'string', description: 'Customer full name if known' },
        customer_email: { type: 'string', description: 'Customer email address if known' },
        priority: { type: 'string', description: 'low, normal, high, or urgent' },
      },
      required: ['category', 'subject', 'description'],
    },
  },
  {
    name: 'escalate_to_human_support',
    description: 'Escalate an active support issue directly to human BenzWell administrators.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for escalation (e.g. refund request, payment dispute, missing entitlement)' },
        severity: { type: 'string', description: 'normal, high, or urgent' },
        order_number: { type: 'string', description: 'Optional relevant order number' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'get_support_ticket_status',
    description: 'Check the status of an existing support ticket by ticket number (e.g. BZ-SUP-20260912-0001).',
    parameters: {
      type: 'object',
      properties: {
        ticket_number: { type: 'string', description: 'The ticket number to check' },
      },
      required: ['ticket_number'],
    },
  },
];

/**
 * Execute a single tool call with strict authorization checks
 */
export async function executeSupportAiTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const supabase = createAdminClient();

  try {
    switch (toolName) {
      // 1. Customer Profile
      case 'get_authenticated_customer_profile': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'User is not signed in. Please ask the customer to sign in to access their account profile.',
            uiAction: { type: 'auth_required', payload: { message: 'Please sign in to view your account.' } },
          };
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, is_verified, created_at')
          .eq('id', ctx.userId)
          .single();

        return {
          toolName,
          success: true,
          data: profile || { id: ctx.userId, email: ctx.customerEmail },
        };
      }

      // 2. Get My Orders
      case 'get_my_orders': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Authentication required. Please ask the customer to log in to view their orders.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to check your orders.' } },
          };
        }

        const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
        const { data: orders, error } = await supabase
          .from('orders')
          .select('id, order_number, order_type, product_name_snapshot, status, payment_status, fulfillment_status, delivery_status, claimed_at, final_amount, total, currency, created_at, order_items(product_name_snapshot, quantity)')
          .eq('user_id', ctx.userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return {
          toolName,
          success: true,
          data: {
            total_found: orders?.length || 0,
            orders: (orders || []).map((o) => ({
              order_number: o.order_number,
              order_type: o.order_type || 'razorpay_purchase',
              product: o.product_name_snapshot || o.order_items?.[0]?.product_name_snapshot || 'Digital Product',
              payment_status: o.payment_status || o.status,
              fulfillment_status: o.fulfillment_status || 'available',
              delivery_status: o.delivery_status || 'delivered',
              claimed: !!o.claimed_at,
              total_inr: o.final_amount ?? o.total,
              date: o.created_at,
            })),
          },
        };
      }

      // 3. Get Order by Order Number
      case 'get_my_order_by_order_number':
      case 'get_order_by_benzwell_order_id': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'For account security, orders can only be looked up when signed in. Please ask the customer to sign in.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to look up order details.' } },
          };
        }

        const orderNumber = String(args.order_number || args.order_id || '').trim();
        const { data: order, error } = await supabase
          .from('orders')
          .select('id, order_number, order_type, user_id, status, payment_status, fulfillment_status, delivery_status, claimed_at, product_name_snapshot, coupon_code, subtotal_amount, final_amount, total, created_at, razorpay_order_id, razorpay_payment_id, order_items(product_id, product_name_snapshot, price_snapshot)')
          .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
          .single();

        if (error || !order) {
          return {
            toolName,
            success: false,
            error: `No order found with identifier "${orderNumber}". Please verify the order number format (e.g. BZ-20260912-XXXXXX).`,
          };
        }

        // Strict Ownership Enforcement: Must match authenticated user
        if (order.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'This order does not belong to your currently logged-in account. For security, please log into the account used during checkout.',
          };
        }

        return {
          toolName,
          success: true,
          data: {
            order_number: order.order_number,
            order_type: order.order_type || 'razorpay_purchase',
            product_name: order.product_name_snapshot || order.order_items?.[0]?.product_name_snapshot,
            payment_status: order.payment_status || order.status,
            fulfillment_status: order.fulfillment_status || 'available',
            delivery_status: order.delivery_status || 'delivered',
            claimed_at: order.claimed_at,
            total: order.final_amount ?? order.total,
            coupon_code: order.coupon_code,
            date: order.created_at,
            items: order.order_items,
          },
        };
      }

      // 4. Verify Order Payment Status
      case 'verify_order_payment_status':
      case 'verify_order_payment': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Authentication required to verify orders.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to verify payment.' } },
          };
        }

        const orderId = String(args.order_number || args.order_id || '').trim();
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, user_id, order_type, status, payment_status, razorpay_order_id, razorpay_payment_id')
          .or(`order_number.eq.${orderId},id.eq.${orderId}`)
          .single();

        if (!order || order.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Order not found in your account.',
          };
        }

        if (order.order_type === 'admin_gift' || order.payment_status === 'gifted') {
          return {
            toolName,
            success: true,
            data: {
              order_number: order.order_number,
              status: 'paid',
              payment_status: 'gifted',
              verified: true,
              is_gift: true,
              message: 'This product was granted to your account as a complimentary BenzWell courtesy gift.',
            },
          };
        }

        // If order is paid/fulfilled locally, return confirmed
        if (order.status === 'paid' || order.status === 'fulfilled' || order.payment_status === 'paid') {
          return {
            toolName,
            success: true,
            data: {
              order_number: order.order_number,
              status: order.status,
              payment_status: order.payment_status || 'paid',
              verified: true,
              message: 'Payment has been successfully verified and confirmed on the server.',
            },
          };
        }

        // If pending, perform live server verification against Razorpay
        let rzpPaymentStatus = 'pending';
        let rzpDetails: any = null;

        try {
          const razorpay = await getRazorpayClient();
          if (razorpay && order.razorpay_order_id) {
            const paymentsList: any = await razorpay.orders.fetchPayments(order.razorpay_order_id);
            if (paymentsList?.items && paymentsList.items.length > 0) {
              const latestPayment = paymentsList.items[0];
              rzpPaymentStatus = latestPayment.status;
              rzpDetails = {
                payment_id: latestPayment.id,
                status: latestPayment.status,
                amount: latestPayment.amount / 100,
                method: latestPayment.method,
              };

              if (rzpPaymentStatus === 'captured') {
                await supabase
                  .from('orders')
                  .update({
                    status: 'fulfilled',
                    payment_status: 'paid',
                    fulfillment_status: 'delivered',
                    delivery_status: 'delivered',
                    delivered_at: new Date().toISOString(),
                  })
                  .eq('id', order.id);
              }
            }
          }
        } catch (rzpErr: any) {
          console.warn('[SupportAI] Live Razorpay check warning:', rzpErr?.message);
        }

        return {
          toolName,
          success: true,
          data: {
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            verified: order.status === 'paid' || order.status === 'fulfilled' || rzpPaymentStatus === 'captured',
            razorpay_details: rzpDetails,
          },
        };
      }

      // 5. Get My Purchased Products
      case 'get_my_purchased_products': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Please sign in to view your purchased products.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to view your library.' } },
          };
        }

        const { data: entitlements, error } = await supabase
          .from('customer_entitlements')
          .select(`
            id,
            is_active,
            is_gift,
            downloads_used,
            download_limit,
            created_at,
            product:products(id, title, slug, main_image)
          `)
          .eq('user_id', ctx.userId)
          .eq('is_active', true);

        if (error) throw error;

        return {
          toolName,
          success: true,
          data: {
            total_active_entitlements: entitlements?.length || 0,
            products: (entitlements || []).map((e) => ({
              product_id: (e.product as any)?.id,
              title: (e.product as any)?.title,
              slug: (e.product as any)?.slug,
              is_gift: e.is_gift,
              downloads_used: e.downloads_used,
              download_limit: e.download_limit,
              unlocked_at: e.created_at,
            })),
          },
        };
      }

      // 6. Get Entitlement for Order
      case 'get_my_entitlement_for_order':
      case 'verify_order_entitlement': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Please sign in to inspect entitlements.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to check entitlement.' } },
          };
        }

        const orderNumber = String(args.order_number || '').trim();
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, user_id, product_id, status, payment_status')
          .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
          .single();

        if (!order || order.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Order not found in your account.',
          };
        }

        const { data: entitlement } = await supabase
          .from('customer_entitlements')
          .select('id, product_id, is_active, is_gift, downloads_used, download_limit, gift_message, product:products(title, slug)')
          .eq('user_id', ctx.userId)
          .eq('order_id', order.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!entitlement) {
          return {
            toolName,
            success: true,
            data: {
              order_number: order.order_number,
              has_active_entitlement: false,
              message: 'No active digital entitlement record found for this order. It may require reconciliation.',
            },
          };
        }

        return {
          toolName,
          success: true,
          data: {
            order_number: order.order_number,
            has_active_entitlement: true,
            product_title: (entitlement.product as any)?.title,
            is_gift: entitlement.is_gift,
            downloads_used: entitlement.downloads_used,
            download_limit: entitlement.download_limit,
            can_download: entitlement.downloads_used < entitlement.download_limit,
          },
        };
      }

      // 7. Check Download Availability
      case 'check_download_availability': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Please sign in to check file availability.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to check downloads.' } },
          };
        }

        const orderNumber = String(args.order_number || '').trim();
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, user_id, status, payment_status')
          .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
          .single();

        if (!order || order.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Order not found in your account.',
          };
        }

        const { data: ent } = await supabase
          .from('customer_entitlements')
          .select('id, is_active, downloads_used, download_limit, product:products(title, product_file_url)')
          .eq('user_id', ctx.userId)
          .eq('order_id', order.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!ent) {
          return {
            toolName,
            success: true,
            data: {
              available: false,
              reason: 'No active entitlement linked to order.',
            },
          };
        }

        return {
          toolName,
          success: true,
          data: {
            available: ent.downloads_used < ent.download_limit,
            downloads_used: ent.downloads_used,
            download_limit: ent.download_limit,
            product_title: (ent.product as any)?.title,
            file_ready: !!(ent.product as any)?.product_file_url,
          },
        };
      }

      // 8. Reconcile Missing Entitlement
      case 'reconcile_missing_entitlement': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Authentication required for entitlement reconciliation.',
          };
        }

        const orderNumber = String(args.order_number || '').trim();
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, user_id, product_id, status, payment_status, order_items(product_id)')
          .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
          .single();

        if (!order || order.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Order not found in your account.',
          };
        }

        const isPaid = order.status === 'paid' || order.status === 'fulfilled' || order.payment_status === 'paid' || order.payment_status === 'gifted';
        if (!isPaid) {
          return {
            toolName,
            success: false,
            error: `Order is currently in ${order.payment_status || order.status} status. Only confirmed orders can be reconciled.`,
          };
        }

        const productId = order.product_id || order.order_items?.[0]?.product_id;
        if (!productId) {
          return {
            toolName,
            success: false,
            error: 'Could not determine product for this order.',
          };
        }

        // Check if exists
        const { data: existing } = await supabase
          .from('customer_entitlements')
          .select('id')
          .eq('user_id', ctx.userId)
          .eq('order_id', order.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from('customer_entitlements').insert({
            user_id: ctx.userId,
            product_id: productId,
            order_id: order.id,
            is_active: true,
            is_gift: order.payment_status === 'gifted',
            download_limit: 10,
            downloads_used: 0,
          });

          await supabase
            .from('orders')
            .update({
              fulfillment_status: 'available',
              delivery_status: 'delivered',
            })
            .eq('id', order.id);
        }

        return {
          toolName,
          success: true,
          data: {
            order_number: order.order_number,
            reconciled: true,
            message: 'Digital entitlement has been successfully restored and is active under Account → My Downloads.',
          },
        };
      }

      // 9. Create Secure 5-Minute Download Access
      case 'create_secure_download_access': {
        if (!ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Authentication required. Please sign in to access download files.',
            uiAction: { type: 'auth_required', payload: { message: 'Sign in to download your products.' } },
          };
        }

        const orderIdentifier = String(args.order_number || args.order_id || '').trim();
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, user_id, status, payment_status')
          .or(`order_number.eq.${orderIdentifier},id.eq.${orderIdentifier}`)
          .single();

        if (!order || order.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'Order could not be verified under your account.',
          };
        }

        if (order.status !== 'paid' && order.status !== 'fulfilled' && order.payment_status !== 'gifted') {
          return {
            toolName,
            success: false,
            error: `Order payment status is ${order.payment_status}. Only confirmed orders qualify for download access.`,
          };
        }

        // Verify active entitlement
        const { data: entitlement } = await supabase
          .from('customer_entitlements')
          .select('id, product_id, is_active, product:products(title, slug)')
          .eq('user_id', ctx.userId)
          .eq('order_id', order.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!entitlement) {
          return {
            toolName,
            success: false,
            error: 'Verified entitlement is missing. Reconcile entitlement or request assistance.',
          };
        }

        // Generate / retrieve 5-minute temporary token in order_fulfillment_tokens
        const tokenString = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabase
          .from('order_fulfillment_tokens')
          .upsert(
            {
              order_id: order.id,
              token: tokenString,
              expires_at: expiresAt,
            },
            { onConflict: 'order_id' }
          );

        return {
          toolName,
          success: true,
          data: {
            token: tokenString,
            expires_in_seconds: 300,
            product_title: (entitlement.product as any)?.title,
            download_url: `/download/${tokenString}`,
            permanent_library_url: '/account/downloads',
          },
          uiAction: {
            type: 'download_ready',
            payload: {
              token: tokenString,
              product_title: (entitlement.product as any)?.title,
              download_url: `/download/${tokenString}`,
            },
          },
        };
      }

      // 10. Create Support Ticket
      case 'create_support_ticket': {
        const category = String(args.category || 'general_inquiry');
        const subject = String(args.subject || 'Support Request');
        const description = String(args.description || '');
        const orderNumber = args.order_number ? String(args.order_number).trim() : null;
        const priority = ['low', 'normal', 'high', 'urgent'].includes(args.priority) ? args.priority : 'normal';

        let customerName = args.customer_name || 'Valued Customer';
        let customerEmail = args.customer_email || ctx.customerEmail || 'info@benzwell.in';

        if (ctx.userId) {
          const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', ctx.userId).single();
          if (prof) {
            customerName = prof.full_name || customerName;
            customerEmail = prof.email || customerEmail;
          }
        }

        let orderId: string | null = null;
        if (orderNumber) {
          const { data: ord } = await supabase.from('orders').select('id').or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`).single();
          if (ord) orderId = ord.id;
        }

        // Insert support ticket
        const { data: ticket, error: ticketErr } = await supabase
          .from('support_tickets')
          .insert({
            user_id: ctx.userId || null,
            customer_name: customerName,
            customer_email: customerEmail,
            category,
            subject,
            description,
            order_id: orderId,
            benzwell_order_number: orderNumber,
            status: 'waiting_for_admin',
            priority,
            source: 'support_ai',
            ai_summary: `Created via Support AI session ${ctx.sessionId}. Category: ${category}`,
          })
          .select()
          .single();

        if (ticketErr || !ticket) {
          throw new Error(`Failed to create ticket: ${ticketErr?.message}`);
        }

        // Insert initial message
        await supabase.from('support_messages').insert({
          ticket_id: ticket.id,
          sender_type: 'support_ai',
          message: `Ticket automatically logged by BenzWell Support AI.\n\nDescription: ${description}`,
          ai_generated: true,
        });

        // Non-blocking notification email to admin
        sendSupportTicketNotification({
          ticketNumber: ticket.ticket_number,
          customerName,
          customerEmail,
          category,
          subject,
          description,
          orderNumber: orderNumber || undefined,
        }).catch((err) => console.error('Error dispatching support ticket email:', err));

        return {
          toolName,
          success: true,
          data: {
            ticket_number: ticket.ticket_number,
            status: ticket.status,
            priority: ticket.priority,
            message: `Your support ticket ${ticket.ticket_number} has been created and routed to our team.`,
          },
          uiAction: {
            type: 'ticket_created',
            payload: {
              ticket_number: ticket.ticket_number,
              subject,
            },
          },
        };
      }

      // 11. Escalate to Human Support
      case 'escalate_to_human_support': {
        const reason = String(args.reason || 'Customer requested human assistance');
        const severity = args.severity === 'urgent' ? 'urgent' : 'high';
        const orderNumber = args.order_number ? String(args.order_number).trim() : null;

        let customerName = 'Valued Customer';
        let customerEmail = ctx.customerEmail || 'info@benzwell.in';

        if (ctx.userId) {
          const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', ctx.userId).single();
          if (prof) {
            customerName = prof.full_name || customerName;
            customerEmail = prof.email || customerEmail;
          }
        }

        const { data: ticket, error: ticketErr } = await supabase
          .from('support_tickets')
          .insert({
            user_id: ctx.userId || null,
            customer_name: customerName,
            customer_email: customerEmail,
            category: 'human_escalation',
            subject: `[Escalation] ${reason.slice(0, 60)}`,
            description: `Escalated by Support AI:\n\nReason: ${reason}\nSession: ${ctx.sessionId}\nOrder: ${orderNumber || 'N/A'}`,
            benzwell_order_number: orderNumber,
            status: 'waiting_for_admin',
            priority: severity,
            source: 'support_ai',
            ai_summary: `Escalation requested. Reason: ${reason}`,
          })
          .select()
          .single();

        if (ticketErr || !ticket) {
          throw new Error(`Failed to create escalation ticket: ${ticketErr?.message}`);
        }

        sendSupportTicketNotification({
          ticketNumber: ticket.ticket_number,
          customerName,
          customerEmail,
          category: 'Escalated Support Case',
          subject: `[ESCALATION] ${reason.slice(0, 60)}`,
          description: reason,
          orderNumber: orderNumber || undefined,
        }).catch((err) => console.error('Error dispatching escalation email:', err));

        return {
          toolName,
          success: true,
          data: {
            ticket_number: ticket.ticket_number,
            status: 'waiting_for_admin',
            message: `Your issue has been escalated to BenzWell Support. Your ticket number is ${ticket.ticket_number}.`,
          },
          uiAction: {
            type: 'escalated',
            payload: {
              ticket_number: ticket.ticket_number,
              reason,
            },
          },
        };
      }

      // 12. Get Support Ticket Status
      case 'get_support_ticket_status': {
        const ticketNumber = String(args.ticket_number || '').trim();
        const { data: ticket, error } = await supabase
          .from('support_tickets')
          .select('ticket_number, user_id, category, subject, status, priority, created_at, updated_at')
          .eq('ticket_number', ticketNumber)
          .single();

        if (error || !ticket) {
          return {
            toolName,
            success: false,
            error: `Support ticket "${ticketNumber}" was not found. Please verify the ticket number.`,
          };
        }

        if (ticket.user_id && ctx.userId && ticket.user_id !== ctx.userId) {
          return {
            toolName,
            success: false,
            error: 'You do not have authorization to view this ticket.',
          };
        }

        return {
          toolName,
          success: true,
          data: {
            ticket_number: ticket.ticket_number,
            category: ticket.category,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
          },
        };
      }

      default:
        return {
          toolName,
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${toolName}:`, err);
    return {
      toolName,
      success: false,
      error: err?.message || 'Tool execution encountered an internal error.',
    };
  }
}

