/* ============================================================
   AEON · prices.js — Precios en vivo
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { TIMING, ASSETS } from './config/constants.js';

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

function formatChange(pct) {
  const sign  = pct >= 0 ? '+' : '';
  const arrow = pct >= 0 ? '▲' : '▼';
  return { text: `${arrow} ${sign}${pct.toFixed(2)}%`, cls: pct >= 0 ? 'up' : 'down' };
}

function flash(el, dir) {
  el.classList.remove('flash-up', 'flash-down');
  void el.offsetWidth;
  el.classList.add(`flash-${dir}`);
}

function updateTicker(key, price, pct) {
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

function updateMarketCard(key, price, pct) {
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

async function fetchCrypto() {
  const ids = Object.values(ASSETS.CRYPTO).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMING.CRYPTO_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function fetchOanda() {
  const { data, error } = await supabase.functions.invoke('oanda');
  if (error) throw error;
  return data;
}

async function refresh() {
  try {
    const [cryptoData, oandaData] = await Promise.allSettled([
      fetchCrypto(),
      fetchOanda()
    ]);

    // Procesar Crypto (CoinGecko)
    if (cryptoData.status === 'fulfilled') {
      const btc = cryptoData.value[ASSETS.CRYPTO.BTC];
      if (btc) {
        updateTicker('btc', btc.usd, btc.usd_24h_change);
        updateMarketCard('btc', btc.usd, btc.usd_24h_change);
      }
    }

    // Procesar Forex & Indices (OANDA)
    if (oandaData.status === 'fulfilled' && oandaData.value.prices) {
      const prices = oandaData.value.prices;
      
      const priceMap = {};
      for (const p of prices) {
        priceMap[p.instrument] = p;
      }

      // XAU_USD (Oro)
      const xau = priceMap['XAU_USD'];
      if (xau) {
        const close = parseFloat(xau.closeoutAsk);
        updateTicker('xau', close, 0);
        updateMarketCard('gold', close, 0);
      }

      // EUR_USD
      const eur = priceMap['EUR_USD'];
      if (eur) {
        const close = parseFloat(eur.closeoutAsk);
        updateTicker('eur', close, 0);
        updateMarketCard('eur', close, 0);
      }

      // SPX500_USD
      const spx = priceMap['SPX500_USD'];
      if (spx) updateTicker('sp', parseFloat(spx.closeoutAsk), 0);
      
      // NAS100_USD
      const nas = priceMap['NAS100_USD'];
      if (nas) updateTicker('nas', parseFloat(nas.closeoutAsk), 0);
      
      // US30_USD
      const dow = priceMap['US30_USD'];
      if (dow) updateTicker('dow', parseFloat(dow.closeoutAsk), 0);
    }

    setTimestamp(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));

  } catch (err) {
    console.warn('[AEON] Error precios:', err.message);
    setTimestamp('Desconectado');
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
  startInterval();

  // Pausar cuando la pestaña no es visible para ahorrar recursos
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopInterval();
    else startInterval();
  });
}
