/**
 * AEON · scripts/upsert_calendar.mjs
 * ============================================================
 * Bot de inserción/actualización del Calendario Económico.
 * 
 * Usa UPSERT (INSERT ... ON CONFLICT DO UPDATE) para que:
 *   - Si el evento ya existe → actualiza los campos (útil cuando
 *     el dato "Pendiente" se convierte en dato real)
 *   - Si es nuevo → lo inserta
 *   - Si el bot corre N veces → nunca duplica filas
 *
 * El UNIQUE constraint (event_time, event_name, country) ya fue
 * aplicado en Supabase. Este script respeta esa restricción.
 *
 * USO:
 *   node scripts/upsert_calendar.mjs
 *
 * VARIABLES DE ENTORNO REQUERIDAS (en .env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY  (o SERVICE_ROLE_KEY para bots server-side)
 * ============================================================
 */

import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// ── Supabase client ──────────────────────────────────────────
// Nota: los bots server-side deben usar SERVICE_ROLE_KEY
// (la anon key tiene RLS que puede bloquear escrituras)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// ── Función principal de upsert ──────────────────────────────
/**
 * @param {Array} events - Array de eventos extraídos de la fuente externa
 * Cada evento debe tener: event_time, event_name, country, impact, actual, forecast, previous
 */
export async function upsertCalendarEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    console.log('[CALENDAR] No events to upsert.');
    return { inserted: 0, updated: 0, errors: [] };
  }

  // Normalizar los datos antes de insertar
  const normalized = events.map(evt => ({
    event_time: evt.event_time,           // timestamptz — REQUERIDO
    event_name: String(evt.event_name || evt.event || '').trim(),  // REQUERIDO
    country:    String(evt.country || 'USD').toUpperCase().trim(),  // REQUERIDO
    impact:     capitalizeFirst(evt.impact || 'Low'),  // 'High' | 'Medium' | 'Low'
    actual:     evt.actual   || 'Pendiente',
    forecast:   evt.forecast || '—',
    previous:   evt.previous || '—',
    updated_at: new Date().toISOString(),  // forzar actualización del timestamp
  }));

  const { data, error } = await supabase
    .from('economic_calendar')
    .upsert(normalized, {
      onConflict: 'event_time,event_name,country',  // debe coincidir con el UNIQUE constraint
      ignoreDuplicates: false,   // false = actualiza si hay cambios (ej. actual pasa de Pendiente a dato real)
    })
    .select('id, event_name, country, event_time');

  if (error) {
    console.error('[CALENDAR] Upsert error:', error.message);
    throw error;
  }

  console.log(`[CALENDAR] ✅ Upserted ${data?.length ?? 0} events`);
  return { upserted: data?.length ?? 0, errors: [] };
}

// ── Helper ───────────────────────────────────────────────────
function capitalizeFirst(str) {
  const s = String(str).toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Ejemplo de uso directo ───────────────────────────────────
// Cuando este script se ejecute directamente (no como módulo importado)
// carga datos de ejemplo. En producción, los datos vienen del scraper/API.
if (process.argv[1].endsWith('upsert_calendar.mjs')) {
  const sampleEvents = [
    {
      event_time: '2026-09-05T12:30:00+00:00',
      event_name: 'Non-Farm Employment Change',
      country:    'USD',
      impact:     'High',
      actual:     'Pendiente',
      forecast:   '185K',
      previous:   '177K',
    },
    {
      event_time: '2026-09-05T12:30:00+00:00',
      event_name: 'Unemployment Rate',
      country:    'USD',
      impact:     'High',
      actual:     'Pendiente',
      forecast:   '4.2%',
      previous:   '4.3%',
    },
  ];

  upsertCalendarEvents(sampleEvents)
    .then(result => {
      console.log('[CALENDAR] Result:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('[CALENDAR] Fatal error:', err);
      process.exit(1);
    });
}
