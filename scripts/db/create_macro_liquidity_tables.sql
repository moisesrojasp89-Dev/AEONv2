-- ==============================================================================
-- AEON Master Migration 00009: Macro Liquidity & Fed Policy Pulse
-- Tablas: public.macro_liquidity & public.macro_liquidity_history
-- Estándar: Zero-Trust RLS, Auditoría Inmutable & Supabase Realtime
-- CORREGIDO: trigger de historial ahora solo registra cambios reales de valor
-- ==============================================================================

-- 1. Tabla Principal de Estado en Vivo (Pulsos de Liquidez Central y Tasas)

CREATE TABLE IF NOT EXISTS public.macro_liquidity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(16) NOT NULL UNIQUE,               -- 'US10Y', 'US02Y', 'FEDFUNDS', 'RRPONTSYD', 'WALCL'
    name VARCHAR(64) NOT NULL,                        -- 'Rendimiento Tesoro 10A', 'Tasa Fed Funds', etc.
    category VARCHAR(24) NOT NULL DEFAULT 'FED_LIQUIDITY', -- 'TREASURY_YIELD', 'FED_RATE', 'FED_LIQUIDITY', 'BALANCE_SHEET'
    current_value NUMERIC(16, 4) NOT NULL,            -- Valor actual (ej. 4.924, 3.63, 432, 6.74)
    previous_value NUMERIC(16, 4),                    -- Valor de la sesión / semana anterior

    -- NOTA: el nombre "change_24h" es heredado del resto del esquema de AEON,
    -- pero la cadencia real de cambio depende del símbolo: US10Y/US02Y son
    -- intradía, FEDFUNDS/RRPONTSYD son diarios, y WALCL es SEMANAL (jueves).
    -- No asumir "24 horas" al leer este campo para WALCL.
    change_24h NUMERIC(12, 4) DEFAULT 0,              -- Cambio absoluto (ej. +0.079, -194)
    change_24h_pct NUMERIC(8, 2) DEFAULT 0,           -- Cambio porcentual (ej. +1.63%, -30.99%)

    unit VARCHAR(8) NOT NULL DEFAULT '%',             -- '%', 'M' (millones), 'B' (miles de millones), 'T' (billones)
    display_order INT NOT NULL DEFAULT 0,             -- Orden visual en el HUD (1 a 5)
    impact_bias VARCHAR(16) DEFAULT 'NEUTRAL',        -- 'RESTRICTIVE' (sube tasa/yields), 'EXPANSIVE' (drena RRP/baja tasa), 'NEUTRAL'

    -- Síntesis Pedagógica e Institucional
    description TEXT NOT NULL,                        -- Qué mide exactamente
    market_implication TEXT NOT NULL,                 -- Cómo afecta al Oro, Índices, Cripto y Dólar
    source_name VARCHAR(32) NOT NULL DEFAULT 'NY_FED_TREASURY', -- 'NY_FED', 'US_TREASURY', 'FRED'

    -- Metadatos & Telemetría
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(32) DEFAULT 'AEON_AUTONOMOUS_ENGINE_V2'
);

-- 2. Tabla Append-Only de Historial para Auditoría Cuantitativa y Gráficos

CREATE TABLE IF NOT EXISTS public.macro_liquidity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(16) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value NUMERIC(16, 4) NOT NULL,
    change_24h NUMERIC(12, 4),
    change_24h_pct NUMERIC(8, 2),
    source_name VARCHAR(32) DEFAULT 'NY_FED_TREASURY'
);

-- 3. Índices de Alto Rendimiento (< 5ms de latencia)

CREATE INDEX IF NOT EXISTS idx_macro_liquidity_symbol ON public.macro_liquidity (symbol);
CREATE INDEX IF NOT EXISTS idx_macro_liquidity_order ON public.macro_liquidity (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_macro_liq_hist_symbol_time ON public.macro_liquidity_history (symbol, recorded_at DESC);

-- 4. Trigger Inmutable: Respaldo histórico automático SOLO cuando el valor cambia
--
-- CORRECCIÓN: la versión original disparaba en CUALQUIER UPDATE, incluyendo
-- re-ejecuciones idempotentes del seed (sección 7, ON CONFLICT DO UPDATE) y
-- sincronizaciones periódicas de símbolos que no cambian a cada ciclo (WALCL
-- es semanal). Eso duplicaba filas de historial con el mismo valor cada vez
-- que se corría la migración o el motor de sincronización. La condición WHEN
-- de abajo hace que solo se registre un punto histórico cuando:
--   a) es la primera inserción del símbolo, o
--   b) el valor realmente cambió respecto al registro anterior.

CREATE OR REPLACE FUNCTION log_macro_liquidity_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.macro_liquidity_history (
        symbol, recorded_at, value, change_24h, change_24h_pct, source_name
    ) VALUES (
        NEW.symbol, NEW.last_updated, NEW.current_value, NEW.change_24h,
        NEW.change_24h_pct, NEW.source_name
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_macro_liquidity_history ON public.macro_liquidity;

CREATE TRIGGER trg_macro_liquidity_history
AFTER INSERT OR UPDATE ON public.macro_liquidity
FOR EACH ROW
WHEN (
    TG_OP = 'INSERT'
    OR OLD.current_value IS DISTINCT FROM NEW.current_value
)
EXECUTE FUNCTION log_macro_liquidity_history();

-- 5. Seguridad Zero-Trust: Row Level Security (RLS)

ALTER TABLE public.macro_liquidity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_liquidity_history ENABLE ROW LEVEL SECURITY;

-- Lectura pública para terminales y visitantes (Cero credenciales secretas en cliente)

DROP POLICY IF EXISTS "Public Read Macro Liquidity" ON public.macro_liquidity;
CREATE POLICY "Public Read Macro Liquidity" ON public.macro_liquidity
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Macro Liquidity History" ON public.macro_liquidity_history;
CREATE POLICY "Public Read Macro Liquidity History" ON public.macro_liquidity_history
    FOR SELECT USING (true);

-- Escritura restringida estrictamente al Service Role del motor backend
-- (Protección Anti-Tampering). NOTA: la clave service_role de Supabase ya
-- tiene BYPASSRLS a nivel de rol de Postgres, así que esta policy es una
-- capa defensiva/documentación, no el único mecanismo de protección real
-- — ese mecanismo real es que el frontend NUNCA debe tener la service_role key.

DROP POLICY IF EXISTS "Service Role Manage Macro Liquidity" ON public.macro_liquidity;
CREATE POLICY "Service Role Manage Macro Liquidity" ON public.macro_liquidity
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service Role Manage Macro Liquidity History" ON public.macro_liquidity_history;
CREATE POLICY "Service Role Manage Macro Liquidity History" ON public.macro_liquidity_history
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Habilitar Supabase Realtime para actualización viva sin recargar pantalla

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'macro_liquidity'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.macro_liquidity;
    END IF;
END $$;

-- 7. Seed Data Institucional Inicial (Calibrado con los 5 Pilares de la Fed)
-- Idempotente para public.macro_liquidity (ON CONFLICT DO UPDATE). Gracias al
-- trigger corregido en el punto 4, re-ejecutar este bloque con los mismos
-- valores YA NO genera filas duplicadas en macro_liquidity_history.

INSERT INTO public.macro_liquidity (
    symbol, name, category, current_value, previous_value, change_24h,
    change_24h_pct, unit, display_order, impact_bias, description,
    market_implication, source_name, last_updated
) VALUES
(
    'US10Y',
    'Rendimiento del Tesoro a 10 Años',
    'TREASURY_YIELD',
    4.924, 4.845, 0.079, 1.63, '%', 1, 'RESTRICTIVE',
    'Tasa libre de riesgo global y benchmark de descuento financiero mundial.',
    'Si sube, eleva el costo de capital y presiona a la baja al Oro y a las acciones tecnológicas (Nasdaq). Si cae, alivia las condiciones financieras y expande múltiplos bursátiles.',
    'US_TREASURY_YAHOO', NOW()
),
(
    'US02Y',
    'Rendimiento del Tesoro a 2 Años',
    'TREASURY_YIELD',
    4.554, 4.436, 0.118, 2.66, '%', 2, 'RESTRICTIVE',
    'Expectativa directa del mercado sobre los tipos de interés de la Fed a corto plazo.',
    'Altamente sensible a los datos de inflación (CPI) y empleo (NFP). Junto al US10Y forma el diferencial de la Curva de Rendimientos (10Y - 2Y): la inversión predice recesión; la desinversión marca el inicio del ciclo de flexibilización.',
    'US_TREASURY_YAHOO', NOW()
),
(
    'FEDFUNDS',
    'Tasa Efectiva Fondos Federales (EFFR)',
    'FED_RATE',
    3.630, 3.630, 0.000, 0.00, '%', 3, 'NEUTRAL',
    'Tasa oficial interbancaria de préstamos no garantizados overnight entre bancos de EE.UU.',
    'El ancla suprema de la política monetaria. Determina el tipo de interés base para hipotecas, bonos corporativos, tarjetas de crédito y préstamos en toda la economía global.',
    'NY_FED_OFFICIAL', NOW()
),
(
    'RRPONTSYD',
    'Overnight Reverse Repo (RRP)',
    'FED_LIQUIDITY',
    432.000, 626.000, -194.000, -30.99, 'M', 4, 'EXPANSIVE',
    'Monto de liquidez excedente que los fondos del mercado monetario aparcan cada día en la Fed.',
    'Gasolina de liquidez pura para los mercados. Cuando el RRP cae (drena), los fondos monetarios compran Letras del Tesoro (T-Bills) e inyectan efectivo a la economía financiera, impulsando alzas en acciones y criptoactivos.',
    'NY_FED_OFFICIAL', NOW()
),
(
    'WALCL',
    'Balance Total de la Reserva Federal',
    'BALANCE_SHEET',
    6.740, 6.734, 0.006, 0.09, 'T', 5, 'NEUTRAL',
    'Total de activos en posesión de la Reserva Federal (portafolio de deuda SOMA).',
    'Mide el ritmo de Quantitative Tightening (QT - destrucción de balance) o Quantitative Easing (QE - expansión monetaria). Históricamente, la dirección del balance de la Fed marca el techo o suelo tendencial del S&P 500 y Bitcoin.',
    'FRED_ST_LOUIS', NOW()
)
ON CONFLICT (symbol) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    previous_value = EXCLUDED.previous_value,
    change_24h = EXCLUDED.change_24h,
    change_24h_pct = EXCLUDED.change_24h_pct,
    last_updated = EXCLUDED.last_updated,
    impact_bias = EXCLUDED.impact_bias;

-- ==============================================================================
-- Notas de Arquitectura para el Arquitecto
-- ==============================================================================
-- 1. Seguridad Zero-Trust: RLS habilitada; SELECT público; INSERT/UPDATE/DELETE
--    blindados a service_role (ver nota en el punto 5 sobre BYPASSRLS).
-- 2. Patrón Append-Only corregido: el trigger ahora solo archiva cuando el
--    valor cambia de verdad, evitando ruido en el historial por reseeds o
--    sincronizaciones de símbolos de baja frecuencia (WALCL semanal).
-- 3. Idempotencia: el bloque de inserción usa ON CONFLICT (symbol) DO UPDATE,
--    y ahora es idempotente de extremo a extremo (tabla principal + historial).
-- 4. Supabase Realtime: la tabla se agrega a la publicación supabase_realtime
--    para reactividad en vivo sin recargar pantalla.
