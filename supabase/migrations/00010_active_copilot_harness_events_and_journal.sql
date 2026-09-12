-- ==============================================================================
-- AEON Migration 00010: Active Copilot Harness — Events Bus & Trade Journal
-- ==============================================================================
-- 1. public.trading_signal_events: Bus de eventos tácticos generados por el Centinela.
-- 2. public.user_trade_journal: Bitácora con discriminador 'checklist_audit' vs 'trade_opened'.
-- 3. public.check_overtrading_guardrail: RPC de ventana móvil (45 min) anti-ansiedad / sobreoperativa.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: public.trading_signal_events (Bus de Eventos Confluentes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64) UNIQUE NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(48) NOT NULL,
    current_price NUMERIC(16, 5) NOT NULL,
    market_data JSONB NOT NULL,
    llm_verdict TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'mitigated', 'invalidated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Índices de consulta de alta velocidad
CREATE INDEX IF NOT EXISTS idx_trading_signal_events_symbol_created 
    ON public.trading_signal_events (symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trading_signal_events_status_created 
    ON public.trading_signal_events (status, created_at DESC);

-- Seguridad Zero-Trust RLS
ALTER TABLE public.trading_signal_events ENABLE ROW LEVEL SECURITY;

-- Lectura pública para suscriptores de Realtime
DROP POLICY IF EXISTS "Permitir lectura de eventos tácticos a todos" ON public.trading_signal_events;
CREATE POLICY "Permitir lectura de eventos tácticos a todos"
    ON public.trading_signal_events
    FOR SELECT
    TO public
    USING (true);

-- Modificación exclusiva para el backend / service_role
DROP POLICY IF EXISTS "Escritura exclusiva de eventos a service_role" ON public.trading_signal_events;
CREATE POLICY "Escritura exclusiva de eventos a service_role"
    ON public.trading_signal_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. TABLA: public.user_trade_journal (Bitácora de Auditoría y Guardarraíl)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_trade_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(16) NOT NULL,
    -- Discriminador solicitado por el Arquitecto: distingue auditorías de trades reales
    entry_type VARCHAR(24) NOT NULL CHECK (entry_type IN ('checklist_audit', 'trade_opened', 'trade_closed')),
    session_origin VARCHAR(24) DEFAULT 'GLOBAL',
    in_consolidation BOOLEAN NOT NULL DEFAULT FALSE,
    trade_direction VARCHAR(8) CHECK (trade_direction IN ('BUY', 'SELL') OR trade_direction IS NULL),
    entry_price NUMERIC(16, 5),
    risk_reward_ratio NUMERIC(6, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice optimizado para la ventana móvil de 45 minutos del guardarraíl
CREATE INDEX IF NOT EXISTS idx_user_trade_journal_user_window 
    ON public.user_trade_journal (user_id, created_at DESC);

-- Seguridad Zero-Trust RLS
ALTER TABLE public.user_trade_journal ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede ver sus propios registros
DROP POLICY IF EXISTS "Usuarios pueden ver su propia bitacora" ON public.user_trade_journal;
CREATE POLICY "Usuarios pueden ver su propia bitacora"
    ON public.user_trade_journal
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Cada usuario solo puede insertar a su propio nombre
DROP POLICY IF EXISTS "Usuarios pueden insertar en su propia bitacora" ON public.user_trade_journal;
CREATE POLICY "Usuarios pueden insertar en su propia bitacora"
    ON public.user_trade_journal
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Los administradores y service_role pueden ver todo para soporte
DROP POLICY IF EXISTS "Service role acceso total a bitacora" ON public.user_trade_journal;
CREATE POLICY "Service role acceso total a bitacora"
    ON public.user_trade_journal
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. RPC: public.check_overtrading_guardrail (Evaluación en Ventana Móvil de 45m)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_overtrading_guardrail(
    p_user_id UUID,
    p_minutes INT DEFAULT 45
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_activity INT := 0;
    v_audits_count INT := 0;
    v_trades_count INT := 0;
    v_consolidation_audits INT := 0;
    v_consolidation_trades INT := 0;
    v_window_start TIMESTAMPTZ;
    v_should_warn BOOLEAN := FALSE;
    v_warn_message TEXT := NULL;
BEGIN
    -- 1. Control de Autorización anti-IDOR (Zero-Trust):
    -- Solo el propio usuario autenticado o el service_role pueden evaluar este guardarraíl
    IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'No autorizado: no puedes consultar la bitácora de otro usuario';
    END IF;

    v_window_start := NOW() - (p_minutes || ' minutes')::INTERVAL;

    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE entry_type = 'checklist_audit'),
        COUNT(*) FILTER (WHERE entry_type = 'trade_opened'),
        COUNT(*) FILTER (WHERE in_consolidation = TRUE AND entry_type = 'checklist_audit'),
        COUNT(*) FILTER (WHERE in_consolidation = TRUE AND entry_type = 'trade_opened')
    INTO 
        v_total_activity,
        v_audits_count,
        v_trades_count,
        v_consolidation_audits,
        v_consolidation_trades
    FROM public.user_trade_journal
    WHERE user_id = p_user_id
      AND created_at >= v_window_start;

    -- Regla del Guardarraíl:
    -- 1. 3 o más actividades totales en la ventana (p_minutes), O
    -- 2. Al menos 2 auditorías ansiosas en rango de consolidación, O
    -- 3. Cualquier trade abierto en rango de consolidación (rompe disciplina de confluencia)
    IF v_consolidation_trades >= 1 THEN
        v_should_warn := TRUE;
        v_warn_message := 'Pausa táctica recomendada. Has abierto ' || v_consolidation_trades || ' operación(es) en rango de consolidación sin confirmación de expansión. Protege tu capital.';
    ELSIF v_consolidation_audits >= 2 THEN
        v_should_warn := TRUE;
        v_warn_message := 'Pausa táctica recomendada. Has auditado ' || v_consolidation_audits || ' setups en rango de consolidación sin confluencia. Evita la ansiedad en rango muerto.';
    ELSIF v_total_activity >= 3 THEN
        v_should_warn := TRUE;
        v_warn_message := 'Alerta de sobreoperativa. Registras ' || v_total_activity || ' interacciones en los últimos ' || p_minutes || ' minutos. Respeta tu plan de trading.';
    END IF;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'window_minutes', p_minutes,
        'total_activity', v_total_activity,
        'audits_count', v_audits_count,
        'trades_count', v_trades_count,
        'consolidation_audits', v_consolidation_audits,
        'consolidation_trades', v_consolidation_trades,
        'guardrail_triggered', v_should_warn,
        'warning_message', v_warn_message
    );
END;
$$;

-- Permisos de ejecución seguros
REVOKE ALL ON FUNCTION public.check_overtrading_guardrail(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_overtrading_guardrail(UUID, INT) TO authenticated, service_role;
