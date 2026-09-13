-- ==============================================================================
-- AEON · Migración 00012: Agente 3 — Tabla de Post-Mortem y Ratchet MFE/MAE
-- ==============================================================================
-- 1. public.signal_post_mortem: Auditoría cuantitativa de señales A+ y B.
-- 2. Métricas continuas de excursión (MFE/MAE) y snapshots a T+15, 30, 60, 120m.
-- 3. RLS Zero-Trust: Lectura pública, mutación exclusiva a service_role del VPS.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.signal_post_mortem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL REFERENCES public.trading_signal_events(event_id) ON DELETE CASCADE,
    symbol VARCHAR(16) NOT NULL,
    score_label VARCHAR(16) NOT NULL CHECK (score_label IN ('A+', 'B', 'VETO')),
    confluence_score NUMERIC(5, 2) NOT NULL,
    bias VARCHAR(16) NOT NULL CHECK (bias IN ('compra', 'venta', 'neutral')),
    entry_price NUMERIC(16, 5) NOT NULL,
    structural_invalidation NUMERIC(16, 5) NOT NULL,
    target_1_5r NUMERIC(16, 5) NOT NULL,
    target_2r NUMERIC(16, 5) NOT NULL,

    -- Ratchet MFE / MAE en tiempo real (Tick a Tick 20s)
    mfe_price NUMERIC(16, 5) NOT NULL,
    mfe_r_multiple NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    mae_price NUMERIC(16, 5) NOT NULL,
    mae_r_multiple NUMERIC(6, 2) NOT NULL DEFAULT 0.0,

    -- Snapshots cronológicos para reportes
    price_t15 NUMERIC(16, 5),
    price_t30 NUMERIC(16, 5),
    price_t60 NUMERIC(16, 5),
    price_t120 NUMERIC(16, 5),

    -- Ciclo de vida y resolución institucional
    outcome VARCHAR(32) NOT NULL DEFAULT 'tracking'
        CHECK (outcome IN ('tracking', 'target_hit_1_5r', 'target_hit_2r', 'invalidated', 'expired_in_range')),
    first_breached VARCHAR(16) CHECK (first_breached IN ('target', 'sl', 'ambiguous_sl')),
    time_to_resolution_seconds INT,
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Índices optimizados para consultas del evaluador y analíticas por cohorte
CREATE INDEX IF NOT EXISTS idx_post_mortem_outcome_created 
    ON public.signal_post_mortem (outcome, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_mortem_score_outcome 
    ON public.signal_post_mortem (score_label, outcome);

CREATE INDEX IF NOT EXISTS idx_post_mortem_event_id 
    ON public.signal_post_mortem (event_id);

-- RLS Zero-Trust
ALTER TABLE public.signal_post_mortem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total a service_role en signal_post_mortem" ON public.signal_post_mortem;
CREATE POLICY "Acceso total a service_role en signal_post_mortem"
    ON public.signal_post_mortem
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica en signal_post_mortem" ON public.signal_post_mortem;
CREATE POLICY "Lectura publica en signal_post_mortem"
    ON public.signal_post_mortem
    FOR SELECT
    TO authenticated, anon
    USING (true);
