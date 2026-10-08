# BENZWELL — Production Deployment & Custom Domain Guide

This document explains how to deploy BENZWELL to **Vercel** and connect the production domain `benzwell.in`.

---

## 1. Deploying to Vercel

1. Push your code repository to GitHub/GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and import your repository.
3. Configure the **Environment Variables** in Vercel:

| Variable Name | Environment | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production & Preview | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production & Preview | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production & Preview | Supabase Service Role Secret (Server only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Production | Live Razorpay Key ID (`rzp_live_...`) |
| `RAZORPAY_KEY_ID` | Production | Live Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Production | Live Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Live Razorpay Webhook Secret |
| `RESEND_API_KEY` | Production | Resend Production API Key |
| `RESEND_FROM_EMAIL` | Production | `info@benzwell.in` |
| `RESEND_FROM_NAME` | Production | `BENZWELL` |
| `NEXT_PUBLIC_SITE_URL` | Production | `https://benzwell.in` |
| `GOOGLE_CLIENT_ID` | Production | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Production | Google OAuth Client Secret |
| `NEXT_PUBLIC_META_PIXEL_ID` | Production | Meta Pixel ID |
| `NEXT_PUBLIC_GA_ID` | Production | GA4 Measurement ID |

4. Click **Deploy**.

---

## 2. Connecting Custom Domain `benzwell.in`

1. In Vercel Project Settings -> **Domains**:
   * Add `benzwell.in` (and optionally `www.benzwell.in` with redirect).
2. Configure DNS Records in your domain registrar (e.g. GoDaddy, Namecheap, Cloudflare):
   * **A Record:** `@` -> `76.76.21.21`
   * **CNAME Record:** `www` -> `cname.vercel-dns.com`
3. Wait for SSL certificate issuance (automatic via Vercel).

---

## 3. Production Razorpay Webhook Configuration

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
3. **Webhook URL:** `https://benzwell.in/api/webhooks/razorpay`
4. **Secret:** Enter a strong random secret string (and set this as `RAZORPAY_WEBHOOK_SECRET` in Vercel).
5. **Active Events to Select:**
   * `order.paid`
   * `payment.captured`
   * `payment.failed`
6. Click **Save Webhook**.

---

## 4. Google OAuth Redirect URI Configuration

1. In the [Google Cloud Console](https://console.cloud.google.com) -> **APIs & Services** -> **Credentials**:
2. Under Authorized redirect URIs, add:
   * `https://benzwell.in/api/auth/callback/google`
   * `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   * `http://localhost:3000/api/auth/callback/google` (for local development)
