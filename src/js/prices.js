/* ============================================================
   AEON · prices.js — Precios en vivo
   ============================================================ */

const REFRESH_MS = 60_000; // 1 minuto (para ahorrar cuota de TwelveData)
const GECKO_IDS  = { btc: 'bitcoin' }; 
const prev       = { xau: null, eur: null, btc: null, sp: null, nas: null, dow: null };

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
  const ids = Object.values(GECKO_IDS).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function fetchForex() {
  const apiKey = import.meta.env.VITE_TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error("Missing TwelveData API Key");
  const url = `https://api.twelvedata.com/quote?symbol=XAU/USD,EUR/USD,SPX,NDX,DJI&apikey=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TwelveData ${res.status}`);
  return res.json();
}

async function refresh() {
  try {
    const [cryptoData, forexData] = await Promise.allSettled([
      fetchCrypto(),
      fetchForex()
    ]);

    // Procesar Crypto (CoinGecko)
    if (cryptoData.status === 'fulfilled') {
      const btc = cryptoData.value[GECKO_IDS.btc];
      if (btc) {
        updateTicker('btc', btc.usd, btc.usd_24h_change);
        updateMarketCard('btc', btc.usd, btc.usd_24h_change);
      }
    }

    // Procesar Forex & Indices (TwelveData)
    if (forexData.status === 'fulfilled' && !forexData.value.code) {
      const data = forexData.value;
      
      const xau = data['XAU/USD'];
      if (xau) {
        const price = parseFloat(xau.close);
        const change = parseFloat(xau.percent_change);
        updateTicker('xau', price, change);
        updateMarketCard('gold', price, change); // Usamos 'gold' para la tarjeta
      }

      const eur = data['EUR/USD'];
      if (eur) {
        const price = parseFloat(eur.close);
        const change = parseFloat(eur.percent_change);
        updateTicker('eur', price, change);
        updateMarketCard('eur', price, change);
      }

      // Opcional: Actualizar índices si están en el DOM (sp, nas, dow)
      const sp = data['SPX'];
      if (sp) updateTicker('sp', parseFloat(sp.close), parseFloat(sp.percent_change));
      
      const nas = data['NDX'];
      if (nas) updateTicker('nas', parseFloat(nas.close), parseFloat(nas.percent_change));
      
      const dow = data['DJI'];
      if (dow) updateTicker('dow', parseFloat(dow.close), parseFloat(dow.percent_change));
    }

    setTimestamp(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));

  } catch (err) {
    console.warn('[AEON] Error precios:', err.message);
    setTimestamp('Desconectado');
  }
}

function startInterval() {
  refresh();
  intervalId = setInterval(refresh, REFRESH_MS);
}

function stopInterval() {
  clearInterval(intervalId);
  intervalId = null;
}

export function initPrices() {
  startInterval();

  // Pausar cuando la pestaña no es visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopInterval();
    else startInterval();
  });
}
