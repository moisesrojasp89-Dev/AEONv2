/* ============================================================
   AEON · prices.js — Precios en vivo & Variación de Sesión
   ============================================================ */

import { TIMING, ASSETS } from './config/constants.js';
import {
  fetchCryptoPrices,
  fetchOandaPrices,
  getStoredPricesCache,
  setStoredPricesCache,
} from './services/marketService.js';

const prev = { xau: null, eur: null, btc: null, sp: null, nas: null, dow: null };
let intervalId = null;

function formatPrice(key, price) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: key === 'btc' ? 0 : 2,
    maximumFractionDigits: key === 'btc' ? 0 : 2,
  }).format(price);
}

function formatChange(pct = 0) {
  const sign  = pct >= 0 ? '+' : '';
  const arrow = pct >= 0 ? '▲' : '▼';
  return { text: `${arrow} ${sign}${pct.toFixed(2)}%`, cls: pct >= 0 ? 'up' : 'down' };
}

function flash(el, dir) {
  el.classList.remove('flash-up', 'flash-down');
  void el.offsetWidth;
  el.classList.add(`flash-${dir}`);
}

function updateTicker(key, price, pct = 0) {
  const priceEls = document.querySelectorAll(`[id="price-${key}"]`);
  const changeEls = document.querySelectorAll(`[id="change-${key}"]`);
  if (!priceEls.length || !changeEls.length) return;

  const dir = prev[key] !== null
    ? (price > prev[key] ? 'up' : price < prev[key] ? 'down' : null)
    : null;

  prev[key] = price;
  
  const formattedPrice = formatPrice(key, price);
  const { text, cls } = formatChange(pct);

  priceEls.forEach(el => {
    if (dir) flash(el, dir);
    el.textContent = formattedPrice;
  });

  changeEls.forEach(el => {
    el.textContent = text;
    el.className = `ticker-change ${cls}`;
  });
}

function updateMarketCard(key, price, pct = 0) {
  const priceEl  = document.getElementById(`mcard-price-${key}`);
  const changeEl = document.getElementById(`mcard-change-${key}`);
  if (!priceEl || !changeEl) return;

  priceEl.textContent = formatPrice(key, price);
  const { text, cls } = formatChange(pct);
  changeEl.textContent = text;
  changeEl.className   = `mcard-change ${cls}`;
}

function setTimestamp(text) {
  const el = document.getElementById('update-time');
  if (el) el.textContent = text;
}

function restoreFromCache() {
  const cached = getStoredPricesCache();
  if (!cached) return;

  if (cached.btc) {
    updateTicker('btc', cached.btc.price, cached.btc.change);
    updateMarketCard('btc', cached.btc.price, cached.btc.change);
  }
  if (cached.xau) {
    updateTicker('xau', cached.xau.price, cached.xau.change);
    updateMarketCard('gold', cached.xau.price, cached.xau.change);
  }
  if (cached.eur) {
    updateTicker('eur', cached.eur.price, cached.eur.change);
    updateMarketCard('eur', cached.eur.price, cached.eur.change);
  }
  if (cached.sp) updateTicker('sp', cached.sp.price, cached.sp.change);
  if (cached.nas) updateTicker('nas', cached.nas.price, cached.nas.change);
  if (cached.dow) updateTicker('dow', cached.dow.price, cached.dow.change);
  if (cached.time) setTimestamp(cached.time);
}

async function refresh() {
  const cachePayload = getStoredPricesCache() || {};

  try {
    const [cryptoData, oandaData] = await Promise.allSettled([
      fetchCryptoPrices(),
      fetchOandaPrices()
    ]);

    // Procesar Crypto (CoinGecko)
    if (cryptoData.status === 'fulfilled' && cryptoData.value) {
      const btc = cryptoData.value[ASSETS.CRYPTO.BTC];
      if (btc) {
        const btcPrice = btc.usd;
        const btcChange = btc.usd_24h_change || 0;
        updateTicker('btc', btcPrice, btcChange);
        updateMarketCard('btc', btcPrice, btcChange);
        cachePayload.btc = { price: btcPrice, change: btcChange };
      }
    }

    // Procesar Forex & Indices (OANDA)
    if (oandaData.status === 'fulfilled' && oandaData.value && oandaData.value.prices) {
      const prices = oandaData.value.prices;
      const changes = oandaData.value.changes || {};
      
      const priceMap = {};
      for (const p of prices) {
        priceMap[p.instrument] = p;
      }

      // XAU_USD (Oro)
      const xau = priceMap['XAU_USD'];
      if (xau) {
        const close = parseFloat(xau.closeoutAsk);
        const change = changes['XAU_USD'] ?? 0;
        updateTicker('xau', close, change);
        updateMarketCard('gold', close, change);
        cachePayload.xau = { price: close, change };
      }

      // EUR_USD
      const eur = priceMap['EUR_USD'];
      if (eur) {
        const close = parseFloat(eur.closeoutAsk);
        const change = changes['EUR_USD'] ?? 0;
        updateTicker('eur', close, change);
        updateMarketCard('eur', close, change);
        cachePayload.eur = { price: close, change };
      }

      // SPX500_USD
      const spx = priceMap['SPX500_USD'];
      if (spx) {
        const close = parseFloat(spx.closeoutAsk);
        const change = changes['SPX500_USD'] ?? 0;
        updateTicker('sp', close, change);
        cachePayload.sp = { price: close, change };
      }
      
      // NAS100_USD
      const nas = priceMap['NAS100_USD'];
      if (nas) {
        const close = parseFloat(nas.closeoutAsk);
        const change = changes['NAS100_USD'] ?? 0;
        updateTicker('nas', close, change);
        cachePayload.nas = { price: close, change };
      }
      
      // US30_USD
      const dow = priceMap['US30_USD'];
      if (dow) {
        const close = parseFloat(dow.closeoutAsk);
        const change = changes['US30_USD'] ?? 0;
        updateTicker('dow', close, change);
        cachePayload.dow = { price: close, change };
      }
    }

    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    setTimestamp(timeStr);
    cachePayload.time = timeStr;
    setStoredPricesCache(cachePayload);

  } catch (err) {
    console.warn('[AEON] Error actualizando precios:', err.message);
  }
}

function startInterval() {
  refresh();
  intervalId = setInterval(refresh, TIMING.PRICES_REFRESH_MS);
}

function stopInterval() {
  clearInterval(intervalId);
  intervalId = null;
}

export function initPrices() {
  // 1. Restaurar de inmediato desde caché para 0ms de retraso visual
  restoreFromCache();

  // 2. Iniciar polling en vivo
  startInterval();

  // 3. Pausar cuando la pestaña no es visible para ahorrar recursos
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopInterval();
    else startInterval();
  });
}
