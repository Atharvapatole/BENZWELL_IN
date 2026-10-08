-- =============================================================================
-- BENZWELL MIGRATION 003: SUPPORT CENTER & SUPPORT AI INFRASTRUCTURE
-- =============================================================================

-- 1. STORAGE BUCKET: support-private
-- Private bucket for user support screenshots & attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-private',
  'support-private',
  false,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage Policies for 'support-private'
-- Admins can read and manage all support attachments
DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support Attachments" ON storage.objects
    FOR ALL USING (
      bucket_id = 'support-private'
      AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated Users can upload attachments scoped to their user ID or support sessions
DO $$ BEGIN
  CREATE POLICY "User Upload Support Attachments" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'support-private'
      AND (auth.uid() IS NOT NULL)
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated Users can read only their own attachments
DO $$ BEGIN
  CREATE POLICY "User Read Own Support Attachments" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'support-private'
      AND (auth.uid() IS NOT NULL)
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. TICKET NUMBER SEQUENCE (Collision-safe daily ticket numbering)
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

-- Function to generate collision-safe unique ticket number BZ-SUP-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_val BIGINT;
    ticket_num TEXT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    seq_val := nextval('public.support_ticket_seq');
    ticket_num := 'BZ-SUP-' || today_str || '-' || LPAD((seq_val % 10000)::TEXT, 4, '0');
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;


-- 3. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL DEFAULT public.generate_support_ticket_number(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    benzwell_order_number TEXT,
    razorpay_order_id TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ai_in_progress', 'waiting_for_customer', 'waiting_for_admin', 'resolved', 'closed', 'reopened')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    source TEXT NOT NULL DEFAULT 'contact_form' CHECK (source IN ('contact_form', 'support_ai', 'admin_created')),
    ai_summary TEXT,
    ai_resolution TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON public.support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);


-- 4. SUPPORT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'support_ai', 'admin', 'system')),
    sender_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT,
    sender_email TEXT,
    message TEXT NOT NULL,
    attachment_metadata JSONB DEFAULT '[]'::jsonb,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    email_delivered BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON public.support_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_messages_internal ON public.support_messages(internal_note);


-- 5. SUPPORT ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket ON public.support_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_attachments_user ON public.support_attachments(user_id);


-- 6. SUPPORT AI SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.support_ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
    session_token TEXT UNIQUE NOT NULL,
    model_used TEXT,
    provider_used TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ai_sessions_token ON public.support_ai_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_support_ai_sessions_user ON public.support_ai_sessions(user_id);


-- 7. SUPPORT AI MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.support_ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.support_ai_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    model_used TEXT,
    provider_used TEXT,
    tool_action TEXT,
    attachment_metadata JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ai_messages_session ON public.support_ai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_support_ai_messages_created ON public.support_ai_messages(created_at ASC);


-- 8. SUPPORT AI ACTIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.support_ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.support_ai_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_result_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ai_actions_session ON public.support_ai_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_support_ai_actions_user ON public.support_ai_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ai_actions_type ON public.support_ai_actions(action_type);


-- 9. TRIGGER FOR UPDATED_AT
DO $$ BEGIN
  DROP TRIGGER IF EXISTS tr_support_tickets_updated_at ON public.support_tickets;
  CREATE TRIGGER tr_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS tr_support_ai_sessions_updated_at ON public.support_ai_sessions;
  CREATE TRIGGER tr_support_ai_sessions_updated_at
    BEFORE UPDATE ON public.support_ai_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN undefined_function THEN NULL;
END $$;


-- 10. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ai_actions ENABLE ROW LEVEL SECURITY;

-- Admins full access
DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support Tickets" ON public.support_tickets
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support Messages" ON public.support_messages
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support Attachments" ON public.support_attachments
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support AI Sessions" ON public.support_ai_sessions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support AI Messages" ON public.support_ai_messages
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin Full Access Support AI Actions" ON public.support_ai_actions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers can view only their own tickets
DO $$ BEGIN
  CREATE POLICY "Customer Read Own Support Tickets" ON public.support_tickets
    FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers can view only public messages in their own tickets (never internal notes)
DO $$ BEGIN
  CREATE POLICY "Customer Read Own Support Messages" ON public.support_messages
    FOR SELECT USING (
      auth.uid() IS NOT NULL
      AND internal_note = false
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers can insert replies into their own tickets
DO $$ BEGIN
  CREATE POLICY "Customer Insert Support Messages" ON public.support_messages
    FOR INSERT WITH CHECK (
      auth.uid() IS NOT NULL
      AND sender_type = 'customer'
      AND internal_note = false
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers can view and insert their own AI sessions
DO $$ BEGIN
  CREATE POLICY "Customer Own Support AI Sessions" ON public.support_ai_sessions
    FOR ALL USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
