/* ============================================================
   AEON · templates/ticker.js
   ============================================================ */

export const tickerBarItem = (t) => `
  <span class="ticker-item">
    <span class="ticker-label">${t.pair || t.label}</span>
    <span class="ticker-price" id="price-${t.id}">${t.price}</span>
    <span class="ticker-change ${t.positive !== false ? 'up' : 'down'}" id="change-${t.id}">${t.positive !== false ? '▲' : '▼'} ${t.change}</span>
  </span>
  <span class="ticker-sep" aria-hidden="true">·</span>
`;
