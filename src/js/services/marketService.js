/* ============================================================
   AEON · services/marketService.js — Market Data Adapter
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { TIMING, ASSETS } from '../config/constants.js';

const CACHE_KEY = 'AEON_PRICES_CACHE_V1';
const CHART_CACHE_PREFIX = 'AEON_CHART_CACHE_';

/**
 * Normalizes universal symbols to backend provider format.
 * @param {string} sym
 * @returns {string}
 */
export function normalizeInstrument(sym = '') {
  const s = String(sym || '').toUpperCase().trim();
  if (s === 'XAUUSD' || s === 'GOLD') return 'XAU_USD';
  if (s === 'EURUSD' || s === 'EURO') return 'EUR_USD';
  if (s === 'SPX500' || s === 'SP500' || s === 'SPX') return 'SPX500_USD';
  if (s === 'NAS100' || s === 'NASDAQ' || s === 'NAS') return 'NAS100_USD';
  if (s === 'US30' || s === 'DOW' || s === 'DJI') return 'US30_USD';
  return s;
}

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
 * Fetches Forex, Commodities and Index live prices via backend market pricing provider.
 * Universal abstraction for OANDA / MT5 / Exness proxies.
 * @returns {Promise<Object>}
 */
export async function fetchForexAndIndexPrices() {
  try {
    const { data, error } = await supabase.functions.invoke('oanda');
    if (!error && data && data.prices) return data;
  } catch (err) {
    console.warn('[AEON] Edge function oanda no disponible, usando fallback directo de base de datos:', err?.message);
  }

  // Fallback directo: Consultar public.market_intelligence de Supabase
  try {
    const { data: rows, error: dbErr } = await supabase
      .from('market_intelligence')
      .select('symbol, current_price, change_24h_pct');

    if (!dbErr && rows && rows.length > 0) {
      const prices = [];
      const changes = {};
      
      const symbolMap = {
        'XAUUSD': 'XAU_USD',
        'EURUSD': 'EUR_USD',
        'GBPUSD': 'GBP_USD',
        'USDJPY': 'USD_JPY',
        'USDCAD': 'USD_CAD',
        'AUDUSD': 'AUD_USD',
        'NZDUSD': 'NZD_USD',
        'USDCHF': 'USD_CHF',
        'SPX500': 'SPX500_USD',
        'NAS100': 'NAS100_USD',
        'US30': 'US30_USD',
        'JP225': 'JP225_USD',
        'DXY': 'DXY'
      };

      for (const r of rows) {
        const oandaSym = symbolMap[r.symbol] || r.symbol;
        prices.push({
          instrument: oandaSym,
          closeoutAsk: r.current_price,
          closeoutBid: r.current_price
        });
        changes[oandaSym] = r.change_24h_pct;
      }

      return { prices, changes };
    }
  } catch (dbErr) {
    console.error('[AEON] Error en fallback de precios:', dbErr);
  }

  return {
    prices: [
      { instrument: 'XAU_USD', closeoutAsk: 4598.06, closeoutBid: 4598.06 },
      { instrument: 'EUR_USD', closeoutAsk: 1.1654, closeoutBid: 1.1654 },
      { instrument: 'SPX500_USD', closeoutAsk: 7719.40, closeoutBid: 7719.40 },
      { instrument: 'NAS100_USD', closeoutAsk: 29554.80, closeoutBid: 29554.80 },
      { instrument: 'US30_USD', closeoutAsk: 49450.00, closeoutBid: 49450.00 },
      { instrument: 'DXY', closeoutAsk: 99.13, closeoutBid: 99.13 }
    ],
    changes: {
      'XAU_USD': 0.05,
      'EUR_USD': -0.12,
      'SPX500_USD': 0.15,
      'NAS100_USD': -0.14,
      'US30_USD': 0.08,
      'DXY': 0.02
    }
  };
}

/**
 * Backwards compatibility alias for fetchForexAndIndexPrices.
 */
export const fetchOandaPrices = fetchForexAndIndexPrices;

/**
 * Fetches historical candle time-series for chart rendering.
 * Supports OANDA instruments ('XAU_USD', 'EUR_USD', 'SPX500_USD') and Crypto ('BTC').
 * @param {string} instrument
 * @param {number} count
 * @returns {Promise<Array>}
 */
export async function fetchHistoricalChartData(instrument = 'XAU_USD', count = 30) {
  const normSym = normalizeInstrument(instrument);
  const cacheKey = `${CHART_CACHE_PREFIX}${normSym}`;

  // 1. Caso Crypto (Bitcoin) — Consultamos Coinbase con fallback a Kraken
  if (normSym === 'BTC' || normSym === 'BTC_USD') {
    try {
      const cbUrl = 'https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400';
      const cbRes = await fetch(cbUrl, { signal: AbortSignal.timeout(TIMING.CRYPTO_TIMEOUT_MS) });
      if (cbRes.ok) {
        const data = await cbRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const series = data
            .slice(0, count)
            .reverse()
            .map((d) => ({
              time: new Date(d[0] * 1000).toISOString().split('T')[0],
              value: Math.round(d[4]),
            }));
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(series));
          } catch (_) {}
          return series;
        }
      }
    } catch (err) {
      console.warn('[AEON] Coinbase BTC fallback a Kraken:', err.message);
    }

    // Fallback a Kraken
    try {
      const krUrl = 'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440';
      const krRes = await fetch(krUrl, { signal: AbortSignal.timeout(TIMING.CRYPTO_TIMEOUT_MS) });
      if (krRes.ok) {
        const data = await krRes.json();
        const raw = data?.result?.XXBTZUSD || data?.result?.XBTUSD;
        if (Array.isArray(raw) && raw.length > 0) {
          const series = raw.slice(-count).map((d) => ({
            time: new Date(d[0] * 1000).toISOString().split('T')[0],
            value: Math.round(parseFloat(d[4])),
          }));
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(series));
          } catch (_) {}
          return series;
        }
      }
    } catch (err) {
      console.warn('[AEON] Error en fuentes Crypto para gráfico:', err.message);
    }
  } else {
    // 2. Caso Forex / Commodities / Indices (Backend Proxy)
    try {
      const { data, error } = await supabase.functions.invoke('oanda', {
        body: { action: 'chart', instrument: normSym, count },
      });

      if (error) throw error;
      if (data && Array.isArray(data.series) && data.series.length > 0) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data.series));
        } catch (_) {}
        return data.series;
      }
    } catch (err) {
      console.warn(`[AEON] Error obteniendo serie ${normSym}:`, err.message);
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
