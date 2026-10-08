-- =============================================================================
-- BENZWELL MIGRATION 002: CREATOR COMMISSIONS, STORAGE BUCKETS & HISTORICAL SNAPSHOTS
-- =============================================================================

-- 1. STORAGE BUCKETS SETUP
-- Insert default storage buckets if not existing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('media-public', 'media-public', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']),
  ('products-private', 'products-private', false, 524288000, NULL),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies for 'media-public'
DO $$ BEGIN
  CREATE POLICY "Public Read Media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-public');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin All Media" ON storage.objects
    FOR ALL USING (
      bucket_id = 'media-public' 
      AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage Policies for 'products-private'
DO $$ BEGIN
  CREATE POLICY "Admin All Private Products" ON storage.objects
    FOR ALL USING (
      bucket_id = 'products-private' 
      AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage Policies for 'avatars' and 'banners'
DO $$ BEGIN
  CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public Read Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. COUPONS TABLE EXTENSIONS (CREATOR ATTRIBUTION)
ALTER TABLE public.coupons 
  ADD COLUMN IF NOT EXISTS creator_name TEXT,
  ADD COLUMN IF NOT EXISTS creator_commission_type TEXT CHECK (creator_commission_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS creator_commission_value NUMERIC(10, 2);


-- 3. ORDERS TABLE EXTENSIONS (HISTORICAL SNAPSHOTS)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS coupon_code_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS creator_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS creator_commission_type TEXT,
  ADD COLUMN IF NOT EXISTS creator_commission_value NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS creator_commission_amount NUMERIC(10, 2);

CREATE INDEX IF NOT EXISTS idx_orders_creator_snapshot ON public.orders(creator_name_snapshot);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_snapshot ON public.orders(coupon_code_snapshot);


-- 4. CREATOR COMMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.creator_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    creator_name TEXT NOT NULL,
    coupon_code TEXT NOT NULL,
    order_amount NUMERIC(10, 2) NOT NULL,
    commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
    commission_value NUMERIC(10, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_order_commission UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_commissions_creator ON public.creator_commissions(creator_name);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_status ON public.creator_commissions(status);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_order ON public.creator_commissions(order_id);

-- Enable RLS on creator_commissions
ALTER TABLE public.creator_commissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin All Creator Commissions" ON public.creator_commissions
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
