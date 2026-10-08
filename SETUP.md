# BENZWELL — COMPLETE LOCAL SETUP & DEVELOPER GUIDE

BenzWell is a production-grade digital ecommerce platform built with Next.js 15 App Router, Supabase (PostgreSQL, SSR Auth, Storage), Tailwind CSS, Razorpay, and Resend.

---

## 1. Quick Start

### Prerequisites
- Node.js 20.x or 22.x LTS
- npm 10+
- A Supabase Project (PostgreSQL database + Storage)

### Local Installation
```bash
# 1. Clone repository
git clone https://github.com/Atharvapatole/benzwell-store.git
cd benzwell-store

# 2. Install dependencies
npm install

# 3. Configure local environment
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# 4. Start local development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 2. Admin Account Setup

To promote a registered user to Administrator:
1. Register a new user at `http://localhost:3000/register`.
2. Open Supabase Dashboard → Table Editor → `profiles`.
3. Locate your user record and change the `role` column from `'customer'` to `'admin'`.
4. Log in at `http://localhost:3000/admin/login` to access the full Admin Control Center.

---

## 3. Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Runs Next.js development server with hot-reload |
| `build` | `npm run build` | Compiles production standalone build |
| `start` | `npm run start` | Starts Next.js production server |
| `lint` | `npm run lint` | Runs ESLint analysis |

---

## 4. Key Documentation Index

- [Hostinger Deployment Guide](HOSTINGER_DEPLOYMENT.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [Supabase Setup & Storage](SUPABASE_SETUP.md)
- [Razorpay Payments](RAZORPAY_SETUP.md)
- [Resend Email Configuration](RESEND_SETUP.md)
- [Google OAuth Setup](GOOGLE_OAUTH_SETUP.md)
- [Production Launch Checklist](PRODUCTION_CHECKLIST.md)
