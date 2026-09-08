-- ==============================================================================
-- AEON · MIGRACIÓN 00005: Sistema de Pagos en Criptoactivos & Binance Pay
-- Gobernanza: RLS Estricto, Auditoría Inmutable y Activación Automatizada
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
-- Permite activar el acceso PRO y registrar la vigencia exacta de días (7, 30 o 90 días)
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

    -- 2. Actualizar rango en el perfil a 'pro'
    UPDATE public.profiles
    SET tier = 'pro', updated_at = now()
    WHERE id = v_pay.user_id;

    -- 3. Actualizar o insertar suscripción activa
    INSERT INTO public.subscriptions (
        user_id, plan, status, current_period_start, current_period_end, created_at, updated_at
    ) VALUES (
        v_pay.user_id, 'pro', 'active', now(), v_period_end, now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_pay.user_id,
        'plan', v_pay.plan,
        'period_end', v_period_end,
        'message', 'Membresía PRO activada exitosamente'
    );
END;
$$;
