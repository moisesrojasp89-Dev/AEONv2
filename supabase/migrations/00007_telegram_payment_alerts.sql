-- ==============================================================================
-- AEON · MIGRACIÓN 00007: Alertas Automáticas de Pagos a Telegram (pg_net)
-- VERSIÓN BLINDADA POR ARQUITECTURA:
-- 1. Emplea HTML en lugar de Markdown para evitar fallos por guiones bajos (_) en correos o TxIDs
-- 2. Bloque defensivo EXCEPTION: Una falla de red externa NUNCA aborta el registro del pago
-- 3. Modo Asíncrono no bloqueante: 0ms de latencia para el cliente web
-- ==============================================================================

-- 1. Habilitar extensión pg_net (nativa en Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función disparadora que envía la alerta a Telegram con tolerancia total a fallos
CREATE OR REPLACE FUNCTION public.notify_telegram_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg TEXT;
    -- Reemplazar con el token del bot de Telegram en la consola de Supabase (no versionar en Git)
    v_token TEXT := 'TU_TELEGRAM_BOT_TOKEN_AQUI';
    v_chat_id TEXT := '1323877692';
    v_email TEXT;
BEGIN
    -- Limpieza básica de caracteres especiales HTML
    v_email := replace(replace(coalesce(NEW.user_email, 'Anónimo'), '<', '&lt;'), '>', '&gt;');

    v_msg := '🚨 <b>NUEVO PAGO REGISTRADO EN AEON</b> 🚨' || E'\n\n' ||
             '• <b>Orden:</b> <code>' || NEW.order_id || '</code>' || E'\n' ||
             '• <b>Plan:</b> ' || upper(NEW.plan) || ' (' || NEW.plan_days || ' días)' || E'\n' ||
             '• <b>Monto:</b> $' || NEW.amount || ' ' || NEW.currency || E'\n' ||
             '• <b>Método:</b> Binance Pay' || E'\n' ||
             '• <b>Ref / TxID:</b> <code>' || coalesce(NEW.tx_reference, '—') || '</code>' || E'\n' ||
             '• <b>Usuario:</b> ' || v_email || E'\n' ||
             '• <b>Fecha:</b> ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS') || ' UTC' || E'\n\n' ||
             '👉 <b>Aprobar desde el panel móvil:</b>' || E'\n' ||
             'https://aeondev.vercel.app/admin-pagos.html';

    -- Bloque protegido: Si la llamada externa a Telegram falla, el pago IGUAL se guarda en BD
    BEGIN
        PERFORM net.http_post(
            url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := json_build_object(
                'chat_id', v_chat_id,
                'text', v_msg,
                'parse_mode', 'HTML'
            )::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        -- Registrar advertencia en logs de Supabase sin romper la transacción del cliente
        RAISE WARNING 'AEON: Error enviando alerta a Telegram: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- 3. Crear el Trigger en la tabla payments
DROP TRIGGER IF EXISTS trg_notify_telegram_payment ON public.payments;
CREATE TRIGGER trg_notify_telegram_payment
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_telegram_payment();
