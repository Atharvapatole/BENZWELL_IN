# BENZWELL — ENVIRONMENT VARIABLES SPECIFICATION

Canonical Production Domain: `https://benzwell.in`

This document details every environment variable used in BenzWell, its security scope, and whether it is mandatory for initial deployment or optional for future configuration.

---

## 1. Environment Variable Reference Matrix

| Variable Name | Scope | Required Now? | Description & Value Format |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Public / SSR | **YES** | Platform canonical URL: `https://benzwell.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / SSR | **YES** | Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / SSR | **YES** | Supabase Anonymous / Client public key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public / SSR | Optional | Alternative alias for Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | **YES** | Privileged key for Server Actions & Webhooks |
| `RAZORPAY_KEY_ID` | Server Only | *Future* | Razorpay API Key ID (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | **Server Only** | *Future* | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | **Server Only** | *Future* | Razorpay Webhook Signing Secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public / SSR | *Future* | Razorpay Key ID for client checkout modal |
| `RESEND_API_KEY` | **Server Only** | *Future* | Resend API Key (`re_...`) |
| `RESEND_FROM_EMAIL` | Server Only | Optional | Default sender address: `info@benzwell.in` |
| `RESEND_FROM_NAME` | Server Only | Optional | Default sender name: `BenzWell` |
| `RESEND_REPLY_TO` | Server Only | Optional | Default reply address: `info@benzwell.in` |
| `GOOGLE_CLIENT_ID` | Server / SSR | *Future* | Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | **Server Only** | *Future* | Google Cloud OAuth 2.0 Client Secret |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Public | *Optional* | Google Analytics 4 ID (`G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Public | *Optional* | Meta (Facebook Ads) Pixel ID |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Public | *Optional* | Microsoft Clarity Project ID |
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | Public | *Optional* | Google Tag Manager ID (`GTM-XXXXXXX`) |

---

## 2. Unconfigured Service Behavior

BenzWell is engineered with resilient fallback handling when optional third-party services are unconfigured:

- **Razorpay Not Configured:** Checkout displays *"Online payments are currently unavailable. Please try again later."* Admin panel displays status as `Not Configured`. Free products ($0 / 100% coupon) continue to fulfill normally.
- **Resend Not Configured:** Email dispatch operations return `{ success: false, error: 'Email service unconfigured' }` without throwing unhandled exceptions. Admin panel displays status as `Not Configured`.
- **Google OAuth / Analytics Not Configured:** Google login and tracking scripts are suppressed and omitted from the DOM until credentials are provided.

---

## 3. Security Guidelines

1. **Never commit `.env` or `.env.local` to Git.** Ensure `.gitignore` ignores all local environment files.
2. `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `RESEND_API_KEY` must never be exposed to client-side components or prefixed with `NEXT_PUBLIC_`.
