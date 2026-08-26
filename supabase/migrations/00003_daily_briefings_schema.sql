-- ==============================================================================
-- AEON Migration: 00003_daily_briefings_schema.sql
-- Fase 5: AI Platform & Contextual Intelligence
-- Esquema relacional para Daily Macro Briefings (Londres 06:00 / NY 12:30 UTC)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.daily_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL CHECK (session_id IN ('london_pre', 'ny_pre', 'asian_wrap', 'daily_close')),
    date DATE NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT,
    macro_sentiment JSONB NOT NULL DEFAULT '{"score": 50, "label": "NEUTRAL", "risk_appetite": "NEUTRAL"}'::jsonb,
    asset_bias JSONB NOT NULL DEFAULT '{"XAUUSD": "NEUTRAL", "EURUSD": "NEUTRAL", "GBPUSD": "NEUTRAL", "DXY": "NEUTRAL", "SPX500": "NEUTRAL"}'::jsonb,
    catalysts JSONB NOT NULL DEFAULT '[]'::jsonb,
    executive_thesis TEXT NOT NULL,
    full_content_md TEXT,
    author TEXT DEFAULT 'AEON Macro Intelligence AI',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_daily_session UNIQUE (date, session_id)
);

-- Índices de alto rendimiento para consultas inmediatas (0ms)
CREATE INDEX IF NOT EXISTS idx_daily_briefings_date_session ON public.daily_briefings (date DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_created_at ON public.daily_briefings (created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura pública sin autenticación (Frontend abierto y rápido)
DROP POLICY IF EXISTS "Public Read Access for daily_briefings" ON public.daily_briefings;
CREATE POLICY "Public Read Access for daily_briefings"
    ON public.daily_briefings
    FOR SELECT
    USING (true);

-- Política 2: Escritura y actualización restringidas a service_role (Bot / Agente)
DROP POLICY IF EXISTS "Service Role Upsert for daily_briefings" ON public.daily_briefings;
CREATE POLICY "Service Role Upsert for daily_briefings"
    ON public.daily_briefings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Habilitar publicación Realtime para sincronizar automáticamente el frontend
ALTER TABLE public.daily_briefings REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'daily_briefings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_briefings;
    END IF;
END $$;
