-- =============================================================================
-- BENZWELL MIGRATION 005: PAYMENT STATUS & DOWNLOAD ENHANCEMENTS
-- =============================================================================

-- 1. Relax and update payment_status check constraint to support 'gifted' and 'paid'
DO $$ 
BEGIN
  -- Drop existing payment_status check constraint on orders if exists
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
  
  -- Add updated check constraint with 'gifted' and 'paid'
  ALTER TABLE public.orders 
    ADD CONSTRAINT orders_payment_status_check 
    CHECK (payment_status IN ('unpaid', 'authorized', 'captured', 'paid', 'gifted', 'failed', 'refunded'));
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- 2. Relax and update status check constraint on orders to support all operational statuses
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
  
  ALTER TABLE public.orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'payment_processing', 'paid', 'fulfilled', 'failed', 'cancelled', 'refunded'));
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- 3. Ensure storage buckets exist and are correctly configured
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products-private', 'products-private', false),
  ('product-files', 'product-files', false)
ON CONFLICT (id) DO NOTHING;
