# BENZWELL — Premium Digital Ecommerce Platform

Production Domain: [https://benzwell.in](https://benzwell.in)  
Hosting: Hostinger  
Admin URL: [https://benzwell.in/admin](https://benzwell.in/admin)  

BenzWell is an enterprise-grade digital product marketplace and creator platform engineered with Next.js 15 App Router, Supabase (PostgreSQL, SSR Cookie Authentication, Public/Private Storage Buckets), Tailwind CSS, Razorpay, and Resend.

---

## Architecture Overview

```
[Hostinger Server / PM2 / Nginx]
              │
              ▼
    [Next.js 15 Standalone]
  ├── Server Actions & API Routes
  ├── SSR Auth & Middleware Protection
  └── Dynamic Dynamic Product Delivery Engine
              │
      ┌───────┼───────┐
      ▼       ▼       ▼
 [Supabase] [Razorpay] [Resend]
```

### Core Features

1. **Digital Products & Private Deliverables:**
   - Public thumbnails and showcase assets in `media-public`.
   - Paid deliverable files (PDF, ZIP, MP4, Audio) securely isolated in `products-private`.
   - Temporary 5-minute unique tokens (`/download/[token]`) with live countdown timers.
   - Permanent customer entitlements stored in `Account → My Downloads`.
   - 60-second time-limited cryptographically signed URLs for downloads.

2. **Admin Control Center (`/admin`):**
   - 12 Configurable Settings Sections: General, Branding, Payments, Email, Authentication, Storage, SEO, Marketing, Analytics, Social, System, Security.
   - Full Product CRUD with direct media upload and deliverable file management.
   - Contact CRM with direct email reply from `BenzWell <info@benzwell.in>`.
   - Customer 360 view with Lifetime Spend, Order History, and zero-dollar Product Gifting.
   - Review moderation (Verified purchasers only).
   - Real-time Analytics & Audit Logging.

3. **Resilient Unconfigured Service Handling:**
   - Operates gracefully when Razorpay, Resend, or Google OAuth are not yet configured.
   - Safe status indicators (`Not Configured`) without fake payments, fake emails, or crashes.

---

## Production Deployment (Hostinger)

See [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md) for full deployment instructions.

```bash
# Production Build Command
npm ci
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Start Standalone Server
pm2 start .next/standalone/server.js --name "benzwell"
```

---

## Documentation Index

- [Hostinger Deployment Guide](HOSTINGER_DEPLOYMENT.md)
- [Environment Variables Template & Matrix](ENVIRONMENT_VARIABLES.md)
- [Supabase Setup & Storage Buckets](SUPABASE_SETUP.md)
- [Razorpay Activation Guide](RAZORPAY_SETUP.md)
- [Resend Email Setup](RESEND_SETUP.md)
- [Google OAuth 2.0 Setup](GOOGLE_OAUTH_SETUP.md)
- [Production Launch Checklist](PRODUCTION_CHECKLIST.md)
- [Local Development Setup](SETUP.md)
