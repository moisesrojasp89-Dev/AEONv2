-- ==============================================================================
-- AEON Master Schema: Terminal de Mercados e Inteligencia Macroeconómica
-- Tablas: public.market_intelligence & public.market_intelligence_history
-- ==============================================================================

-- 1. Tabla Principal de Estado en Vivo (14 Activos Oficiales)
CREATE TABLE IF NOT EXISTS public.market_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(16) NOT NULL UNIQUE,             -- 'SPX500', 'NAS100', 'US30', 'JP225', 'XAUUSD', 'BTCUSD', 'DXY', 'EURUSD', etc.
    category VARCHAR(16) NOT NULL,                  -- 'INDICES', 'METALS', 'CRYPTO', 'FOREX'
    display_name VARCHAR(64) NOT NULL,              -- 'Nasdaq 100', 'Oro Spot', 'Nikkei 225', etc.
    session_origin VARCHAR(16) NOT NULL,            -- 'US', 'ASIA', 'EUROPE', 'GLOBAL'
    current_price NUMERIC(14, 5) NOT NULL,          -- Precio spot actual
    change_24h_pct NUMERIC(6, 2) NOT NULL,          -- Variación porcentual en 24h
    bias VARCHAR(16) NOT NULL,                      -- 'BULLISH', 'BEARISH', 'NEUTRAL'
    bias_score INT NOT NULL CHECK (bias_score BETWEEN 0 AND 100), -- Fuerza de convicción (0-100)
    
    -- Niveles Microestructurales Cuantitativos
    support_1 NUMERIC(14, 5) NOT NULL,
    support_2 NUMERIC(14, 5),
    resistance_1 NUMERIC(14, 5) NOT NULL,
    resistance_2 NUMERIC(14, 5),
    dpoc_price NUMERIC(14, 5),                      -- Punto de Control de Volumen (Developing POC)
    session_vwap NUMERIC(14, 5),                    -- VWAP anclado a la sesión
    
    -- Síntesis Institucional Generada por Gemini
    macro_driver TEXT NOT NULL,                     -- Catalizador macroeconómico
    technical_thesis TEXT NOT NULL,                 -- Tesis técnica concisa
    cited_key_levels JSONB DEFAULT '[]'::jsonb,     -- Niveles citados validados programáticamente
    catalyst_tags JSONB DEFAULT '[]'::jsonb,        -- ['FED', 'INFLATION', 'BOJ', 'EARNINGS']
    
    -- Metadatos & Telemetría
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(32) DEFAULT 'AEON_MARKET_AGENT_V2'
);

-- 2. Tabla Append-Only de Historial para Track Record y Auditoría
CREATE TABLE IF NOT EXISTS public.market_intelligence_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(16) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    price NUMERIC(14, 5) NOT NULL,
    change_24h_pct NUMERIC(6, 2) NOT NULL,
    bias VARCHAR(16) NOT NULL,
    bias_score INT NOT NULL,
    support_1 NUMERIC(14, 5) NOT NULL,
    resistance_1 NUMERIC(14, 5) NOT NULL,
    dpoc_price NUMERIC(14, 5),
    session_vwap NUMERIC(14, 5),
    macro_driver TEXT NOT NULL,
    technical_thesis TEXT NOT NULL,
    catalyst_tags JSONB DEFAULT '[]'::jsonb
);

-- 3. Índices de Alto Rendimiento (< 5ms de consulta)
CREATE INDEX IF NOT EXISTS idx_market_intel_category ON public.market_intelligence (category);
CREATE INDEX IF NOT EXISTS idx_market_intel_symbol ON public.market_intelligence (symbol);
CREATE INDEX IF NOT EXISTS idx_market_hist_symbol_recorded ON public.market_intelligence_history (symbol, recorded_at DESC);

-- 4. Trigger Inmutable: Guarda copia histórica en cada actualización
CREATE OR REPLACE FUNCTION log_market_intelligence_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.market_intelligence_history (
        symbol, recorded_at, price, change_24h_pct, bias, bias_score, 
        support_1, resistance_1, dpoc_price, session_vwap, 
        macro_driver, technical_thesis, catalyst_tags
    ) VALUES (
        NEW.symbol, NEW.last_updated, NEW.current_price, NEW.change_24h_pct, NEW.bias, NEW.bias_score,
        NEW.support_1, NEW.resistance_1, NEW.dpoc_price, NEW.session_vwap,
        NEW.macro_driver, NEW.technical_thesis, NEW.catalyst_tags
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_market_intelligence_history ON public.market_intelligence;
CREATE TRIGGER trg_market_intelligence_history
AFTER INSERT OR UPDATE ON public.market_intelligence
FOR EACH ROW EXECUTE FUNCTION log_market_intelligence_history();

-- 5. Políticas RLS Zero-Trust
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence_history ENABLE ROW LEVEL SECURITY;

-- Lectura pública para la Terminal Web
DROP POLICY IF EXISTS "Public Read Market Intelligence" ON public.market_intelligence;
CREATE POLICY "Public Read Market Intelligence" ON public.market_intelligence 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Market Intelligence History" ON public.market_intelligence_history;
CREATE POLICY "Public Read Market Intelligence History" ON public.market_intelligence_history 
FOR SELECT USING (true);

-- Escritura restringida estrictamente a Service Role
DROP POLICY IF EXISTS "Service Role Upsert Market Intelligence" ON public.market_intelligence;
CREATE POLICY "Service Role Upsert Market Intelligence" ON public.market_intelligence 
FOR ALL USING (auth.role() = 'service_role');
