-- =============================================================================
-- BENZWELL MIGRATION 004: ORDER NUMBERS, FULFILLMENT TRACKING & ADMIN GIFTS
-- =============================================================================

-- 1. EXTEND ORDERS TABLE WITH TRACKING & SNAPSHOT FIELDS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'razorpay_purchase' CHECK (order_type IN ('razorpay_purchase', 'admin_gift', 'manual_grant', 'refund_replacement')),
  ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS customer_email_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS product_slug_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS product_price_snapshot NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'not_available' CHECK (fulfillment_status IN ('not_available', 'available', 'claimed', 'delivered', 'failed', 'revoked')),
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'claimed')),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS gift_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS gift_message TEXT,
  ADD COLUMN IF NOT EXISTS gifted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill snapshots for existing rows where null
UPDATE public.orders
SET 
  customer_name_snapshot = COALESCE(customer_name_snapshot, customer_name),
  customer_email_snapshot = COALESCE(customer_email_snapshot, customer_email),
  customer_phone_snapshot = COALESCE(customer_phone_snapshot, customer_phone),
  subtotal_amount = COALESCE(subtotal_amount, subtotal),
  final_amount = COALESCE(final_amount, total),
  coupon_code = COALESCE(coupon_code, coupon_code_snapshot),
  fulfillment_status = CASE 
    WHEN status IN ('fulfilled', 'paid') THEN 'delivered'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'not_available'
  END,
  delivery_status = CASE 
    WHEN status IN ('fulfilled', 'paid') THEN 'delivered'
    ELSE 'pending'
  END,
  delivered_at = CASE 
    WHEN status IN ('fulfilled', 'paid') AND delivered_at IS NULL THEN created_at 
    ELSE delivered_at 
  END
WHERE customer_email_snapshot IS NULL OR final_amount = 0.00;

-- 2. CREATE INDEXES FOR FAST SEARCH & FILTERING
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_snapshot ON public.orders(customer_email_snapshot);
CREATE INDEX IF NOT EXISTS idx_orders_claimed_at ON public.orders(claimed_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);

-- 3. FUNCTION TO GENERATE COLLISION-SAFE ORDER NUMBER BZ-YYYYMMDD-XXXXXX
CREATE OR REPLACE FUNCTION public.generate_benzwell_order_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    random_hex TEXT;
    order_num TEXT;
    collision_count INT;
BEGIN
    today_str := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD');
    LOOP
        random_hex := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
        order_num := 'BZ-' || today_str || '-' || random_hex;
        
        SELECT COUNT(*) INTO collision_count FROM public.orders WHERE order_number = order_num;
        IF collision_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- 4. UPDATE DEFAULT VALUE FOR ORDER_NUMBER
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT public.generate_benzwell_order_number();

