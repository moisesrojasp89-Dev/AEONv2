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

-- C. get_track_record_summary (de migración 00002)
-- Se asegura search_path = public y permisos explícitos
CREATE OR REPLACE FUNCTION public.get_track_record_summary()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    decisive_count integer;
    won_c integer;
    be_c integer;
    lost_c integer;
    total_c integer;
    total_gains_r numeric;
    total_losses_r numeric;
    win_rate_val numeric;
    profit_factor_val text;
    avg_r_val numeric;
    net_r_val numeric;
BEGIN
    -- Contar y agregar trades cerrados auditados
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('closed_tp', 'won') OR (confluences->>'realized_r')::numeric > 0),
        COUNT(*) FILTER (WHERE status = 'closed_be' OR (confluences->>'realized_r')::numeric = 0),
        COUNT(*) FILTER (WHERE status IN ('closed_sl', 'lost') OR (confluences->>'realized_r')::numeric < 0),
        COALESCE(SUM(CASE 
            WHEN (confluences->>'realized_r')::numeric > 0 THEN (confluences->>'realized_r')::numeric
            WHEN status IN ('closed_tp', 'won') THEN COALESCE((confluences->>'rr_ratio')::numeric, 2.5)
            ELSE 0 
        END), 0),
        COALESCE(SUM(CASE 
            WHEN (confluences->>'realized_r')::numeric < 0 THEN ABS((confluences->>'realized_r')::numeric)
            WHEN status IN ('closed_sl', 'lost') THEN 1.0
            ELSE 0 
        END), 0)
    INTO 
        total_c, won_c, be_c, lost_c, total_gains_r, total_losses_r
    FROM public.signals
    WHERE status IN ('closed_tp', 'closed_be', 'closed_sl', 'won', 'lost');

    IF total_c = 0 THEN
        RETURN json_build_object(
            'total', 0,
            'won', 0,
            'be', 0,
            'lost', 0,
            'winRate', '0.0%',
            'profitFactor', '0.00',
            'avgR', '0.00',
            'totalR', '+0.0R'
        );
    END IF;

    decisive_count := won_c + lost_c;
    
    IF decisive_count > 0 THEN
        win_rate_val := ROUND((won_c::numeric / decisive_count::numeric) * 100, 1);
    ELSE
        win_rate_val := 0.0;
    END IF;

    IF total_losses_r > 0 THEN
        profit_factor_val := ROUND((total_gains_r / total_losses_r), 2)::text;
    ELSIF total_gains_r > 0 THEN
        profit_factor_val := '∞';
    ELSE
        profit_factor_val := '0.00';
    END IF;

    IF won_c > 0 THEN
        avg_r_val := ROUND((total_gains_r / won_c::numeric), 2);
    ELSE
        avg_r_val := 2.50;
    END IF;

    net_r_val := ROUND((total_gains_r - total_losses_r), 1);

    SELECT json_build_object(
        'total', total_c,
        'won', won_c,
        'be', be_c,
        'lost', lost_c,
        'winRate', win_rate_val::text || '%',
        'profitFactor', profit_factor_val,
        'avgR', avg_r_val::text,
        'totalR', (CASE WHEN net_r_val >= 0 THEN '+' || net_r_val::text ELSE net_r_val::text END) || 'R'
    ) INTO result;

    RETURN result;
END;
$$;

-- Permisos explícitos para get_track_record_summary
REVOKE ALL ON FUNCTION public.get_track_record_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_track_record_summary() TO anon, authenticated, service_role;
