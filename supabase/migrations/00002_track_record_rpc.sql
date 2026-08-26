-- ==============================================================================
-- AEON Terminal — Migration 00002: Track Record Server-Side Aggregation RPC
-- ==============================================================================
-- Fecha: 25 de Agosto de 2026
-- Objetivo: Computar Win Rate, Profit Factor, R Promedio y R Neto en PostgreSQL
--           con 0ms lag y sobre el 100% de los trades históricos (Zero Client Math).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_track_record_summary()
RETURNS json AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
