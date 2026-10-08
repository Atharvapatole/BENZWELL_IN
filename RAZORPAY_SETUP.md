# BENZWELL — RAZORPAY INTEGRATION & ACTIVATION GUIDE

This document explains how to set up Razorpay once your Razorpay Merchant Account is approved. Until credentials are provided, BenzWell operates in an unconfigured state without crashing or faking payments.

---

## 1. Creating Your Razorpay Account
1. Sign up at [https://razorpay.com](https://razorpay.com).
2. Complete KYC and business verification for **BenzWell** (`https://benzwell.in`).
3. Generate API Keys in **Razorpay Dashboard → Settings → API Keys**:
   - **Key ID** (`rzp_test_...` or `rzp_live_...`)
   - **Key Secret**

---

## 2. Setting Up the Webhook Endpoint
In **Razorpay Dashboard → Settings → Webhooks → Add New Webhook**:

- **Webhook URL:** `https://benzwell.in/api/webhooks/razorpay`
- **Secret:** Generate a secure random string (save this as your `RAZORPAY_WEBHOOK_SECRET`).
- **Active Events to Select:**
  - `order.paid`
  - `payment.captured`
  - `payment.failed`

---

## 3. Configuring Credentials in BenzWell

You can configure Razorpay in one of two ways:

### Method A: Admin Settings Panel (Recommended)
1. Log in to `https://benzwell.in/admin`.
2. Navigate to **Settings → Payments**.
3. Select **Mode:** `Test` (for testing) or `Live` (for real transactions).
4. Enter **Key ID**, **Key Secret**, and **Webhook Secret**.
5. Click **Save Razorpay Credentials**.
6. Click **Test Connection** to verify API connectivity.
*(Keys are stored in Supabase encrypted with AES-256-GCM and never sent to browser JavaScript).*

### Method B: Environment Variables
Add the following to your Hostinger server environment or `.env.production`:
```ini
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_key_id
```

---

## 4. End-to-End Post-Payment Flow Architecture

```
1. Customer initiates payment on https://benzwell.in/checkout
2. Razorpay popup verifies card/UPI
3. On success:
   ├── Synchronous: Client submits signature to Server Action `verifyPaymentAndFulfillOrder`
   └── Asynchronous: Razorpay sends webhook payload to `/api/webhooks/razorpay`
4. Server verifies HMAC SHA-256 cryptographic signature
5. Order marked as PAID & FULFILLED (Idempotent execution)
6. Permanent record created in `customer_entitlements`
7. 5-minute temporary token created in `order_fulfillment_tokens`
8. Customer redirected to `/thank-you/[slug]?token=[token]`
9. 3-second automatic countdown transitions to `/download/[token]`
10. Download page presents 5-minute live countdown timer and secure download button
11. Secure 60-second signed Supabase Storage URL generated to `products-private`
```
