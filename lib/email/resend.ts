import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

export const OFFICIAL_BENZWELL_EMAIL = 'info@benzwell.in';
export const DEFAULT_FROM_EMAIL = 'BenzWell <info@benzwell.in>';
export const DEFAULT_REPLY_TO = 'info@benzwell.in';
export const CONTACT_NOTIFICATION_DESTINATION = 'ceo.office.atharva@gmail.com';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not configured in environment variables');
    return null;
  }
  return new Resend(apiKey);
}

export function getFromAddress(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL || OFFICIAL_BENZWELL_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || 'BenzWell';
  return `${fromName} <${fromEmail}>`;
}

/**
 * Replace {{variable}} template placeholders safely
 */
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return variables[key] !== undefined ? variables[key] : '';
  });
}

/**
 * Send Password Reset Recovery Link Email
 */
export async function sendPasswordResetEmail({
  email,
  customerName,
  resetUrl,
}: {
  email: string;
  customerName?: string;
  resetUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const subject = 'Reset Your BenzWell Password';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h2 style="color: #09090b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Reset Your Password</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Hello ${customerName || 'there'},</p>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">We received a request to reset the password for your BenzWell account. Click the secure link below to set a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
      </div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.5;">This recovery link is secure and will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send password reset email via Resend:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Resend reset password exception:', err);
    return { success: false, error: err?.message || 'Email delivery failed' };
  }
}

/**
 * Send Password Changed Confirmation Email
 */
export async function sendPasswordChangedConfirmationEmail({
  email,
  customerName,
}: {
  email: string;
  customerName?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const subject = 'Your BenzWell Password Has Been Updated';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h2 style="color: #09090b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Password Updated Successfully</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Hello ${customerName || 'there'},</p>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">The password for your BenzWell account has been changed successfully. You can now use your new password to sign in.</p>
      <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin-top: 20px;">If you did NOT make this change, please contact us immediately at <a href="mailto:info@benzwell.in" style="color: #0284c7;">info@benzwell.in</a> to secure your account.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Send 6-digit OTP verification email
 */
export async function sendVerificationEmail({
  email,
  customerName,
  otpCode,
}: {
  email: string;
  customerName: string;
  otpCode: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  let subject = `Your BenzWell Verification Code: ${otpCode}`;
  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h2 style="color: #09090b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Verify Your Email Address</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center;">Hello ${customerName || 'there'},</p>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center;">Please use the following 6-digit code to verify your BenzWell account and proceed with your order:</p>
      
      <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #09090b; font-family: monospace;">${otpCode}</span>
      </div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.5; text-align: center;">This code will expire in <strong>10 minutes</strong>. If you did not create an account or request this, you can safely ignore this email.</p>
      
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send verification email via Resend:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Resend exception:', err);
    return { success: false, error: err?.message || 'Email delivery failed' };
  }
}

/**
 * Send Customer Order Confirmation & Digital Product Access Email
 */
export async function sendOrderConfirmationEmail({
  email,
  customerName,
  orderNumber,
  totalAmount,
  items,
  fulfillmentToken,
  couponCode,
}: {
  email: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  items: { productName: string; price: number }[];
  fulfillmentToken?: string;
  couponCode?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in';
  const myDownloadsUrl = `${siteUrl}/account/downloads`;
  const directAccessUrl = fulfillmentToken ? `${siteUrl}/download/${fulfillmentToken}` : myDownloadsUrl;

  const productsHtml = items
    .map(
      (item) =>
        `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e4e4e7; font-size: 14px;">
          <span style="color: #09090b; font-weight: 500;">${item.productName}</span>
          <span style="color: #52525b; font-weight: 600;">₹${item.price.toLocaleString('en-IN')}</span>
        </div>`
    )
    .join('');

  const subject = `Order Confirmed: #${orderNumber} — Your BenzWell Digital Access`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h2 style="color: #09090b; font-size: 20px; font-weight: 700; margin-bottom: 8px; text-align: center;">Order Confirmed!</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center;">Hi ${customerName || 'Valued Customer'}, thank you for choosing BenzWell. Your payment of <strong>₹${totalAmount.toLocaleString('en-IN')}</strong> for order <strong>#${orderNumber}</strong> has been processed successfully.</p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Order Summary</h4>
        ${productsHtml}
        ${couponCode ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #16a34a;"><span>Coupon Applied:</span><span>${couponCode}</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; padding-top: 12px; font-size: 16px; font-weight: 700; color: #09090b; border-top: 2px solid #e2e8f0;">
          <span>Total Paid</span>
          <span>₹${totalAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${directAccessUrl}" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; margin-bottom: 10px;">Access Purchased Digital Files</a>
        <br />
        <a href="${myDownloadsUrl}" style="color: #0284c7; text-decoration: underline; font-size: 13px; font-weight: 500;">Or access anytime via My Account → My Downloads</a>
      </div>

      <p style="color: #71717a; font-size: 13px; text-align: center; line-height: 1.5;">Need assistance? Our support team is ready to help at <a href="mailto:info@benzwell.in" style="color: #0284c7;">info@benzwell.in</a>.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send order confirmation email:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Resend order email exception:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Admin New Sale Notification Email to CEO Office
 */
export async function sendAdminNewSaleEmail({
  orderNumber,
  razorpayOrderId,
  razorpayPaymentId,
  customerName,
  customerPhone,
  customerEmail,
  items,
  originalAmount,
  discountAmount,
  finalAmount,
  couponCode,
  creatorName,
  creatorCommissionAmount,
  verificationStatus = 'Verified & Paid',
}: {
  orderNumber: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  items: { productName: string; quantity: number; price: number }[];
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string | null;
  creatorName?: string | null;
  creatorCommissionAmount?: number | null;
  verificationStatus?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const ceoDestination = CONTACT_NOTIFICATION_DESTINATION;
  const subject = `New BenzWell Sale — Order #${orderNumber} (₹${finalAmount.toLocaleString('en-IN')})`;

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 6px 0; color: #09090b; font-weight: 500;">${item.productName}</td>
          <td style="padding: 6px 0; text-align: center; color: #52525b;">x${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; color: #09090b; font-weight: 600;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="border-bottom: 2px solid #09090b; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL NEW SALE NOTIFICATION</span>
      </div>
      <h3 style="color: #09090b; margin-top: 0; font-size: 18px;">Payment Captured — Order #${orderNumber}</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #71717a; width: 140px; font-weight: 600;">Customer Name:</td>
          <td style="padding: 6px 0; color: #09090b; font-weight: 700;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a; font-weight: 600;">Customer Email:</td>
          <td style="padding: 6px 0; color: #0284c7; font-weight: 600;"><a href="mailto:${customerEmail}">${customerEmail}</a></td>
        </tr>
        ${customerPhone ? `<tr><td style="padding: 6px 0; color: #71717a; font-weight: 600;">Customer Phone:</td><td style="padding: 6px 0; color: #09090b;">${customerPhone}</td></tr>` : ''}
        <tr>
          <td style="padding: 6px 0; color: #71717a; font-weight: 600;">Razorpay Order ID:</td>
          <td style="padding: 6px 0; color: #09090b; font-family: monospace;">${razorpayOrderId || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a; font-weight: 600;">Razorpay Payment ID:</td>
          <td style="padding: 6px 0; color: #09090b; font-family: monospace;">${razorpayPaymentId || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a; font-weight: 600;">Verification Status:</td>
          <td style="padding: 6px 0; color: #16a34a; font-weight: 700;">${verificationStatus}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #71717a; font-weight: 600;">Payment Date:</td>
          <td style="padding: 6px 0; color: #09090b;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
        </tr>
      </table>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #64748b;">Purchased Items</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${itemsHtml}
        </table>
        
        <div style="margin-top: 16px; pt-3; border-top: 1px solid #e2e8f0; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #71717a;">
            <span>Subtotal (Original):</span>
            <span>₹${originalAmount.toLocaleString('en-IN')}</span>
          </div>
          ${discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #16a34a;">
              <span>Discount Amount (${couponCode || 'Promo'}):</span>
              <span>-₹${discountAmount.toLocaleString('en-IN')}</span>
            </div>` : ''}
          <div style="display: flex; justify-content: space-between; padding: 8px 0 0 0; font-size: 16px; font-weight: 800; color: #09090b; border-top: 2px solid #e2e8f0;">
            <span>Final Paid Amount:</span>
            <span>₹${finalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      ${creatorName ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px;">
          <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 13px; text-transform: uppercase;">Creator Attribution & Commission</h4>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #1e3a8a;">
            <span>Creator Name:</span>
            <strong>${creatorName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #1e3a8a;">
            <span>Coupon Code:</span>
            <code>${couponCode}</code>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #1e3a8a;">
            <span>Creator Commission:</span>
            <strong>₹${(creatorCommissionAmount || 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 28px;">
        <a href="https://benzwell.in/admin/orders" style="background: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">View Order in Admin Panel</a>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: ceoDestination,
      subject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    console.error('Failed to send admin new sale email:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Payment Failed Notification Email
 */
export async function sendPaymentFailedEmail({
  email,
  customerName,
  orderNumber,
}: {
  email: string;
  customerName?: string;
  orderNumber: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const subject = `Payment Incomplete for Order #${orderNumber} — BenzWell`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h2 style="color: #dc2626; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Payment Not Completed</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Hello ${customerName || 'there'},</p>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">We noticed that the payment for your order <strong>#${orderNumber}</strong> was not completed. If any amount was debited by your bank, it will be automatically refunded by Razorpay within 3-5 business days.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://benzwell.in/cart" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Retry Checkout</a>
      </div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.5;">If you need assistance, please contact us at <a href="mailto:info@benzwell.in" style="color: #0284c7;">info@benzwell.in</a>.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail({
  email,
  customerName,
}: {
  email: string;
  customerName: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in';

  const subject = `Welcome to BenzWell, ${customerName}!`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h2 style="color: #09090b; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Welcome to BenzWell</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Hi ${customerName},</p>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Welcome to our community. BenzWell delivers practical digital products, blueprints, frameworks, and masterclasses designed to elevate your everyday work and learning.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${siteUrl}/shop" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Explore the Digital Catalog</a>
      </div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.5;">If you ever have any questions or need assistance, our support team is always here to help at info@benzwell.in.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Send Contact Us Inquiry Notification to CEO Office
 */
export async function sendContactInquiryNotificationEmail({
  name,
  email,
  phone,
  subject,
  message,
}: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const ceoDestination = CONTACT_NOTIFICATION_DESTINATION;
  const emailSubject = `[BenzWell Inquiry] ${subject || 'New Contact Submission'} — ${name}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="border-bottom: 2px solid #09090b; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL ADMIN NOTIFICATION</span>
      </div>
      <h3 style="color: #09090b; margin-top: 0; font-size: 18px;">New Customer Contact Inquiry Received</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #71717a; width: 120px; font-weight: 600;">Customer Name:</td>
          <td style="padding: 8px 0; color: #09090b; font-weight: 700;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #71717a; font-weight: 600;">Customer Email:</td>
          <td style="padding: 8px 0; color: #0284c7; font-weight: 600;"><a href="mailto:${email}">${email}</a></td>
        </tr>
        ${phone ? `<tr><td style="padding: 8px 0; color: #71717a; font-weight: 600;">Phone:</td><td style="padding: 8px 0; color: #09090b;">${phone}</td></tr>` : ''}
        ${subject ? `<tr><td style="padding: 8px 0; color: #71717a; font-weight: 600;">Subject:</td><td style="padding: 8px 0; color: #09090b; font-weight: 600;">${subject}</td></tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #71717a; font-weight: 600;">Submitted At:</td>
          <td style="padding: 8px 0; color: #09090b;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
        </tr>
      </table>

      <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #3f3f46; font-size: 13px; text-transform: uppercase;">Message Content:</h4>
        <p style="margin: 0; color: #09090b; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="https://benzwell.in/admin/contact" style="background: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open Inquiry in Admin CRM</a>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: ceoDestination,
      replyTo: email,
      subject: emailSubject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    console.error('Failed to notify CEO of inquiry:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Direct Admin Reply to Customer Inquiry
 */
export async function sendContactReplyEmail({
  toEmail,
  customerName,
  subject,
  replyText,
}: {
  toEmail: string;
  customerName: string;
  subject?: string;
  replyText: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const emailSubject = subject?.startsWith('Re:') ? subject : `Re: ${subject || 'Your BenzWell Inquiry'}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <h3 style="color: #09090b; font-size: 18px; font-weight: 700; margin-bottom: 12px;">Hello ${customerName || 'there'},</h3>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Thank you for contacting BenzWell. Our team has reviewed your inquiry and replied below:</p>
      
      <div style="background: #f8fafc; border-left: 4px solid #0284c7; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; font-size: 15px; line-height: 1.7; color: #0f172a; white-space: pre-wrap;">${replyText}</div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.5;">If you have further questions, simply reply directly to this email at <a href="mailto:info@benzwell.in" style="color: #0284c7;">info@benzwell.in</a>.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'BenzWell <info@benzwell.in>',
      to: toEmail,
      replyTo: 'info@benzwell.in',
      subject: emailSubject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    console.error('Failed to send contact reply email:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Gift Product Email
 */
export async function sendGiftProductEmail({
  toEmail,
  customerName,
  productName,
  message,
}: {
  toEmail: string;
  customerName: string;
  productName: string;
  message?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in';
  const downloadUrl = `${siteUrl}/account/downloads`;

  const subject = 'Congratulations! You received a gift from BenzWell 🎁';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 44px;">🎁</span>
      </div>
      <h2 style="color: #09090b; font-size: 22px; font-weight: 800; margin-bottom: 8px; text-align: center;">You&apos;ve Received a Gift!</h2>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center;">Hi ${customerName || 'there'},</p>
      <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center;">You have been gifted full access to <strong>${productName}</strong> on BenzWell!</p>
      
      ${
        message
          ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center; color: #166534; font-size: 15px; font-style: italic;">
              &ldquo;${message}&rdquo;
            </div>`
          : ''
      }

      <div style="text-align: center; margin: 32px 0;">
        <a href="${downloadUrl}" style="background: #09090b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">View My Downloads</a>
      </div>

      <p style="color: #71717a; font-size: 13px; text-align: center; line-height: 1.5;">This digital product has been added directly to your account. You can log in and download all files anytime.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'BenzWell <info@benzwell.in>',
      to: toEmail,
      replyTo: 'info@benzwell.in',
      subject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    console.error('Failed to send gift product email:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Support Ticket Notification to BenzWell Admin (ceo.office.atharva@gmail.com)
 */
export async function sendSupportTicketNotification({
  ticketNumber,
  customerName,
  customerEmail,
  customerPhone,
  category,
  subject,
  description,
  orderNumber,
}: {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  category: string;
  subject: string;
  description: string;
  orderNumber?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'ceo.office.atharva@gmail.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in';
  const adminUrl = `${siteUrl}/admin/support`;

  const emailSubject = `[SUPPORT TICKET] #${ticketNumber}: ${subject}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #09090b; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 800; letter-spacing: 1.5px; color: #09090b;">BENZWELL SUPPORT</span>
        <span style="background: #f4f4f5; color: #18181b; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">#${ticketNumber}</span>
      </div>

      <h2 style="color: #09090b; font-size: 18px; font-weight: 700; margin-bottom: 16px;">New Customer Support Inquiry</h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #71717a; width: 140px;">Customer:</td>
          <td style="padding: 8px 0; color: #09090b; font-weight: 600;">${customerName} (${customerEmail})</td>
        </tr>
        ${customerPhone ? `<tr><td style="padding: 8px 0; color: #71717a;">Phone:</td><td style="padding: 8px 0; color: #09090b; font-weight: 600;">${customerPhone}</td></tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Category:</td>
          <td style="padding: 8px 0; color: #0284c7; font-weight: 600;">${category}</td>
        </tr>
        ${orderNumber ? `<tr><td style="padding: 8px 0; color: #71717a;">Order Reference:</td><td style="padding: 8px 0; color: #16a34a; font-weight: 700;">${orderNumber}</td></tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Subject:</td>
          <td style="padding: 8px 0; color: #09090b; font-weight: 600;">${subject}</td>
        </tr>
      </table>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Customer Message:</h4>
        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
      </div>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${adminUrl}" style="background: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open in Support Workspace →</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">Automated notification generated by BenzWell System • ${new Date().toUTCString()}</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'BenzWell <info@benzwell.in>',
      to: adminEmail,
      replyTo: customerEmail,
      subject: emailSubject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    console.error('Failed to send support ticket email via Resend:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Admin Reply Email to Customer from BenzWell <info@benzwell.in>
 */
export async function sendCustomerSupportReplyEmail({
  ticketNumber,
  customerName,
  customerEmail,
  subject,
  replyText,
}: {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  replyText: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: 'Email service unconfigured' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benzwell.in';
  const ticketUrl = `${siteUrl}/account/support`;

  const emailSubject = `Update on Ticket #${ticketNumber}: ${subject}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #09090b;">BENZWELL</span>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
        <span style="color: #166534; font-size: 13px; font-weight: 600;">Response regarding Ticket #${ticketNumber}</span>
      </div>

      <h2 style="color: #09090b; font-size: 18px; font-weight: 700; margin-bottom: 12px;">Hello ${customerName || 'Valued Customer'},</h2>
      <p style="color: #52525b; font-size: 14px; line-height: 1.6;">Our support team has updated your ticket with the following response:</p>

      <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 20px 0;">
        <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${replyText}</p>
      </div>

      <p style="color: #52525b; font-size: 14px; line-height: 1.6;">You can view the complete conversation history and reply directly from your customer portal:</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${ticketUrl}" style="background: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">View Support Tickets</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} BENZWELL. All rights reserved. benzwell.in</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'BenzWell <info@benzwell.in>',
      to: customerEmail,
      replyTo: 'info@benzwell.in',
      subject: emailSubject,
      html,
    });
    return { success: !error, id: data?.id };
  } catch (err: any) {
    console.error('Failed to send customer reply email via Resend:', err);
    return { success: false, error: err?.message };
  }
}

