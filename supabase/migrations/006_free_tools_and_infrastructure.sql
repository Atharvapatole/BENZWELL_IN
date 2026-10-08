-- =============================================================================
-- BENZWELL MIGRATION 006: FREE TOOLS, DEPLOYMENTS, LEADS & ANALYTICS
-- =============================================================================

-- 1. FREE TOOLS
CREATE TABLE IF NOT EXISTS public.free_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT,
    seo_title TEXT,
    seo_description TEXT,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    cta_heading TEXT,
    cta_description TEXT,
    cta_button_text TEXT DEFAULT 'Get the Complete Guide',
    coupon_code TEXT,
    lead_capture_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tool_type TEXT NOT NULL DEFAULT 'interactive_checklist' CHECK (tool_type IN ('interactive_checklist', 'calculator', 'ai_assessment', 'generator', 'custom_nextjs')),
    deployment_method TEXT NOT NULL DEFAULT 'built_in' CHECK (deployment_method IN ('built_in', 'zip', 'github')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'deploying', 'live', 'disabled')),
    custom_domain TEXT,
    vercel_project_id TEXT,
    vercel_deployment_id TEXT,
    deployment_url TEXT,
    production_url TEXT,
    github_repo TEXT,
    github_branch TEXT DEFAULT 'main',
    root_directory TEXT DEFAULT '/',
    build_command TEXT DEFAULT 'npm run build',
    install_command TEXT DEFAULT 'npm install',
    env_variables JSONB DEFAULT '{}'::jsonb,
    tool_config JSONB DEFAULT '{}'::jsonb,
    last_deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_tools_slug ON public.free_tools(slug);
CREATE INDEX IF NOT EXISTS idx_free_tools_status ON public.free_tools(status);
CREATE INDEX IF NOT EXISTS idx_free_tools_product ON public.free_tools(product_id);

-- 2. FREE TOOL LEADS
CREATE TABLE IF NOT EXISTS public.free_tool_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES public.free_tools(id) ON DELETE CASCADE,
    tool_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    related_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'web',
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_hash TEXT,
    consent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_tool_leads_tool ON public.free_tool_leads(tool_id);
CREATE INDEX IF NOT EXISTS idx_free_tool_leads_email ON public.free_tool_leads(email);
CREATE INDEX IF NOT EXISTS idx_free_tool_leads_created ON public.free_tool_leads(created_at DESC);

-- 3. FREE TOOL EVENTS (Funnel analytics)
CREATE TABLE IF NOT EXISTS public.free_tool_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES public.free_tools(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'start', 'complete', 'lead_capture', 'cta_view', 'cta_click', 'purchase_attribute')),
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_tool_events_tool ON public.free_tool_events(tool_id);
CREATE INDEX IF NOT EXISTS idx_free_tool_events_type ON public.free_tool_events(event_type);
CREATE INDEX IF NOT EXISTS idx_free_tool_events_created ON public.free_tool_events(created_at DESC);

-- 4. FREE TOOL DEPLOYMENTS
CREATE TABLE IF NOT EXISTS public.free_tool_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES public.free_tools(id) ON DELETE CASCADE,
    deployment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'ready', 'error', 'canceled')),
    source_type TEXT NOT NULL CHECK (source_type IN ('zip', 'github', 'built_in')),
    commit_hash TEXT,
    deployment_url TEXT,
    logs TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_tool_deployments_tool ON public.free_tool_deployments(tool_id);
CREATE INDEX IF NOT EXISTS idx_free_tool_deployments_created ON public.free_tool_deployments(created_at DESC);

-- Enable RLS
ALTER TABLE public.free_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_tool_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_tool_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_tool_deployments ENABLE ROW LEVEL SECURITY;

-- Public can read live tools
CREATE POLICY "Public can view live tools" ON public.free_tools
    FOR SELECT USING (status = 'live');

-- Public can submit leads and events
CREATE POLICY "Public can insert leads" ON public.free_tool_leads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can insert events" ON public.free_tool_events
    FOR INSERT WITH CHECK (true);

-- Admins have full access
CREATE POLICY "Admins full access on free_tools" ON public.free_tools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins full access on free_tool_leads" ON public.free_tool_leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins full access on free_tool_events" ON public.free_tool_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins full access on free_tool_deployments" ON public.free_tool_deployments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Seed Starter Free Tool
INSERT INTO public.free_tools (
    name,
    slug,
    short_description,
    description,
    seo_title,
    seo_description,
    cta_heading,
    cta_description,
    cta_button_text,
    coupon_code,
    lead_capture_enabled,
    tool_type,
    deployment_method,
    status,
    production_url
) VALUES (
    'AI Flat Buying Checklist',
    'flat-ai',
    'Evaluate your property purchase risks, RERA compliance, and title safety in 2 minutes.',
    'A free, high-precision due diligence tool designed for home buyers in India. Analyzes builder credibility, sanctioned layout approvals, encumbrance certificates, and hidden clause traps before you pay a booking token.',
    'AI Flat Buying Checklist & Due Diligence Tool | BenzWell',
    'Free AI-powered real estate due diligence tool. Check RERA approvals, title verification checkpoints, and hidden cost traps before buying a flat.',
    'Want the complete checklist with all questions you should ask before buying a flat?',
    'Do not risk lakhs in deposits without the complete legal verification framework, 100+ point checklist, and clause-by-clause agreement analyzer.',
    'Get the Complete Flat Buying Guide',
    'FLAT20',
    TRUE,
    'interactive_checklist',
    'built_in',
    'live',
    'https://benzwell.in/free-tools/flat-ai'
) ON CONFLICT (slug) DO NOTHING;

