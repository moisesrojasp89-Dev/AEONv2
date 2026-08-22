/* ============================================================
   AEON · services/marketService.js — Market Data Adapter
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { TIMING, ASSETS } from '../config/constants.js';

const CACHE_KEY = 'AEON_PRICES_CACHE_V1';

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
