/* ============================================================
   AEON · services/marketService.js — Market Data Adapter
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { TIMING, ASSETS } from '../config/constants.js';

const CACHE_KEY = 'AEON_PRICES_CACHE_V1';
const CHART_CACHE_PREFIX = 'AEON_CHART_CACHE_';

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
 * Supports OANDA instruments ('XAU_USD', 'EUR_USD', 'SPX500_USD', etc.) and Crypto ('BTC').
 * @param {string} instrument
 * @param {number} count
 * @returns {Promise<Array>}
 */
export async function fetchHistoricalChartData(instrument = 'XAU_USD', count = 30) {
  const cacheKey = `${CHART_CACHE_PREFIX}${instrument}`;

  // 1. Caso Crypto (Bitcoin)
  if (instrument === 'BTC' || instrument === 'BTC_USD') {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${count}&interval=daily`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMING.CRYPTO_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.prices)) {
          const series = data.prices.map(([timestamp, price]) => ({
            time: new Date(timestamp).toISOString().split('T')[0],
            value: Math.round(price),
          }));
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(series));
          } catch (_) {}
          return series;
        }
      }
    } catch (err) {
      console.warn('[AEON] Error obteniendo serie BTC:', err.message);
    }
  } else {
    // 2. Caso Forex / Commodities / Indices (OANDA)
    try {
      const { data, error } = await supabase.functions.invoke('oanda', {
        body: { action: 'chart', instrument, count },
      });

      if (error) throw error;
      if (data && Array.isArray(data.series) && data.series.length > 0) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data.series));
        } catch (_) {}
        return data.series;
      }
    } catch (err) {
      console.warn(`[AEON] Error obteniendo serie ${instrument}:`, err.message);
    }
  }

  // Fallback a caché persistida si existe
  try {
    const cached = sessionStorage.getItem(cacheKey);
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
