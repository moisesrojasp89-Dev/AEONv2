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
