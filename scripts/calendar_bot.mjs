/**
 * AEON · scripts/calendar_bot.mjs
 * ============================================================
 * Bot automático del Calendario Económico.
 *
 * Fuente de datos: Financial Modeling Prep (FMP)
 *   - Plan gratuito: 250 llamadas/día (más que suficiente)
 *   - Endpoint: GET /api/v3/economic_calendar
 *   - API Key: https://financialmodelingprep.com/developer/docs/
 *
 * ¿Qué hace?
 *   1. Calcula el rango de fechas a importar (próximos 60 días)
 *   2. Llama a la API de FMP
 *   3. Filtra solo eventos de impacto High y Medium
 *   4. Mapea el formato FMP → schema de AEON
 *   5. Hace UPSERT en Supabase (nunca duplica)
 *   6. Guarda el log de ejecución en agent_run_log
 *
 * EJECUCIÓN MANUAL:
 *   node scripts/calendar_bot.mjs
 *
 * EJECUCIÓN AUTOMATIZADA:
 *   GitHub Actions → .github/workflows/calendar-bot.yml
 *   Programa: 1ro y 15 de cada mes a las 06:00 UTC
 *
 * VARIABLES DE ENTORNO (en .env o GitHub Secrets):
 *   FMP_API_KEY                  ← Tu clave de FMP
 *   VITE_SUPABASE_URL            ← Ya la tienes
 *   SUPABASE_SERVICE_ROLE_KEY    ← Dashboard → Settings → API → service_role
 * ============================================================ */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────
const FMP_API_KEY     = process.env.FMP_API_KEY;
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AGENT_NAME      = 'calendar-bot';
const IMPORT_DAYS     = 60;   // Importar los próximos 60 días de eventos

// ── Mapeo de códigos de país FMP → divisa AEON ────────────────
// FMP usa códigos ISO 3166-1 alpha-2 (US, GB, EU, etc.)
// AEON usa códigos de divisa (USD, GBP, EUR, etc.)
const COUNTRY_TO_CURRENCY = {
  US:  'USD',
  EU:  'EUR',
  GB:  'GBP',
  JP:  'JPY',
  CA:  'CAD',
  AU:  'AUD',
  NZ:  'NZD',
  CH:  'CHF',
  CN:  'CNY',
  // Agrega más si FMP devuelve otros países
};

// ── Impactos válidos (solo Medium y High para AEON) ──────────
const VALID_IMPACTS = new Set(['High', 'Medium']);

// ── Supabase client ──────────────────────────────────────────
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('[BOT] Missing SUPABASE env vars. Check .env or GitHub Secrets.');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ── Rango de fechas ───────────────────────────────────────────
function getDateRange(days = IMPORT_DAYS) {
  const from = new Date();
  const to   = new Date();
  to.setDate(to.getDate() + days);

  const fmt = d => d.toISOString().split('T')[0]; // YYYY-MM-DD
  return { from: fmt(from), to: fmt(to) };
}

// ── Llamada a FMP ─────────────────────────────────────────────
async function fetchFromFMP(from, to) {
  if (!FMP_API_KEY) {
    throw new Error('[BOT] Missing FMP_API_KEY. Get one free at financialmodelingprep.com');
  }

  const url = `https://financialmodelingprep.com/api/v3/economic_calendar` +
              `?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;

  console.log(`[BOT] Fetching FMP: ${from} → ${to}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[BOT] FMP API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error(`[BOT] Unexpected FMP response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  console.log(`[BOT] FMP returned ${data.length} total events`);
  return data;
}

// ── Transformación FMP → schema AEON ─────────────────────────
function transformEvents(fmpEvents) {
  const filtered = [];

  for (const evt of fmpEvents) {
    // Filtrar por impacto (solo High y Medium)
    const impact = capitalizeFirst(evt.impact || '');
    if (!VALID_IMPACTS.has(impact)) continue;

    // Filtrar por países soportados
    const country = COUNTRY_TO_CURRENCY[evt.country];
    if (!country) continue;

    // Construir timestamp UTC
    // FMP devuelve fechas como "2026-09-05 12:30:00" en UTC
    const rawDate = evt.date || '';
    if (!rawDate) continue;
    const event_time = rawDate.includes('T')
      ? rawDate
      : rawDate.replace(' ', 'T') + '+00:00';

    filtered.push({
      event_time,
      event_name: String(evt.event || '').trim(),
      country,
      impact,
      actual:   formatValue(evt.actual),
      forecast: formatValue(evt.estimate),   // FMP llama "estimate" al consenso
      previous: formatValue(evt.previous),
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`[BOT] ${filtered.length} events after filtering (High + Medium, known countries)`);
  return filtered;
}

// ── UPSERT en Supabase ────────────────────────────────────────
async function upsertEvents(supabase, events) {
  if (events.length === 0) {
    console.log('[BOT] No events to upsert.');
    return { upserted: 0 };
  }

  const { data, error } = await supabase
    .from('economic_calendar')
    .upsert(events, {
      onConflict: 'event_time,event_name,country',  // coincide con el UNIQUE constraint
      ignoreDuplicates: false,  // actualiza si el dato cambió (ej. actual de Pendiente → real)
    })
    .select('id');

  if (error) throw error;

  const count = data?.length ?? 0;
  console.log(`[BOT] ✅ Upserted ${count} events into economic_calendar`);
  return { upserted: count };
}

// ── Log de ejecución ──────────────────────────────────────────
async function logRun(supabase, runId, status, stats, error_message = null) {
  const row = {
    id:                 runId,
    agent_name:         AGENT_NAME,
    run_type:           'scheduled',
    finished_at:        new Date().toISOString(),
    status,
    records_processed:  stats.processed  ?? 0,
    records_upserted:   stats.upserted   ?? 0,
    records_skipped:    stats.skipped    ?? 0,
    records_errored:    stats.errored    ?? 0,
    error_message,
    meta: {
      import_days: IMPORT_DAYS,
      date_from:   stats.from,
      date_to:     stats.to,
    },
  };

  // Si agent_run_log aún no existe, solo lo logueamos en consola
  try {
    await supabase.from('agent_run_log').upsert(row, { onConflict: 'id' });
  } catch (e) {
    console.warn('[BOT] agent_run_log not found (table not created yet) — skipping log insert');
  }
}

// ── Helpers ───────────────────────────────────────────────────
function capitalizeFirst(str) {
  const s = String(str).toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatValue(val) {
  if (val === null || val === undefined || val === '') return 'Pendiente';
  return String(val).trim();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const runId    = generateUUID();
  const startedAt = Date.now();
  const supabase = getSupabase();

  // Iniciar log de ejecución
  await supabase.from('agent_run_log').insert({
    id:         runId,
    agent_name: AGENT_NAME,
    run_type:   'scheduled',
    status:     'running',
    started_at: new Date().toISOString(),
  }).throwOnError().catch(() => {}); // Silencia si la tabla no existe aún

  console.log(`\n[BOT] ===== AEON Calendar Bot started (run: ${runId}) =====`);

  try {
    const { from, to } = getDateRange(IMPORT_DAYS);
    const raw     = await fetchFromFMP(from, to);
    const events  = transformEvents(raw);
    const result  = await upsertEvents(supabase, events);

    const stats = {
      processed: raw.length,
      upserted:  result.upserted,
      skipped:   raw.length - events.length,
      errored:   0,
      from,
      to,
    };

    await logRun(supabase, runId, 'success', stats);

    console.log(`[BOT] ===== DONE in ${Date.now() - startedAt}ms =====`);
    console.log(`[BOT] Processed: ${stats.processed} | Upserted: ${stats.upserted} | Skipped (low-impact/unknown country): ${stats.skipped}`);

    process.exit(0);

  } catch (err) {
    console.error('[BOT] FATAL ERROR:', err.message);

    await logRun(supabase, runId, 'error', {
      processed: 0, upserted: 0, skipped: 0, errored: 1,
    }, err.message).catch(() => {});

    process.exit(1);
  }
}

main();
