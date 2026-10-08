# BENZWELL — GOOGLE OAUTH 2.0 SETUP GUIDE

This document explains how to set up Google One-Click Login for BenzWell (`https://benzwell.in`).

---

## 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project named **BenzWell**.
3. Go to **APIs & Services → OAuth consent screen**:
   - **User Type:** External
   - **App name:** BenzWell
   - **User support email:** `info@benzwell.in` (or your Google admin email)
   - **Authorized domains:** `benzwell.in`, `supabase.co`
   - **Developer contact information:** `ceo.office.atharva@gmail.com`
4. Go to **APIs & Services → Credentials**:
   - Click **Create Credentials** → **OAuth client ID**.
   - **Application type:** Web application.
   - **Name:** BenzWell Web Client.
   - **Authorized JavaScript origins:**
     - `https://benzwell.in`
     - `https://www.benzwell.in`
   - **Authorized redirect URIs:**
     - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
     - `https://benzwell.in/auth/callback`
     - `https://benzwell.in/api/auth/callback/google`
     - `http://localhost:3000/auth/callback`

5. Copy the **Client ID** and **Client Secret**.

---

## 2. Configuring Google OAuth in Supabase

1. In **Supabase Dashboard → Authentication → Providers → Google**:
   - Enable **Google Provider**.
   - Paste **Client ID** and **Client Secret**.
   - Save changes.

---

## 3. Configuring Google OAuth in BenzWell Admin

1. Open `https://benzwell.in/admin/settings`.
2. Select **Authentication** tab.
3. Enter **Google Client ID** and **Client Secret**.
4. Click **Save Authentication Settings**.
