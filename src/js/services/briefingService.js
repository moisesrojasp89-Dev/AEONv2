/* ============================================================
   AEON · services/briefingService.js — Daily Macro Briefing Service
   Fase 5: AI Platform & Contextual Intelligence
   Cache 0ms en sessionStorage + Supabase Realtime
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

const CACHE_KEY = 'aeon_latest_briefing_cache';

/**
 * Fallback institucional de respaldo si la base de datos está offline o vacía.
 */
export const DEFAULT_BRIEFING = {
  id: 'asia-briefing-live',
  session_id: 'asian_wrap',
  date: new Date().toISOString().split('T')[0],
  title: 'Sesión Asia-Pacífico: Flujo de Tokio & Sídney y Reacción a Datos Macro',
  image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
  macro_sentiment: {
    score: 58,
    label: 'RISK_ON',
    risk_appetite: 'BULLISH',
  },
  asset_bias: {
    XAUUSD: 'BULLISH',
    EURUSD: 'BEARISH',
    GBPUSD: 'BEARISH',
    DXY: 'BULLISH',
    SPX500: 'NEUTRAL',
  },
  catalysts: [
    { time: '19:30', currency: 'JPY', title: 'Tokyo Core CPI y/y', impact: 'HIGH', status: 'live', actual: '2.2%', forecast: '2.1%' },
    { time: '01:30', currency: 'AUD', title: 'Private Capital Expenditure q/q', impact: 'MEDIUM', status: 'upcoming', actual: null, forecast: '0.8%' },
    { time: '08:30', currency: 'USD', title: 'Unemployment Claims', impact: 'HIGH', status: 'upcoming', actual: null, forecast: '230K' },
  ],
  executive_thesis: 'Apertura de la sesión asiática con tono constructivo tras el IPC de Tokio (2.2%). El Oro Spot ($4,598.06) sostiene dPOC mientras el Nikkei 225 y los cruces del Yen absorben la liquidez inicial.',
  full_content_md: '### 🌐 Contexto de la Sesión Asia-Pacífico\nApertura de mercados en Tokio y Sídney.',
  author: 'AEON Macro Intelligence AI',
};

/**
 * Obtiene el último Daily Macro Briefing disponible.
 * Implementa estrategia Cache-First (0ms white-screen) con actualización en background.
 * @returns {Promise<Object>}
 */
export async function fetchLatestBriefing() {
  // 1. Intentar cargar desde caché local para renderizado instantáneo en 0ms
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Disparar sincronización asíncrona con Supabase en background
      syncBriefingBackground();
      return parsed;
    }
  } catch {
    // Si falla sessionStorage, continuar
  }

  // 2. Consulta a Supabase si no hay caché
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.DAILY_BRIEFINGS)
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
    return DEFAULT_BRIEFING;
  } catch (err) {
    console.warn('[AEON Briefing] Supabase offline o sin registros, usando fallback:', err.message);
    return DEFAULT_BRIEFING;
  }
}

/**
 * Sincronización silenciosa en background.
 */
async function syncBriefingBackground() {
  try {
    const { data } = await supabase
      .from(DB_TABLES.DAILY_BRIEFINGS)
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignorar errores silenciosos de background
  }
}

/**
 * Suscripción en tiempo real a nuevos briefings publicados.
 * @param {Function} onNewBriefing - Callback con el nuevo briefing
 * @returns {Object} Channel subscription
 */
export function subscribeToBriefings(onNewBriefing) {
  return supabase
    .channel('public:daily_briefings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: DB_TABLES.DAILY_BRIEFINGS },
      (payload) => {
        if (payload.new) {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload.new));
          } catch {}
          if (typeof onNewBriefing === 'function') {
            onNewBriefing(payload.new);
          }
        }
      }
    )
    .subscribe();
}

/**
 * Limpia y desuscribe el canal de Supabase Realtime para evitar fugas de memoria.
 * @param {Object} channel
 */
export function unsubscribeFromBriefings(channel) {
  if (channel && typeof channel.unsubscribe === 'function') {
    supabase.removeChannel(channel);
  }
}

