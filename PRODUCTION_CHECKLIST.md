# BENZWELL — PRODUCTION LAUNCH CHECKLIST

Target Domain: `https://benzwell.in`  
Hosting Provider: Hostinger  

Use this checklist to verify production readiness prior to public launch.

---

## 1. Domain & DNS
- [ ] Domain `benzwell.in` pointed to Hostinger Server IP (A record).
- [ ] HTTPS / SSL certificate installed and active (`https://benzwell.in`).
- [ ] Non-SSL traffic redirects automatically (301) to `https://`.

## 2. Supabase Infrastructure
- [ ] Supabase project connected with valid URL and service role keys.
- [ ] Storage bucket `media-public` created (Public).
- [ ] Storage bucket `products-private` created (Private).
- [ ] Database schema migrations applied (22 tables verified).
- [ ] Initial administrator account created and assigned `role: 'admin'`.

## 3. Hostinger Deployment
- [ ] Node.js v20.x or v22.x configured in Hostinger.
- [ ] `next.config.ts` has `output: 'standalone'` enabled.
- [ ] Static assets copied into `.next/standalone/` during build.
- [ ] Process managed by PM2 or Hostinger Node.js Application Manager.
- [ ] Application starts cleanly and serves on Port 3000 / HTTPS.

## 4. Platform Settings (`/admin/settings`)
- [ ] General: Default support email set to `info@benzwell.in`.
- [ ] Branding: Favicon, logo, and accent colors configured.
- [ ] SEO: Meta title, OpenGraph image, and description verified.
- [ ] Storage: Max upload limit set (e.g. 500MB).
- [ ] Security: 5-minute temporary token duration active.

## 5. Third-Party Integrations (When Ready)
- [ ] **Razorpay:** Credentials added in Admin Settings → Payments, Webhook configured for `https://benzwell.in/api/webhooks/razorpay`.
- [ ] **Resend:** Domain `benzwell.in` verified with SPF/DKIM records, API key entered, test email sent.
- [ ] **Google OAuth:** Redirect URI `https://benzwell.in/api/auth/callback/google` added to Google Cloud Console.
- [ ] **Analytics:** GA4 / Meta Pixel / Clarity IDs entered in Settings → Analytics.

## 6. Smoke Testing
- [ ] Customer account registration and email/OTP flow.
- [ ] Admin product creation with thumbnail (`media-public`) and deliverables (`products-private`).
- [ ] Shop page browsing, filtering, search modal, and cart drawer.
- [ ] Contact form submission and notification to `ceo.office.atharva@gmail.com`.
- [ ] Customer 360 view and product gifting in Admin panel.
- [ ] Announcement banner targeting on `/shop`.
