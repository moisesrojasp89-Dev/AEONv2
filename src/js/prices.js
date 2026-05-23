/* ============================================================
   AUREUM · prices.js — Precios en vivo
   ============================================================ */

const REFRESH_MS = 30_000;
const GECKO_IDS  = { btc: 'bitcoin', gold: 'pax-gold' };
const prev       = { gold: null, btc: null };

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
  const priceEl  = document.getElementById(`price-${key}`);
  const changeEl = document.getElementById(`change-${key}`);
  if (!priceEl || !changeEl) return;

  const dir = prev[key] !== null
    ? (price > prev[key] ? 'up' : price < prev[key] ? 'down' : null)
    : null;

  prev[key] = price;
  if (dir) flash(priceEl, dir);

  priceEl.textContent = formatPrice(key, price);
  const { text, cls } = formatChange(pct);
  changeEl.textContent = text;
  changeEl.className   = `ticker-change ${cls}`;
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

async function fetchPrices() {
  const ids = Object.values(GECKO_IDS).join(',');
  const url  = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function refresh() {
  try {
    const data = await fetchPrices();

    const btc  = data[GECKO_IDS.btc];
    const gold = data[GECKO_IDS.gold];

    if (btc)  { updateTicker('btc',  btc.usd,  btc.usd_24h_change);  updateMarketCard('btc',  btc.usd,  btc.usd_24h_change); }
    if (gold) { updateTicker('gold', gold.usd, gold.usd_24h_change); updateMarketCard('gold', gold.usd, gold.usd_24h_change); }

    setTimestamp(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));

  } catch (err) {
    console.warn('[Aureum] Error precios:', err.message);
    setTimestamp('Sin conexión');
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
