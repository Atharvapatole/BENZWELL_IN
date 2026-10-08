# BenzWell — Vercel Production Deployment Guide

This document contains the end-to-end, production-ready deployment procedure for launching **BenzWell** ([https://benzwell.in](https://benzwell.in)) on **Vercel** with full Serverless runtime, Supabase PostgreSQL & Auth, Razorpay Payments, and Resend Transactional Email.

---

## 1. Architecture Overview

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions, Route Handlers)
- **Runtime**: Vercel Serverless Functions (`nodejs20.x`)
- **Database, Auth & Storage**: Supabase (PostgreSQL, Supabase SSR Auth, Private & Public Storage Buckets)
- **Payment Gateway**: Razorpay (Client Checkout SDK + Server-Side Signature Verification + Webhook Handler)
- **Transactional Email**: Resend (`info@benzwell.in` / `BenzWell <info@benzwell.in>`)
- **Canonical Production Domain**: `https://benzwell.in`
- **Vercel Preview / Fallback Domain**: `https://benzwell.vercel.app`
- **Admin Panel**: `https://benzwell.in/admin`

---

## 2. GitHub Repository Preparation

1. **Initialize & Commit Code**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production-ready BenzWell platform for Vercel deployment"
   ```
2. **Link to GitHub Repository**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/Atharvapatole/benzwell-store.git
   git push -u origin main
   ```
   *(Ensure `.env`, `.env.local`, and `node_modules/` are excluded by `.gitignore`)*

---

## 3. Vercel Project Creation & Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** → **"Project"**.
2. Select your repository (`Atharvapatole/benzwell-store`).
3. Configure Project Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
   - **Node.js Version**: `20.x` (recommended in Vercel Project Settings → General)

---

## 4. Environment Variables Configuration

In **Vercel Dashboard → Project Settings → Environment Variables**, add the following variables for **Production**, **Preview**, and **Development** environments:

### A. Public Client-Side Variables
| Variable Name | Description | Example / Production Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Canonical platform URL | `https://benzwell.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project API URL | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anon Key | `eyJhbGciOiJIUzI1NiIsInR5...` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon Key duplicate | `eyJhbGciOiJIUzI1NiIsInR5...` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Live/Test Key ID | `rzp_live_xxxxxxxxxxxxxx` |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Google Analytics 4 ID | `G-XXXXXXXXXX` *(optional)* |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel ID | `1234567890123456` *(optional)* |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity ID | `xxxxxxxxxx` *(optional)* |
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | Google Tag Manager ID | `GTM-XXXXXXX` *(optional)* |

### B. Server-Only Secret Variables (Never Exposed to Browser)
| Variable Name | Description | Example / Production Value |
| :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret | `eyJhbGciOiJIUzI1NiIsInR5...` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (Server) | `rzp_live_xxxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret (Server) | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | `your_webhook_signing_secret` |
| `RESEND_API_KEY` | Resend API Key | `re_xxxxxxxxxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Official Sender Email | `info@benzwell.in` |
| `RESEND_FROM_NAME` | Official Sender Name | `BenzWell` |
| `RESEND_REPLY_TO` | Official Reply-To Email | `info@benzwell.in` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxxx.apps.googleusercontent.com` *(optional)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxxxxxxxxxxx` *(optional)* |
| `META_ACCESS_TOKEN` | Meta Marketing API Token | `EAA...` *(optional)* |

Click **Save** and trigger a **Redeploy**.

---

## 5. Custom Domain Configuration (`benzwell.in`)

1. In Vercel Project Settings, navigate to **Domains**.
2. Add `benzwell.in` and select the option to automatically redirect `www.benzwell.in` to `benzwell.in` (or vice versa according to preference).
3. Log in to your domain registrar / DNS provider (Hostinger DNS Management) and configure the following DNS records:

### Required DNS Records:
| Type | Name / Host | Target / Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Automatic / 300 |
| **CNAME** | `www` | `cname.vercel-dns.com` | Automatic / 300 |

*Vercel will automatically provision a free, auto-renewing Let's Encrypt SSL certificate once DNS propagates.*

---

## 6. Supabase Configuration

### A. Authentication & Redirect URLs
In your [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:
1. **Site URL**:
   ```
   https://benzwell.in
   ```
2. **Redirect URLs** (Add all of the following):
   - `https://benzwell.in/**`
   - `https://benzwell.in/auth/callback`
   - `https://www.benzwell.in/**`
   - `https://www.benzwell.in/auth/callback`
   - `https://benzwell.vercel.app/**`
   - `https://benzwell.vercel.app/auth/callback`
   - `http://localhost:3000/**`

### B. Storage Buckets
Ensure the following Supabase storage buckets exist:
1. `products` — **Public** (For product cover images and screenshots).
2. `product-files` — **Private** (For secure digital download files).
3. `avatars` — **Public** (For user profile pictures).
4. `banners` — **Public** (For promotional banners).

### C. Database Migration & Schema
Run `supabase/schema.sql` and `supabase/seed.sql` in the Supabase SQL Editor if setting up a fresh database.

---

## 7. Razorpay Production Webhook Configuration

1. In [Razorpay Dashboard](https://dashboard.razorpay.com/) → **Settings** → **Webhooks** → **Add New Webhook**:
   - **Webhook URL**: `https://benzwell.in/api/webhooks/razorpay`
   - **Secret**: Must match the value of `RAZORPAY_WEBHOOK_SECRET` set in Vercel.
   - **Active Events**:
     - `payment.captured`
     - `order.paid`
     - `payment.failed`
2. Save the webhook.

---

## 8. Resend Email & Domain Verification

1. In [Resend Dashboard](https://resend.com/domains) → **Add Domain**: `benzwell.in`
2. Add the required DNS records provided by Resend to Hostinger DNS:
   - **TXT** (DKIM): `resend._domainkey.benzwell.in`
   - **TXT** (SPF): `v=spf1 include:amazonses.com ~all`
   - **MX** (Inbound/Bounce tracking if requested by Resend)
3. Once verified, Resend will allow sending production transactional emails from `BenzWell <info@benzwell.in>`.

---

## 9. Admin Account Setup & Verification

1. Create or register your admin email in Supabase Auth (e.g. via `/admin/login` or Supabase dashboard).
2. In Supabase SQL Editor, assign the `admin` role to your profile:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'your-admin-email@domain.com';
   ```
3. Test logging in at `https://benzwell.in/admin/login` to access the full administrative suite (`/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/settings`, `/admin/analytics`).

---

## 10. Post-Deployment Verification Checklist

- [ ] **Home & Catalog**: Homepage loads with dynamic products at `https://benzwell.in`.
- [ ] **SSL / HTTPS**: Valid SSL certificate active on `https://benzwell.in` and `https://www.benzwell.in`.
- [ ] **Authentication**: User registration, login, email OTP, and Google OAuth work smoothly.
- [ ] **Admin Portal**: Admin login at `/admin/login` grants access to `/admin` dashboard.
- [ ] **Checkout Flow**: Adding to cart, proceeding to checkout, and launching Razorpay modal works.
- [ ] **Webhook Execution**: Razorpay webhook triggers order fulfillment, creates entitlement, and sends order confirmation email.
- [ ] **Digital Delivery**: Redirects to `/thank-you/[slug]` and downloads file securely via signed expiring tokens in `/account/downloads`.
- [ ] **Contact Form**: Submitting the Contact form sends notification to `ceo.office.atharva@gmail.com` with sender details.
- [ ] **SEO & Metadata**: OpenGraph meta tags, `sitemap.xml`, and `robots.txt` respond with `200 OK`.
