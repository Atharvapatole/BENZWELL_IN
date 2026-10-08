# BENZWELL — SUPABASE INFRASTRUCTURE SETUP

BenzWell relies on Supabase for PostgreSQL database, authentication with SSR session cookies, and private storage for deliverable digital assets.

---

## 1. Required Supabase Storage Buckets

Navigate to **Supabase Dashboard → Storage → Buckets** and create the following two buckets:

### 1. `media-public` (Public Bucket)
- **Bucket Name:** `media-public`
- **Public Bucket:** **YES (Checked)**
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `image/gif`
- **Max file size:** `50MB`
- **Purpose:** Public product mockup images, gallery screenshots, hero banners, blog images, category icons.

### 2. `products-private` (Private Bucket)
- **Bucket Name:** `products-private`
- **Public Bucket:** **NO (Unchecked / Private)**
- **Allowed MIME types:** Any / All (`application/*`, `image/*`, `video/*`, `audio/*`, `application/pdf`, `application/zip`)
- **Max file size:** `500MB`
- **Purpose:** Paid digital downloads (ebooks, zip bundles, video courses, cheat sheets). Access is strictly mediated via server-generated signed URLs (60-300s expiry) following verified entitlement lookup.

---

## 2. Supabase Storage Security Policies (RLS)

Execute the following SQL in **Supabase SQL Editor**:

```sql
-- Allow authenticated admins to upload and manage media-public
CREATE POLICY "Admins full access to media-public"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'media-public' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (bucket_id = 'media-public' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Allow public read access to media-public
CREATE POLICY "Public read access to media-public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-public');

-- Protect products-private bucket (Server service-role handles downloads)
CREATE POLICY "Admin full access to products-private"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'products-private' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (bucket_id = 'products-private' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

---

## 3. Database Migration Script

To ensure all tables and indexes are created, execute the schema definitions located in `supabase/migrations/00001_complete_schema.sql` (or `DATABASE.md`).

Key tables verified in this build:
- `profiles` (Customer & Admin accounts with role verification)
- `products` (Catalog with slugs, pricing, inventory, categories)
- `product_files` (Deliverables mapped to `products-private`)
- `orders` & `order_items` (Financial transactions)
- `order_fulfillment_tokens` (5-minute secure temporary tokens)
- `customer_entitlements` (Permanent customer product ownership)
- `downloads` (Download event logging)
- `contact_messages` & `contact_replies` (Contact CRM)
- `reviews` (Customer ratings & admin moderation)
- `site_settings` (Platform configuration & encrypted keys)
- `audit_logs` (Administrative security audit trails)
