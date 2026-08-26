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
  id: 'fallback-briefing',
  session_id: 'london_pre',
  date: new Date().toISOString().split('T')[0],
  title: 'Sesión Europea: Enfoque en Liquidez y Catalizadores Macroeconómicos',
  image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop',
  macro_sentiment: {
    score: 65,
    label: 'RISK_ON',
    risk_appetite: 'BULLISH',
  },
  asset_bias: {
    XAUUSD: 'BULLISH',
    EURUSD: 'NEUTRAL',
    GBPUSD: 'BULLISH',
    DXY: 'BEARISH',
    SPX500: 'BULLISH',
  },
  catalysts: [
    { time: '08:30', currency: 'USD', title: 'Core PCE Price Index m/m', impact: 'HIGH' },
    { time: '13:30', currency: 'USD', title: 'Prelim GDP q/q', impact: 'HIGH' },
    { time: '15:00', currency: 'USD', title: 'ISM Servicios PMI', impact: 'MEDIUM' },
  ],
  executive_thesis: 'Consolidación en el Dólar (DXY) favorece soporte técnico en Oro (XAU/USD) e Índices. Se proyecta volatilidad institucional durante la apertura con sesgo favorable a continuación de tendencia.',
  full_content_md: 'Contexto institucional en vivo generado por AEON AI Platform.',
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
