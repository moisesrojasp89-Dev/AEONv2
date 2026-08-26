// AEON · supabase/functions/calendar-cleanup/index.ts
// ============================================================
// Edge Function de limpieza mensual del calendario económico.
//
// POLÍTICA DE RETENCIÓN: 24 meses
//   - Eventos más viejos que 24 meses se eliminan automáticamente
//   - Los eventos recientes y del mes actual nunca se tocan
//
// ACTIVACIÓN:
//   - Desplegar con: npx supabase functions deploy calendar-cleanup
//   - Programar en Supabase Dashboard → Database → Cron Jobs:
//     Cron expression: 0 3 1 * *  (1ro de cada mes a las 3:00 AM UTC)
//     Command:
//       SELECT net.http_post(
//         url := 'https://[TU_PROJECT_ID].supabase.co/functions/v1/calendar-cleanup',
//         headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
//       );
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RETENTION_MONTHS = 24;
const TABLE = 'economic_calendar';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verificar obligatoriamente que el Bearer token coincida con la service_role_key o secret de cron
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('CRON_SECRET') || Deno.env.get('SERVICE_ROLE_KEY');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (!token || !expectedSecret || token !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden: Invalid service authorization token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Calcular la fecha de corte: hoy - 24 meses
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  const cutoffISO = cutoff.toISOString();

  console.log(`[CLEANUP] Deleting ${TABLE} events older than ${cutoffISO}`);

  const { error, count } = await supabase
    .from(TABLE)
    .delete({ count: 'exact' })
    .lt('event_time', cutoffISO);

  if (error) {
    console.error('[CLEANUP] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = {
    success: true,
    table: TABLE,
    deleted_count: count ?? 0,
    retention_months: RETENTION_MONTHS,
    cutoff_date: cutoffISO,
    executed_at: new Date().toISOString(),
  };

  console.log('[CLEANUP] ✅ Done:', result);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
