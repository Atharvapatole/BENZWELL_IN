# BENZWELL — HOSTINGER NODE.JS WEB APP DEPLOYMENT GUIDE

This guide provides the complete, step-by-step instructions to deploy **BenzWell** (`https://benzwell.in`) using **Hostinger's Managed Node.js Web App Deployment ("Push your code, we host it")**.

---

## A. System Requirements
- **Hostinger Plan:** Hostinger Managed Node.js Web App / Cloud Hosting with Node.js support.
- **Node.js Version:** `20.x` LTS (or `22.x` LTS).
- **Package Manager:** `npm` (v10+).
- **Domain:** `https://benzwell.in` (purchased on Hostinger).
- **Database & Storage:** Supabase PostgreSQL + Auth SSR + Storage (`media-public` and `products-private`).

---

## B. GitHub Repository Setup
1. Push your BenzWell repository to GitHub (e.g. `https://github.com/Atharvapatole/benzwell-store.git`).
2. Ensure `node_modules/`, `.next/`, and `.env.local` are ignored (handled automatically by `.gitignore`).
3. Only the clean source files, `package.json`, `package-lock.json`, and `.env.example` will be tracked in Git.

---

## C. Repository Structure
```
benzwell/
├── actions/              # Next.js Server Actions (Checkout, Payments, Downloads, Admin)
├── app/                  # Next.js 15 App Router (Pages, Layouts, API Routes, Dynamic Routes)
├── components/           # UI Components, Admin Control Center, Shop & Modals
├── hooks/                # Client State Hooks (Cart, Auth)
├── lib/                  # Supabase SSR, Razorpay, Resend, Encryption utilities
├── public/               # Public static assets (Logos, Icons)
├── schemas/              # Zod validation schemas
├── .env.example          # Environment variables template
├── .gitignore            # Git exclusion rules
├── next.config.ts        # Next.js production configuration
├── package.json          # Dependency definitions and scripts
├── package-lock.json     # Deterministic dependency lockfile
├── tsconfig.json         # TypeScript compiler configuration
└── HOSTINGER_DEPLOYMENT.md
```

---

## D. Node.js Version Selection in Hostinger
In your **Hostinger Control Panel (hPanel)**:
1. Navigate to **Websites** → Select `benzwell.in` → **Node.js Web App**.
2. Under **Node.js version**, select **Node.js 20.x** (recommended LTS).

---

## E. Build Command
Hostinger executes this command during deployment to install dependencies and compile Next.js:
```bash
npm ci && npm run build
```
*(Next.js compiles all static and dynamic App Router pages, Server Actions, and API endpoints).*

---

## F. Start Command
Hostinger manages the background process automatically using:
```bash
npm run start
```
*(In `package.json`, this runs `next start`. Next.js automatically respects Hostinger's dynamic `$PORT` and binds to `0.0.0.0`).*

---

## G. Environment Variables
In **Hostinger hPanel → Node.js Web App → Environment Variables**, add the following variables (refer to `.env.example`):

### 1. Application
```ini
NEXT_PUBLIC_SITE_URL=https://benzwell.in
```

### 2. Supabase (Database, Auth, Storage)
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Razorpay (Leave blank until created)
```ini
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

### 4. Resend (Leave blank until configured)
```ini
RESEND_API_KEY=
RESEND_FROM_EMAIL=info@benzwell.in
RESEND_FROM_NAME=BenzWell
RESEND_REPLY_TO=info@benzwell.in
```

### 5. Google OAuth 2.0 (Optional)
```ini
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 6. Analytics (Optional)
```ini
NEXT_PUBLIC_GA4_MEASUREMENT_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
NEXT_PUBLIC_GTM_CONTAINER_ID=
```

---

## H. Application Root
- **Application Root:** `/` (or `/home/uXXXXX/domains/benzwell.in/public_html`).
- **Application Startup File / Command:** `npm run start` or `package.json`.

---

## I. Domain & J. DNS Configuration
In Hostinger **DNS Zone Management** for `benzwell.in`:
- **A Record (`@`):** Automatically points to your Hostinger Web Server IP.
- **CNAME (`www`):** `benzwell.in`.

---

## K. SSL / HTTPS Setup
1. In Hostinger hPanel, go to **Security → SSL**.
2. Hostinger provides free automatic **Let's Encrypt SSL**.
3. Toggle **Force HTTPS** ON so all traffic redirects to `https://benzwell.in`.

---

## L. Supabase Configuration
1. Create 2 storage buckets in **Supabase Dashboard → Storage**:
   - `media-public` (Public: **YES**) — for images, thumbnails, banners.
   - `products-private` (Public: **NO**) — for paid deliverable files.
2. Run database migration in SQL Editor (`supabase/migrations/00001_complete_schema.sql`).
3. Set your admin user account role to `'admin'` in the `profiles` table.

---

## M. Google OAuth Configuration
In **Google Cloud Console → Credentials**:
- **Authorized JavaScript Origins:** `https://benzwell.in`
- **Authorized Redirect URI:** `https://benzwell.in/api/auth/callback/google`

---

## N. Razorpay Configuration
Once your Razorpay account is active:
1. Log in to `https://benzwell.in/admin/settings`.
2. Select **Payments** tab.
3. Enter **Key ID**, **Key Secret**, and **Webhook Secret**.
4. Set mode to **Live** (or **Test** for sandbox testing).
5. Click **Save Razorpay Credentials** and **Test Connection**.

---

## O. Razorpay Webhook Configuration
In **Razorpay Dashboard → Settings → Webhooks → Add New Webhook**:
- **Webhook URL:** `https://benzwell.in/api/webhooks/razorpay`
- **Secret:** Your `RAZORPAY_WEBHOOK_SECRET`
- **Active Events:** `order.paid`, `payment.captured`, `payment.failed`

---

## P. Resend Email Configuration
1. In **Resend Dashboard → Domains**, add `benzwell.in`.
2. Add the MX and TXT (SPF & DKIM) records to Hostinger DNS.
3. In `https://benzwell.in/admin/settings` → **Email**, enter your **Resend API Key**.
4. Test dispatch using the built-in email test tool.

---

## Q. Production Testing Checklist
- [ ] Access `https://benzwell.in` and verify HTTPS lock icon.
- [ ] Test customer registration and login.
- [ ] Log in at `https://benzwell.in/admin/login` to confirm admin access.
- [ ] Create a product and upload thumbnail (`media-public`) and digital file (`products-private`).
- [ ] Add item to cart and proceed to checkout.
- [ ] Confirm unconfigured payment message displays gracefully when Razorpay is not yet configured.
- [ ] Test Contact form submission at `https://benzwell.in/contact` and verify routing to `ceo.office.atharva@gmail.com`.

---

## R. Updating / Redeploying the Website
Whenever you push new commits to your GitHub repository:
1. Open Hostinger hPanel → **Node.js Web App**.
2. Click **Deploy / Pull from Git**.
3. Hostinger will run `npm ci && npm run build` and restart the Node.js application with zero downtime.

---

## S. Troubleshooting
- **Port Conflicts:** Next.js automatically listens on `process.env.PORT` provided by Hostinger.
- **Image Loading Issues:** Ensure external domains are listed in `next.config.ts` under `images.remotePatterns`.
- **Admin Redirects:** Ensure Supabase URL and service-role keys match in Hostinger environment variables.
