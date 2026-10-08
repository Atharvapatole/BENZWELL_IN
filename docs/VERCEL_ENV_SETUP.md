# BenzWell — Vercel Production Environment Variables Setup Guide

**Repository:** `Atharvapatole/Benzwell.in`  
**Vercel Project:** `benzwell-in`  
**Canonical Production URL:** `https://benzwell.in`  
**Official Support Email:** `info@benzwell.in`  

This document lists **every environment variable** required to configure and run the BenzWell production deployment on Vercel without guesswork.

---

## 1. Summary of Architecture & Roles

| Service | Architecture Role | Scope |
| :--- | :--- | :--- |
| **Appwrite** | Application Database, Data Storage, Free Tool Deployments & Leads | Server-Only |
| **Supabase** | Customer Authentication & Private Paid Deliverable Storage (`products-private`) | Public + Server-Only |
| **ImageKit** | Public CDN, Cover Images, Thumbnails & Media Library | Public + Server-Only |
| **Resend** | Transactional Emails (Order Confirmations, Welcome, Password Resets) | Server-Only |
| **Razorpay** | Payment Processing, Webhooks & Entitlement Verification | Public (Key ID) + Server-Only (Secret) |
| **Google Cloud** | Branded Google OAuth 2.0 Sign-In | Public (Client ID) + Server-Only (Secret) |
| **AI Providers** | Multi-Provider Fallback for Free Tools Analysis & Support AI (Groq / Mistral / Gemini) | Server-Only |

---

## 2. Complete Environment Variables Reference Table

| Variable Name | Required? | Environment | Type | Used For | Where to Obtain |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | **YES** | Production, Preview, Dev | **Public** | Canonical platform URL (`https://benzwell.in`). Used for SEO, canonical tags, email links, and OAuth redirect validation. | Custom domain (`https://benzwell.in`) |
| `NEXT_PUBLIC_SUPABASE_URL` | **YES** | Production, Preview, Dev | **Public** | NEW Supabase Project API URL (`https://<project-id>.supabase.co`). Used by Supabase client for authentication sessions. | Supabase Console → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES** | Production, Preview, Dev | **Public** | Public Anonymous API Key for client-side authentication and auth state change listeners. | Supabase Console → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** | Production, Preview, Dev | **Server-Only Secret** | Supabase Admin Secret Key. Used server-side to generate 5-minute signed URLs from the private bucket (`products-private`) and manage customer roles. | Supabase Console → Project Settings → API → Service Role Secret |
| `SUPABASE_PRIVATE_BUCKET` | Optional *(Default: `products-private`)* | Production, Preview, Dev | **Server-Only** | Name of the private Supabase Storage bucket holding paid deliverables. | Supabase Storage Console (default: `products-private`) |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | **YES** | Production, Preview, Dev | **Public** | ImageKit Endpoint URL (`https://ik.imagekit.io/<id>`). Delivers optimized public cover images, thumbnails, and banners. | ImageKit Dashboard → Developer Options → URL-endpoint |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` | **YES** | Production, Preview, Dev | **Public** | ImageKit Public Key. Used for client media components. | ImageKit Dashboard → Developer Options → API Keys |
| `IMAGEKIT_PRIVATE_KEY` | **YES** | Production, Preview, Dev | **Server-Only Secret** | ImageKit Server Private Key (`private_...`). Used for uploading and deleting media assets from server actions. | ImageKit Dashboard → Developer Options → API Keys |
| `APPWRITE_ENDPOINT` | **YES** | Production, Preview, Dev | **Server-Only** | Appwrite API endpoint (`https://cloud.appwrite.io/v1`). | Appwrite Cloud Console → Settings |
| `APPWRITE_PROJECT_ID` | **YES** | Production, Preview, Dev | **Server-Only** | Appwrite Project ID. | Appwrite Cloud Console → Settings → Project ID |
| `APPWRITE_API_KEY` | **YES** | Production, Preview, Dev | **Server-Only Secret** | Server-side Appwrite API Key with `databases.read`, `databases.write`, `documents.read`, `documents.write`, `collections.read`, `collections.write` scopes. | Appwrite Console → Project Settings → API Keys |
| `APPWRITE_DATABASE_ID` | **YES** | Production, Preview, Dev | **Server-Only** | Appwrite Database ID where collections (`free_tools`, `free_tool_leads`, etc.) reside. | Appwrite Console → Databases |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **YES** | Production, Preview, Dev | **Public** | Razorpay Key ID (`rzp_live_...` or `rzp_test_...`) passed to Razorpay Checkout JS modal. | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_ID` | **YES** | Production, Preview, Dev | **Server-Only** | Razorpay Key ID for server-side order generation. Can be identical to `NEXT_PUBLIC_RAZORPAY_KEY_ID`. | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | **YES** | Production, Preview, Dev | **Server-Only Secret** | Razorpay Key Secret. Used to verify payment signatures and fetch payment details. | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | **YES** | Production, Preview, Dev | **Server-Only Secret** | Secret used to verify incoming webhook payloads at `/api/webhooks/razorpay`. | Razorpay Dashboard → Settings → Webhooks |
| `RESEND_API_KEY` | **YES** | Production, Preview, Dev | **Server-Only Secret** | Resend API Key (`re_...`) for transactional email dispatch. | Resend Dashboard → API Keys |
| `RESEND_FROM_EMAIL` | Optional *(Default: `info@benzwell.in`)* | Production, Preview, Dev | **Server-Only** | Verified sender email address in Resend. | Resend Dashboard → Domains |
| `RESEND_FROM_NAME` | Optional *(Default: `BenzWell`)* | Production, Preview, Dev | **Server-Only** | Sender display name. | BenzWell Branding |
| `RESEND_REPLY_TO` | Optional *(Default: `info@benzwell.in`)* | Production, Preview, Dev | **Server-Only** | Customer reply-to address. | BenzWell Support |
| `CREDENTIAL_ENCRYPTION_KEY` | Optional *(Auto-derives if omitted)* | Production, Preview, Dev | **Server-Only Secret** | 32-byte hex key for AES-256-GCM encryption of database site settings. | Random 32-byte hex string |
| `GOOGLE_CLIENT_ID` | Optional | Production, Preview, Dev | **Server-Only** | Google Cloud OAuth 2.0 Web Client ID. | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Optional | Production, Preview, Dev | **Server-Only Secret** | Google Cloud OAuth 2.0 Client Secret. | Google Cloud Console → APIs & Services → Credentials |
| `ADMIN_NOTIFICATION_EMAIL` | Optional *(Default: `ceo.office.atharva@gmail.com`)* | Production, Preview, Dev | **Server-Only** | Admin email recipient for contact form inquiries and system alerts. | BenzWell Admin |
| `GROQ_API_KEY` | Optional *(Priority 1 AI)* | Production, Preview, Dev | **Server-Only Secret** | API key for Groq Cloud (Llama 3.3 70B evaluation for Free Tools). | Groq Cloud Console |
| `MISTRAL_API_KEY` | Optional *(Priority 2 AI)* | Production, Preview, Dev | **Server-Only Secret** | API key for Mistral AI (Fallback LLM). | Mistral Console |
| `GEMINI_API_KEY` | Optional *(Priority 3 AI)* | Production, Preview, Dev | **Server-Only Secret** | API key for Google Gemini AI (Fallback LLM). | Google AI Studio |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Optional | Production | **Public** | Google Analytics 4 Measurement ID (`G-XXXXXXXXXX`). | Google Analytics Admin |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional | Production | **Public** | Meta (Facebook) Ads Pixel ID. | Meta Events Manager |
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | Optional | Production | **Public** | Google Tag Manager Container ID (`GTM-XXXXXXX`). | Google Tag Manager |

---

## 3. Step-by-Step Vercel Configuration Instructions

1. Navigate to your **Vercel Dashboard** → Select **`benzwell-in`** project.
2. Go to **Settings** → **Environment Variables**.
3. Copy each variable key and value from your secure credentials vault.
4. Select all 3 environments (**Production**, **Preview**, **Development**) for each variable unless specified otherwise.
5. Click **Save** and trigger a new deployment from the latest `main` branch commit.
