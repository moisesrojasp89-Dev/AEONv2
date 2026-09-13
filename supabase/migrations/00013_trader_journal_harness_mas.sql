-- ==============================================================================
-- AEON Migration 00013: AI Trader Journal & Copilot Logging (Harness Architecture)
-- ==============================================================================
-- 1. Enums de estado, dirección y motivo de salida
-- 2. public.trader_journal: Diario institucional de trades con telemetría cuántica inmutable
-- 3. public.trader_weekly_audits: Registro de auditorías semanales del Evaluator Agent
-- 4. Políticas Zero-Trust RLS: Solo SELECT para authenticated, escrituras solo service_role
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE trade_direction_enum AS ENUM ('BUY', 'SELL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trade_status_enum AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trade_exit_reason_enum AS ENUM ('TP_HIT', 'SL_HIT', 'MANUAL_EXIT', 'BREAK_EVEN', 'CANCELLED_BY_USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLA: public.trader_journal
CREATE TABLE IF NOT EXISTS public.trader_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadatos del activo y orden
    symbol VARCHAR(16) NOT NULL,
    direction trade_direction_enum NOT NULL,
    entry_price NUMERIC(14, 4) NOT NULL,
    stop_loss NUMERIC(14, 4) NOT NULL,
    take_profit NUMERIC(14, 4) NOT NULL,
    
    -- Métricas derivadas planificadas
    planned_risk_points NUMERIC(14, 4) GENERATED ALWAYS AS (ABS(entry_price - stop_loss)) STORED,
    planned_reward_points NUMERIC(14, 4) GENERATED ALWAYS AS (ABS(take_profit - entry_price)) STORED,
    planned_rr_ratio NUMERIC(6, 2) GENERATED ALWAYS AS (
        CASE WHEN ABS(entry_price - stop_loss) > 0 
             THEN ROUND((ABS(take_profit - entry_price) / ABS(entry_price - stop_loss))::numeric, 2)
             ELSE 0.00 END
    ) STORED,
    
    -- Telemetría Cuántica Inmutable en Timestamp de Entrada (Harness Snapshot)
    quantum_context_at_entry JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Excursión en Tiempo Real (Actualizada por el Ratchet de 20s en VPS)
    mfe_r NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    mae_r NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    
    -- Estado y Cierre Soberano
    status trade_status_enum NOT NULL DEFAULT 'OPEN',
    entry_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_price NUMERIC(14, 4) NULL,
    exit_timestamp TIMESTAMPTZ NULL,
    exit_reason trade_exit_reason_enum NULL,
    
    -- Métricas Reales Obtenidas
    realized_pnl_points NUMERIC(14, 4) NULL,
    realized_rr NUMERIC(6, 2) NULL,
    
    -- Notas y Bitácora
    trader_rationale TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta de alta velocidad
CREATE INDEX IF NOT EXISTS idx_trader_journal_user_status ON public.trader_journal(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trader_journal_user_dates ON public.trader_journal(user_id, entry_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trader_journal_open_ratchet ON public.trader_journal(symbol) WHERE status = 'OPEN';

-- Políticas de Seguridad Zero-Trust RLS (Certificadas por el Arquitecto)
ALTER TABLE public.trader_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only read their own journal trades" ON public.trader_journal;
CREATE POLICY "Users can only read their own journal trades"
    ON public.trader_journal FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Denegar INSERT/UPDATE a authenticated explícitamente; service_role tiene bypass nativo
DROP POLICY IF EXISTS "Service role write access to trader_journal" ON public.trader_journal;
CREATE POLICY "Service role write access to trader_journal"
    ON public.trader_journal FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. TABLA: public.trader_weekly_audits
CREATE TABLE IF NOT EXISTS public.trader_weekly_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    -- Métricas Cuantitativas Agregadas
    total_trades_logged INT NOT NULL DEFAULT 0,
    winning_trades INT NOT NULL DEFAULT 0,
    losing_trades INT NOT NULL DEFAULT 0,
    breakeven_trades INT NOT NULL DEFAULT 0,
    win_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    net_pnl_r NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    profit_factor_rr NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    average_mae_r NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    average_mfe_r NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    
    -- Puntuación de Disciplina Cuántica (0 a 100)
    dpoc_confluence_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    risk_discipline_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    news_discipline_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    
    -- Diagnóstico Estructurado del Evaluator Agent
    audit_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trader_weekly_audits_user_dates ON public.trader_weekly_audits(user_id, week_start_date DESC);

ALTER TABLE public.trader_weekly_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only view their own weekly audits" ON public.trader_weekly_audits;
CREATE POLICY "Users can only view their own weekly audits"
    ON public.trader_weekly_audits FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role write access to trader_weekly_audits" ON public.trader_weekly_audits;
CREATE POLICY "Service role write access to trader_weekly_audits"
    ON public.trader_weekly_audits FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
