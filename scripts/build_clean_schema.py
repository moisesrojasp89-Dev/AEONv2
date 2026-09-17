import os

output_path = 'supabase/clean_master_schema.sql'

with open(output_path, 'w', encoding='utf-8') as out:
    out.write('-- ==============================================================================\n')
    out.write('-- AEON · CLEAN MASTER SCHEMA (2026-09-17)\n')
    out.write('-- Base de Datos Oficial Consolidada — US East (us-east-1)\n')
    out.write('-- Zero-Trust RLS • Sin Tablas Huerfanas de Senales • Realtime Optimizado\n')
    out.write('-- ==============================================================================\n\n')

    # 1. Extensiones
    out.write('CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n')
    out.write('CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";\n')
    out.write('CREATE EXTENSION IF NOT EXISTS pg_net;\n\n')

    # 2. Extract from 00001 (excluding signals)
    with open('supabase/migrations/00001_initial_schema_and_rls.sql', encoding='utf-8') as f:
        lines = f.readlines()
        # Profiles & subscriptions: lines 14 to 38
        out.write(''.join(lines[13:38]) + '\n')
        # Economic calendar & news: lines 65 to 91
        out.write(''.join(lines[64:91]) + '\n')
        # Performance indexes: lines 95-96, 99-100
        out.write(''.join([lines[94], lines[95], lines[98], lines[99]]) + '\n')
        # Functions & triggers: lines 106 to 147
        out.write(''.join(lines[105:147]) + '\n')
        # RLS enable: lines 151-152, 155-156
        out.write(''.join([lines[150], lines[151], lines[154], lines[155]]) + '\n')
        # RLS policies: lines 163 to 179, 209 to 219
        out.write(''.join(lines[162:179]) + '\n')
        out.write(''.join(lines[208:219]) + '\n')
        # Realtime: line 226
        out.write(lines[225] + '\n\n')

    # 3. Append 00003_daily_briefings_schema.sql
    with open('supabase/migrations/00003_daily_briefings_schema.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 4. Append 00004_user_ai_usage_and_quota.sql
    with open('supabase/migrations/00004_user_ai_usage_and_quota.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 5. Append 00005_crypto_payments.sql
    with open('supabase/migrations/00005_crypto_payments.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 6. Append 00006_admin_panel.sql
    with open('supabase/migrations/00006_admin_panel.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 7. Append 00006_ai_quota_refund (only refund function + hardened search_paths, no get_track_record)
    with open('supabase/migrations/00006_ai_quota_refund_and_security_hardening.sql', encoding='utf-8') as f:
        lines = f.readlines()
        out.write(''.join(lines[0:66]) + '\n\n')

    # 8. Append 00008_realtime_payments_profiles.sql
    with open('supabase/migrations/00008_realtime_payments_profiles.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 9. Append 00009_macro_liquidity.sql (including seed)
    with open('supabase/migrations/00009_macro_liquidity.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 10. Append 00010_active_copilot_harness_events_and_journal.sql
    with open('supabase/migrations/00010_active_copilot_harness_events_and_journal.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 11. Append 00013_trader_journal_harness_mas.sql
    with open('supabase/migrations/00013_trader_journal_harness_mas.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 12. Append scripts/db/create_market_intelligence_tables.sql
    with open('scripts/db/create_market_intelligence_tables.sql', encoding='utf-8') as f:
        out.write(f.read() + '\n\n')

    # 13. Enable Realtime on market_intelligence
    out.write("""DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'market_intelligence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.market_intelligence;
    END IF;
END $$;
""")

print(f"Master schema generated successfully at {output_path} (size: {os.path.getsize(output_path)} bytes)")

