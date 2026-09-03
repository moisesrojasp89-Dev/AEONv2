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
