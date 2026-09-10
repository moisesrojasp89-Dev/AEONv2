-- ==============================================================================
-- AEON · MIGRACIÓN 00007: Alertas Automáticas de Pagos a Telegram (pg_net)
-- Dispara una notificación instantánea al bot cada vez que un cliente registra un pago
-- ==============================================================================

-- 1. Habilitar extensión pg_net (nativa en Supabase para peticiones HTTP asíncronas)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función disparadora que envía la alerta a Telegram
CREATE OR REPLACE FUNCTION public.notify_telegram_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg TEXT;
    v_token TEXT := '8925327698:AAFGcCc18tMjwCn9DsOwdfDuH3yKr9QGgjs';
    v_chat_id TEXT := '1323877692';
BEGIN
    v_msg := '🚨 *NUEVO PAGO REGISTRADO EN AEON* 🚨' || E'\n\n' ||
             '• *Orden:* `' || NEW.order_id || '`' || E'\n' ||
             '• *Plan:* ' || upper(NEW.plan) || ' (' || NEW.plan_days || ' días)' || E'\n' ||
             '• *Monto:* $' || NEW.amount || ' ' || NEW.currency || E'\n' ||
             '• *Método:* Binance Pay' || E'\n' ||
             '• *Ref / TxID:* `' || NEW.tx_reference || '`' || E'\n' ||
             '• *Usuario:* ' || coalesce(NEW.user_email, 'Anónimo') || E'\n' ||
             '• *Fecha:* ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS') || ' UTC' || E'\n\n' ||
             '👉 *Aprobar desde el panel móvil:*' || E'\n' ||
             'https://aeondev.vercel.app/admin-pagos.html';

    -- Enviar petición HTTP POST asíncrona a la API de Telegram
    PERFORM net.http_post(
        url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'chat_id', v_chat_id,
            'text', v_msg,
            'parse_mode', 'Markdown'
        )::jsonb
    );

    RETURN NEW;
END;
$$;

-- 3. Crear el Trigger en la tabla payments
DROP TRIGGER IF EXISTS trg_notify_telegram_payment ON public.payments;
CREATE TRIGGER trg_notify_telegram_payment
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_telegram_payment();
