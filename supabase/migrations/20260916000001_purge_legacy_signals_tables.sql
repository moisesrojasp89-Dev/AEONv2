-- ==============================================================================
-- AEON · MIGRACIÓN 20260916000001: Purga Integral de Tablas y RPCs de Señales Legadas
-- ==============================================================================
-- Mandato: Consolidación MAS v1.1.0 y TECH-01 (Aprobado por el Arquitecto Técnico)
-- Propósito: Erradicar del esquema relacional las tablas obsoletas de compra/venta
--            y la función RPC huérfana de track record que consultaba public.signals.
-- Nota: Se preserva intacta la tabla física public.trading_signal_events (Opción B)
--       para la replicación lógica Realtime del Centinela MAS y del Chat Copilot.
-- ==============================================================================

-- 1. Eliminar la función RPC huérfana get_track_record_summary()
--    (Requerimiento obligatorio: DROP TABLE CASCADE no elimina funciones PL/pgSQL
--     que consultan la tabla por dentro, evitando errores de 'relation does not exist').
DROP FUNCTION IF EXISTS public.get_track_record_summary();

-- 2. Revocar y eliminar las políticas de seguridad RLS asociadas a signals
DROP POLICY IF EXISTS "Signals: Lectura publica" ON public.signals;
DROP POLICY IF EXISTS "SignalsPro: Acceso exclusivo PRO autenticado" ON public.signals_pro_data;
DROP POLICY IF EXISTS "Public signals are viewable by everyone" ON public.signals;
DROP POLICY IF EXISTS "Pro data viewable by pro users" ON public.signals_pro_data;
DROP POLICY IF EXISTS "Service role full access signals" ON public.signals;
DROP POLICY IF EXISTS "Service role full access signals_pro_data" ON public.signals_pro_data;

-- 3. Eliminar índices secundarios de las tablas de señales
DROP INDEX IF EXISTS public.idx_signals_status_time;
DROP INDEX IF EXISTS public.idx_signals_pro_signal_id;

-- 4. Eliminación física en cascada de las tablas legadas
DROP TABLE IF EXISTS public.signals_pro_data CASCADE;
DROP TABLE IF EXISTS public.signals CASCADE;

-- 5. Clarificación semántica en base de datos de la tabla física viva
COMMENT ON TABLE public.trading_signal_events IS 
  'Bus de eventos contextuales y microestructura para el Centinela MAS y Copilot. Tabla física preservada para replicación lógica Realtime (Opción B).';
