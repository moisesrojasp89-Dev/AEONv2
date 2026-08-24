/**
 * AEON · scripts/calendar_updater.mjs
 * ============================================================
 * Bot de actualización de datos reales del Calendario Económico.
 *
 * DIFERENCIA con calendar_bot.mjs:
 *   calendar_bot.mjs   → Pre-carga eventos FUTUROS (próximos 60 días)
 *                         actual = 'Pendiente'
 *   calendar_updater.mjs → Actualiza eventos PASADOS con sus datos reales
 *                           Busca eventos de los últimos 5 días en FMP
 *                           Si FMP ya tiene el 'actual' → lo actualiza en DB
 *
 * ¿POR QUÉ ES NECESARIO?
 *   Cuando el NFP sale a las 8:30 AM (dato real = -23K), FMP lo registra.
 *   Este bot lo detecta y actualiza la fila en Supabase.
 *   El frontend automáticamente muestra el beat/miss al ver actual ≠ 'Pendiente'.
 *
 * FRECUENCIA DE EJECUCIÓN:
 *   Cada día a las 7:00 PM UTC (después del cierre de mercados NY)
 *   Así captura todos los datos que salieron durante el día.
 *
 * VARIABLES DE ENTORNO (mismas que calendar_bot.mjs):
 *   FMP_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * ============================================================ */

import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────
const FMP_API_KEY   = process.env.FMP_API_KEY;
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AGENT_NAME    = 'calendar-updater';
const LOOKBACK_DAYS = 5;  // Buscar eventos de los últimos 5 días (cubre fines de semana)

const COUNTRY_TO_CURRENCY = {
  US: 'USD', EU: 'EUR', GB: 'GBP', JP: 'JPY',
  CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', CN: 'CNY',
};

const VALID_IMPACTS = new Set(['High', 'Medium']);

// ── Helpers ───────────────────────────────────────────────────
const fmt = d => d.toISOString().split('T')[0];

function getDateRange() {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - LOOKBACK_DAYS);
  return { from: fmt(from), to: fmt(to) };
}

function capitalizeFirst(str) {
  const s = String(str || '').toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatValue(val) {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Fetch FMP ─────────────────────────────────────────────────
async function fetchFMPRange(from, to) {
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar` +
              `?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;

  console.log(`[UPDATER] Fetching FMP recent events: ${from} → ${to}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Unexpected FMP response`);

  console.log(`[UPDATER] FMP returned ${data.length} events in range`);
  return data;
}

// ── Filtrar solo eventos con datos reales publicados ─────────
function filterPublished(fmpEvents) {
  return fmpEvents.filter(evt => {
    const hasActual  = evt.actual !== null && evt.actual !== undefined && evt.actual !== '';
    const impact     = capitalizeFirst(evt.impact || '');
    const currency   = COUNTRY_TO_CURRENCY[evt.country];
    return hasActual && VALID_IMPACTS.has(impact) && currency;
  });
}

// ── Actualizar solo el campo 'actual' en los eventos existentes ─
async function updateActualValues(supabase, fmpEvents) {
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const evt of fmpEvents) {
    const currency  = COUNTRY_TO_CURRENCY[evt.country];
    const impact    = capitalizeFirst(evt.impact || '');
    const actual    = formatValue(evt.actual);
    const eventName = String(evt.event || '').trim();

    // Construir timestamp como en el bot de pre-carga
    const rawDate   = evt.date || '';
    const eventTime = rawDate.includes('T') ? rawDate : rawDate.replace(' ', 'T') + '+00:00';

    if (!actual || actual === 'Pendiente') {
      skipped++;
      continue;
    }

    // Buscar el evento en DB por los 3 campos únicos
    const { data: existing, error: findErr } = await supabase
      .from('economic_calendar')
      .select('id, actual')
      .eq('event_time', eventTime)
      .eq('event_name', eventName)
      .eq('country', currency)
      .maybeSingle();

    if (findErr) {
      errors.push(`Find error for ${eventName}: ${findErr.message}`);
      continue;
    }

    // Si no existe en DB, significa que el pre-loader aún no lo importó
    // Lo insertamos directamente
    if (!existing) {
      const { error: insertErr } = await supabase
        .from('economic_calendar')
        .upsert({
          event_time:  eventTime,
          event_name:  eventName,
          country:     currency,
          impact,
          actual,
          forecast:    formatValue(evt.estimate) || '—',
          previous:    formatValue(evt.previous)  || '—',
          updated_at:  new Date().toISOString(),
        }, {
          onConflict: 'event_time,event_name,country',
          ignoreDuplicates: false,
        });

      if (insertErr) {
        errors.push(`Insert error for ${eventName}: ${insertErr.message}`);
      } else {
        updated++;
        console.log(`[UPDATER] ✚ Inserted new event with actual: ${eventName} (${currency}) = ${actual}`);
      }
      continue;
    }

    // Si ya existe y el actual ya está actualizado → skip
    if (existing.actual === actual) {
      skipped++;
      continue;
    }

    // Si el actual cambió (era 'Pendiente' y ahora tiene valor) → actualizar
    const { error: updateErr } = await supabase
      .from('economic_calendar')
      .update({
        actual,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateErr) {
      errors.push(`Update error for ${eventName}: ${updateErr.message}`);
    } else {
      updated++;
      console.log(`[UPDATER] ✔ Updated: ${eventName} (${currency}) → actual: ${actual}`);
    }
  }

  return { updated, skipped, errors };
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const runId = generateUUID();
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log(`\n[UPDATER] ===== AEON Calendar Updater started (${new Date().toISOString()}) =====`);

  // Log inicio
  await supabase.from('agent_run_log').insert({
    id: runId, agent_name: AGENT_NAME, run_type: 'scheduled',
    status: 'running', started_at: new Date().toISOString(),
  }).throwOnError().catch(() => {});

  try {
    const { from, to } = getDateRange();
    const allEvents     = await fetchFMPRange(from, to);
    const published     = filterPublished(allEvents);

    console.log(`[UPDATER] ${published.length} events have actual values (rest pending)`);

    const result = await updateActualValues(supabase, published);

    console.log(`\n[UPDATER] ===== DONE =====`);
    console.log(`[UPDATER] Updated: ${result.updated} | Already current: ${result.skipped} | Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.warn('[UPDATER] Errors:', result.errors);
    }

    await supabase.from('agent_run_log').update({
      finished_at: new Date().toISOString(),
      status: result.errors.length > 0 ? 'partial' : 'success',
      records_processed: published.length,
      records_upserted: result.updated,
      records_skipped: result.skipped,
      records_errored: result.errors.length,
    }).eq('id', runId).throwOnError().catch(() => {});

    process.exit(0);

  } catch (err) {
    console.error('[UPDATER] FATAL:', err.message);
    await supabase.from('agent_run_log').update({
      finished_at: new Date().toISOString(),
      status: 'error',
      error_message: err.message,
    }).eq('id', runId).throwOnError().catch(() => {});
    process.exit(1);
  }
}

main();
