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
