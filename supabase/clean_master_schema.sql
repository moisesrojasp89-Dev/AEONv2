-- ==============================================================================
-- AEON · CLEAN MASTER SCHEMA (2026-09-17)
-- Base de Datos Oficial Consolidada — US East (us-east-1)
-- Zero-Trust RLS • Sin Tablas Huerfanas de Senales • Realtime Optimizado
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. TABLA: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    backup_email TEXT,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'institutional', 'admin')),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'trader', 'admin')),
    timezone TEXT DEFAULT 'America/Caracas',
    language TEXT DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: public.subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('pro', 'institutional')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'past_due')),
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- 6. TABLA: public.economic_calendar (Eventos macroeconómicos)
CREATE TABLE IF NOT EXISTS public.economic_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE,
    event_time TIMESTAMPTZ NOT NULL,
    country TEXT NOT NULL,
    event_name TEXT NOT NULL,
    impact TEXT NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'MED', 'LOW', 'NONE', 'high', 'medium', 'med', 'low', 'none')),
    actual TEXT,
    forecast TEXT,
    previous TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABLA: public.news (Noticias de mercado)
CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    tag TEXT NOT NULL,
    tag_class TEXT,
    source TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_economic_calendar_time ON public.economic_calendar(event_time ASC);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at DESC);

-- A. Auto-creación de Perfil al Registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, tier, role, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'free',
        'user',
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Protección Estricta de Columnas 'tier' y 'role' en public.profiles
-- Evita que cualquier usuario modifique su propio rango desde el cliente
CREATE OR REPLACE FUNCTION public.protect_profile_tier()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) THEN
        IF current_setting('request.jwt.claim.role', true) <> 'service_role' AND auth.role() <> 'service_role' THEN
            RAISE EXCEPTION 'Acceso Denegado: No tienes autorización para modificar tu propio rango (tier) o rol.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_tier ON public.profiles;
CREATE TRIGGER trg_protect_profile_tier
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_tier();


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: Usuarios leen su propio perfil" ON public.profiles;
CREATE POLICY "Profiles: Usuarios leen su propio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: Usuarios actualizan su propio perfil" ON public.profiles;
CREATE POLICY "Profiles: Usuarios actualizan su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. SUBSCRIPTIONS: Usuarios leen únicamente su suscripción activa
DROP POLICY IF EXISTS "Subscriptions: Usuarios leen su suscripcion" ON public.subscriptions;
CREATE POLICY "Subscriptions: Usuarios leen su suscripcion"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);


DROP POLICY IF EXISTS "EconomicCalendar: Lectura publica" ON public.economic_calendar;
CREATE POLICY "EconomicCalendar: Lectura publica"
    ON public.economic_calendar FOR SELECT
    USING (true);

-- 6. NEWS: Lectura pública
DROP POLICY IF EXISTS "News: Lectura publica" ON public.news;
CREATE POLICY "News: Lectura publica"
    ON public.news FOR SELECT
    USING (true);


ALTER TABLE public.economic_calendar REPLICA IDENTITY FULL;


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


-- ==============================================================================
-- AEON · MIGRACIÓN 00004: Blindaje de Cuotas y Throttling para Chatbot IA (Fase A)
-- Gobernanza: Zero-Trust, Atomicidad Anti-Race-Conditions y Bloqueo PostgREST
-- Auditoría: Validado por Arquitectura de Seguridad (Opus/Sonnet)
-- ==============================================================================

-- 1. Tabla de Cuotas Diarias y Cooldown
CREATE TABLE IF NOT EXISTS public.user_ai_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_requests INT DEFAULT 0 NOT NULL,
  reset_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE NOT NULL,
  last_request_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;

-- Política de lectura: los usuarios autenticados solo pueden consultar su propio contador
DROP POLICY IF EXISTS "Los usuarios solo leen su propia cuota" ON public.user_ai_usage;
CREATE POLICY "Los usuarios solo leen su propia cuota"
  ON public.user_ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Stored Procedure Atómico con Bloqueo de Fila
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(
  p_user_id UUID,
  p_daily_limit INT DEFAULT 50,
  p_min_seconds_between_requests INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE;
  v_usage RECORD;
  v_seconds_since_last FLOAT;
BEGIN
  -- Insertar fila inicial si es su primera consulta histórica
  -- Se inicializa last_request_at con margen para que el primer mensaje no choque con el cooldown
  INSERT INTO public.user_ai_usage (user_id, daily_requests, reset_date, last_request_at)
  VALUES (p_user_id, 0, v_today, NOW() - (p_min_seconds_between_requests || ' seconds')::INTERVAL)
  ON CONFLICT (user_id) DO NOTHING;

  -- Bloqueo atómico FOR UPDATE para serializar llamadas concurrentes y evitar race conditions
  SELECT * INTO v_usage
  FROM public.user_ai_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 1. Anti-Spam: Cooldown de frecuencia (10 segundos)
  v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_usage.last_request_at));
  IF v_seconds_since_last < p_min_seconds_between_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'message', 'Por favor espera unos segundos antes de enviar otra consulta.',
      'retry_after', CEIL(p_min_seconds_between_requests - v_seconds_since_last)
    );
  END IF;

  -- 2. Reseteo diario atómico a las 00:00 UTC
  IF v_usage.reset_date < v_today THEN
    UPDATE public.user_ai_usage
    SET daily_requests = 1,
        reset_date = v_today,
        last_request_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_daily_limit - 1,
      'requests_today', 1
    );
  END IF;

  -- 3. Verificación de cuota máxima diaria (50 consultas)
  IF v_usage.daily_requests >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'message', 'Has alcanzado tu límite diario de consultas (50/día). Se restablecerá a las 00:00 UTC.',
      'remaining', 0
    );
  END IF;

  -- 4. Incremento atómico seguro
  UPDATE public.user_ai_usage
  SET daily_requests = daily_requests + 1,
      last_request_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_daily_limit - (v_usage.daily_requests + 1),
    'requests_today', v_usage.daily_requests + 1
  );
END;
$$;

-- 4. Blindaje PostgREST (Cierra el hueco DoS descubierto por el arquitecto)
-- Revoca la ejecución pública a usuarios anónimos y autenticados vía /rpc/
REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(UUID, INT, INT) FROM PUBLIC, anon, authenticated;

-- Otorga ejecución EXCLUSIVA al backend seguro (service_role de la Edge Function)
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID, INT, INT) TO service_role;


-- ==============================================================================
-- AEON · MIGRACIÓN 00005: Sistema de Pagos en Criptoactivos & Binance Pay
-- Gobernanza: RLS Estricto, Auditoría Inmutable y Activación Automatizada
-- VERSIÓN CORREGIDA — Auditoría Claude Opus 4.6 · 2026-09-08
-- ==============================================================================

-- 1. Crear tabla de pagos en criptoactivos
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    plan TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly', 'quarterly')),
    plan_days INT NOT NULL DEFAULT 30,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    payment_method TEXT NOT NULL DEFAULT 'binance_pay' CHECK (payment_method IN ('binance_pay', 'usdt_trc20', 'usdt_bep20')),
    tx_reference TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status, created_at DESC);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Política de inserción: Los usuarios autenticados solo pueden registrar sus propios pagos
DROP POLICY IF EXISTS "Usuarios registran su propio pago" ON public.payments;
CREATE POLICY "Usuarios registran su propio pago"
    ON public.payments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Política de lectura: Los usuarios solo pueden ver su propio historial de pagos
DROP POLICY IF EXISTS "Usuarios leen su historial de pagos" ON public.payments;
CREATE POLICY "Usuarios leen su historial de pagos"
    ON public.payments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Función RPC para Aprobación y Activación Instantánea de Membresía
-- CORREGIDA: Expira suscripciones previas antes de insertar la nueva
CREATE OR REPLACE FUNCTION public.approve_crypto_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- 1. VERIFICACIÓN DE SEGURIDAD: Solo Admin o Service Role pueden aprobar pagos
    IF current_setting('request.jwt.claim.role', true) <> 'service_role' AND auth.role() <> 'service_role' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND tier = 'admin'
        ) THEN
            RAISE EXCEPTION 'Acceso denegado: solo el administrador puede aprobar pagos.';
        END IF;
    END IF;

    -- Bloqueo de fila para evitar ejecuciones concurrentes
    SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Registro de pago no encontrado');
    END IF;

    IF v_pay.status = 'approved' THEN
        RETURN jsonb_build_object('success', false, 'message', 'El pago ya se encuentra aprobado');
    END IF;

    -- Calcular fecha límite según el plan (weekly: 7 días, monthly: 30 días, quarterly: 90 días)
    v_period_end := now() + (v_pay.plan_days || ' days')::INTERVAL;

    -- 1. Marcar pago como aprobado
    UPDATE public.payments
    SET status = 'approved', updated_at = now()
    WHERE id = p_payment_id;

    -- 2. Actualizar rango en el perfil a 'pro' (sin auto-degradar al admin si prueba un pago)
    UPDATE public.profiles
    SET tier = CASE WHEN tier = 'admin' THEN 'admin' ELSE 'pro' END
    WHERE id = v_pay.user_id;

    -- 3. Expirar suscripciones previas activas del mismo usuario
    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE user_id = v_pay.user_id
      AND plan = 'pro'
      AND status = 'active';

    -- 4. Insertar nueva suscripción activa con columnas exactas de la tabla
    INSERT INTO public.subscriptions (
        user_id, plan, status, current_period_end, created_at
    ) VALUES (
        v_pay.user_id, 'pro', 'active', v_period_end, now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_pay.user_id,
        'plan', v_pay.plan,
        'period_end', v_period_end,
        'message', 'Membresía PRO activada exitosamente'
    );
END;
$$;


-- ==============================================================================
-- AEON · MIGRACIÓN 00006: Panel Admin de Pagos (funciones RPC)
-- Permite listar y gestionar pagos pendientes desde la web
-- ==============================================================================

-- 1. Función para listar pagos pendientes (solo admins)
CREATE OR REPLACE FUNCTION public.admin_list_pending_payments()
RETURNS SETOF public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'admin' OR tier = 'admin')
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador.';
    END IF;

    RETURN QUERY
    SELECT * FROM public.payments
    WHERE status = 'pending'
    ORDER BY created_at DESC;
END;
$$;

-- 2. Función para rechazar pago (solo admins)
CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'admin' OR tier = 'admin')
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador.';
    END IF;

    UPDATE public.payments
    SET status = 'rejected', updated_at = now()
    WHERE id = p_payment_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pago no encontrado o ya procesado');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Pago rechazado');
END;
$$;

-- 3. IMPORTANTE: Ejecuta esto para marcarte como admin (cambia el email por el tuyo)
-- UPDATE public.profiles SET role = 'admin' WHERE id = (
--     SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI'
-- );


-- ==============================================================================
-- AEON · MIGRACIÓN 00006: Reembolso Atómico de Cuotas IA y Hardening de Seguridad
-- Gobernanza: Atomicidad Estricta, Zero-Trust y Protección search_path
-- Auditoría: Recomendaciones Claude Opus / Sonnet
-- ==============================================================================

-- 1. Función RPC Atómica para Reembolso de Cuota IA (Evita Race Conditions en Catch)
-- En una sola sentencia UPDATE, Postgres maneja el bloqueo de fila sin necesidad de SELECT previo
CREATE OR REPLACE FUNCTION public.refund_ai_quota(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_ai_usage
  SET daily_requests = GREATEST(daily_requests - 1, 0)
  WHERE user_id = p_user_id;
$$;

-- Blindaje PostgREST: Revoca ejecución pública y otorga permiso exclusivo a service_role
REVOKE ALL ON FUNCTION public.refund_ai_quota(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_quota(UUID) TO service_role;

-- ==============================================================================
-- 2. Hardening de search_path en Funciones Previas (SECURITY DEFINER)
-- ==============================================================================

-- A. handle_new_user (de migración 00001)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, tier, role, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'free',
        'user',
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- B. protect_profile_tier (de migración 00001)
CREATE OR REPLACE FUNCTION public.protect_profile_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) THEN
        IF current_setting('request.jwt.claim.role', true) <> 'service_role' AND auth.role() <> 'service_role' THEN
            RAISE EXCEPTION 'Acceso Denegado: No tienes autorización para modificar tu propio rango (tier) o rol.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;



-- ==============================================================================
-- Migración 00008: Habilitar Supabase Realtime para Pagos, Perfiles y Suscripciones
-- Permite que la aplicación web detecte en tiempo real cuando un pago es aprobado
-- ==============================================================================

DO $$
BEGIN
    -- 1. Habilitar Realtime para 'payments'
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    END IF;

    -- 2. Habilitar Realtime para 'profiles'
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;

    -- 3. Habilitar Realtime para 'subscriptions'
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'subscriptions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
    END IF;
END $$;


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
    -- Idempotencia y control de duplicados: registrar solo en inserción inicial
    -- o cuando el valor numérico realmente haya cambiado.
    IF (TG_OP = 'INSERT' OR OLD.current_value IS DISTINCT FROM NEW.current_value) THEN
        INSERT INTO public.macro_liquidity_history (
            symbol, recorded_at, value, change_24h, change_24h_pct, source_name
        ) VALUES (
            NEW.symbol, NEW.last_updated, NEW.current_value, NEW.change_24h,
            NEW.change_24h_pct, NEW.source_name
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_macro_liquidity_history ON public.macro_liquidity;

CREATE TRIGGER trg_macro_liquidity_history
AFTER INSERT OR UPDATE ON public.macro_liquidity
FOR EACH ROW
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

-- Habilitar Supabase Realtime (postgres_changes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'trading_signal_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signal_events;
    END IF;
END $$;

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


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'market_intelligence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.market_intelligence;
    END IF;
END $$;
