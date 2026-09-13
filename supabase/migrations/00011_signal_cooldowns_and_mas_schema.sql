-- ==============================================================================
-- AEON · Migración 00011: Cooldown Atómico y Esquema MAS v1.0.0
-- ==============================================================================
-- 1. public.signal_cooldowns: Tabla atómica en Postgres para evitar spam y locks en memoria.
-- 2. acquire_signal_cooldown: RPC atómica para adquirir cooldown con UPSERT condicional.
-- 3. public.trading_signal_events: Ampliación de columnas para MAS v1.0.0.
-- ==============================================================================

-- 1. TABLA: public.signal_cooldowns
CREATE TABLE IF NOT EXISTS public.signal_cooldowns (
    asset TEXT NOT NULL,
    setup_type TEXT NOT NULL,
    last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    event_id TEXT NOT NULL,
    PRIMARY KEY (asset, setup_type)
);

-- Índices de consulta rápida y expiración
CREATE INDEX IF NOT EXISTS idx_signal_cooldowns_expires_at 
    ON public.signal_cooldowns (expires_at);

-- RLS para signal_cooldowns
ALTER TABLE public.signal_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total service_role en signal_cooldowns" ON public.signal_cooldowns;
CREATE POLICY "Acceso total service_role en signal_cooldowns"
    ON public.signal_cooldowns
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica en signal_cooldowns" ON public.signal_cooldowns;
CREATE POLICY "Lectura publica en signal_cooldowns"
    ON public.signal_cooldowns
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- 2. FUNCIÓN RPC ATÓMICA: acquire_signal_cooldown
-- Retorna TRUE si el cooldown fue adquirido (bloqueo exitoso para disparar).
-- Retorna FALSE si ya existe un cooldown activo que aún no expira (descarte atómico).
CREATE OR REPLACE FUNCTION public.acquire_signal_cooldown(
    p_asset TEXT,
    p_setup_type TEXT,
    p_event_id TEXT,
    p_cooldown_minutes INT DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    -- Blindaje: Acotar cooldown entre 1 y 60 min para evitar DoS por valores abusivos
    v_clamped_cooldown INT := LEAST(GREATEST(COALESCE(p_cooldown_minutes, 15), 1), 60);
    v_expires TIMESTAMPTZ := v_now + (v_clamped_cooldown || ' minutes')::INTERVAL;
    v_row_count INT := 0;
BEGIN
    -- Blindaje Anti-Spoofing: Exigir rol service_role (Cero acceso anónimo o usuarios autenticados)
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'Acceso denegado: acquire_signal_cooldown requiere privilegios de service_role.';
    END IF;

    INSERT INTO public.signal_cooldowns (asset, setup_type, last_triggered_at, expires_at, event_id)
    VALUES (p_asset, p_setup_type, v_now, v_expires, p_event_id)
    ON CONFLICT (asset, setup_type) DO UPDATE
    SET 
        last_triggered_at = EXCLUDED.last_triggered_at,
        expires_at = EXCLUDED.expires_at,
        event_id = EXCLUDED.event_id
    WHERE public.signal_cooldowns.expires_at < v_now;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    RETURN (v_row_count > 0);
END;
$$;

-- Blindaje Zero-Trust: Revocar permisos de ejecución a la web pública / anónimos
REVOKE EXECUTE ON FUNCTION public.acquire_signal_cooldown FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_signal_cooldown TO service_role;

-- 3. AMPLIACIÓN DE ESQUEMA: public.trading_signal_events (MAS v1.0.0)
ALTER TABLE public.trading_signal_events 
    ADD COLUMN IF NOT EXISTS schema_version VARCHAR(16) DEFAULT '1.0.0',
    ADD COLUMN IF NOT EXISTS confluence_score NUMERIC(5, 2) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS score_label VARCHAR(16) DEFAULT 'B',
    ADD COLUMN IF NOT EXISTS broadcast_decision VARCHAR(16) DEFAULT 'log_only',
    ADD COLUMN IF NOT EXISTS agent_1_output JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS agent_2_output JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS fallback_mode BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shadow_mode BOOLEAN DEFAULT FALSE;

-- Índices de auditoría y análisis cuantitativo
CREATE INDEX IF NOT EXISTS idx_trading_signal_events_score_label 
    ON public.trading_signal_events (score_label, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trading_signal_events_broadcast_decision 
    ON public.trading_signal_events (broadcast_decision, created_at DESC);
