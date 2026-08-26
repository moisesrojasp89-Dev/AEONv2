-- ==============================================================================
-- AEON Terminal — Migration 00001: Initial Schema, Security Triggers & RLS
-- ==============================================================================
-- Fecha: 25 de Agosto de 2026
-- Gobernanza: docs/AEON_TECHNICAL_AUDIT_MANDATE.md & docs/AEON_SECURITY_AUDIT.md
-- Objetivo: Establecer el esquema base relacional, control de acceso Zero-Trust,
--           protección server-side de rangos (Free/Pro) y RLS estricto.
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- 4. TABLA: public.signals (Pública: setup, régimen, confluencias, score)
CREATE TABLE IF NOT EXISTS public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_key TEXT UNIQUE,
    bot_message_id TEXT,
    asset TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL', 'LONG', 'SHORT', 'buy', 'sell', 'long', 'short')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'hit_tp1', 'closed_tp', 'closed_be', 'closed_sl', 'won', 'lost', 'cancelled')),
    confluences JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA: public.signals_pro_data (Privada: Niveles exactos de entrada, SL y TP)
CREATE TABLE IF NOT EXISTS public.signals_pro_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE UNIQUE,
    entry_price NUMERIC NOT NULL,
    stop_loss NUMERIC NOT NULL,
    take_profit NUMERIC NOT NULL,
    confluences JSONB DEFAULT '{}'::jsonb,
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

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_signals_status_time ON public.signals(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_pro_signal_id ON public.signals_pro_data(signal_id);
CREATE INDEX IF NOT EXISTS idx_economic_calendar_time ON public.economic_calendar(event_time ASC);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at DESC);

-- ==============================================================================
-- FUNCIONES Y TRIGGERS DE SEGURIDAD
-- ==============================================================================

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

-- ==============================================================================
-- HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals_pro_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY
-- ==============================================================================

-- 1. PROFILES: Usuarios leen y actualizan únicamente su propio perfil
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

-- 3. SIGNALS: Lectura pública (anónimos y autenticados)
DROP POLICY IF EXISTS "Signals: Lectura publica" ON public.signals;
CREATE POLICY "Signals: Lectura publica"
    ON public.signals FOR SELECT
    USING (true);

-- 4. SIGNALS_PRO_DATA: Acceso restringido exclusivamente a usuarios PRO / Institucionales / Admin
DROP POLICY IF EXISTS "SignalsPro: Acceso exclusivo PRO autenticado" ON public.signals_pro_data;
CREATE POLICY "SignalsPro: Acceso exclusivo PRO autenticado"
    ON public.signals_pro_data FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                  AND profiles.tier IN ('pro', 'institutional', 'admin')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.subscriptions
                WHERE subscriptions.user_id = auth.uid()
                  AND subscriptions.plan IN ('pro', 'institutional')
                  AND subscriptions.status = 'active'
                  AND subscriptions.current_period_end > now()
            )
        )
    );

-- 5. ECONOMIC_CALENDAR: Lectura pública
DROP POLICY IF EXISTS "EconomicCalendar: Lectura publica" ON public.economic_calendar;
CREATE POLICY "EconomicCalendar: Lectura publica"
    ON public.economic_calendar FOR SELECT
    USING (true);

-- 6. NEWS: Lectura pública
DROP POLICY IF EXISTS "News: Lectura publica" ON public.news;
CREATE POLICY "News: Lectura publica"
    ON public.news FOR SELECT
    USING (true);

-- ==============================================================================
-- CONFIGURACIÓN DE SUPABASE REALTIME (Zero-Leakage)
-- ==============================================================================
-- Habilitar REPLICA IDENTITY FULL para que Realtime respete los filtros RLS en sockets
ALTER TABLE public.signals REPLICA IDENTITY FULL;
ALTER TABLE public.signals_pro_data REPLICA IDENTITY FULL;
ALTER TABLE public.economic_calendar REPLICA IDENTITY FULL;
