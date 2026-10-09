-- =============================================================================
-- BENZWELL MIGRATION 007: ADD PRODUCT DELIVERY TYPE & EXTERNAL DOWNLOAD URL
-- =============================================================================

DO $$ 
BEGIN
  -- 1. Add delivery_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE public.products 
      ADD COLUMN delivery_type TEXT NOT NULL DEFAULT 'upload' 
      CHECK (delivery_type IN ('upload', 'external_url'));
  END IF;

  -- 2. Add external_download_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'external_download_url'
  ) THEN
    ALTER TABLE public.products 
      ADD COLUMN external_download_url TEXT;
  END IF;

  -- 3. Create index for fast delivery type queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'products' 
      AND indexname = 'idx_products_delivery_type'
  ) THEN
    CREATE INDEX idx_products_delivery_type ON public.products(delivery_type);
  END IF;
END $$;
