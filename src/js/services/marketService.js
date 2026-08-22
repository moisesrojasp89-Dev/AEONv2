/* ============================================================
   AEON · services/marketService.js — Market Data Adapter
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { TIMING, ASSETS } from '../config/constants.js';

const CACHE_KEY = 'AEON_PRICES_CACHE_V1';
const CHART_CACHE_KEY = 'AEON_CHART_CACHE_V1';

/**
 * Fetches Crypto live prices and 24h variation from CoinGecko.
 * @returns {Promise<Object>}
 */
export async function fetchCryptoPrices() {
  const ids = Object.values(ASSETS.CRYPTO).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMING.CRYPTO_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

/**
 * Fetches Forex and Index live prices and session daily changes from OANDA Edge Function.
 * @returns {Promise<Object>}
 */
export async function fetchOandaPrices() {
  const { data, error } = await supabase.functions.invoke('oanda');
  if (error) throw error;
  return data;
}

/**
 * Fetches historical candle time-series for chart rendering.
 * @param {string} instrument
 * @param {number} count
 * @returns {Promise<Array>}
 */
export async function fetchHistoricalChartData(instrument = 'XAU_USD', count = 30) {
  try {
    const { data, error } = await supabase.functions.invoke('oanda', {
      body: { action: 'chart', instrument, count },
    });

    if (error) throw error;
    if (data && Array.isArray(data.series) && data.series.length > 0) {
      // Guardar en caché para carga instantánea
      try {
        sessionStorage.setItem(CHART_CACHE_KEY, JSON.stringify(data.series));
      } catch (_) {}
      return data.series;
    }
  } catch (err) {
    console.warn('[AEON] Error obteniendo serie histórica del gráfico:', err.message);
  }

  // Fallback a caché previa si existe
  try {
    const cached = sessionStorage.getItem(CHART_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  return null;
}

/**
 * Retrieves persisted prices cache from storage for instantaneous rendering.
 * @returns {Object|null}
 */
export function getStoredPricesCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Stores latest market prices into local cache.
 * @param {Object} cachePayload
 */
export function setStoredPricesCache(cachePayload) {
  try {
    const serialized = JSON.stringify(cachePayload);
    sessionStorage.setItem(CACHE_KEY, serialized);
    localStorage.setItem(CACHE_KEY, serialized);
  } catch (e) {
    // Ignore storage quota errors
  }
}
