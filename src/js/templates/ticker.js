/* ============================================================
   AEON · templates/ticker.js
   ============================================================ */

export const tickerBarItem = (t) => `
  <span class="ticker-item">
    <span class="ticker-label">${t.label}</span>
    <span class="ticker-price" id="price-${t.id}">${t.price}</span>
    <span class="ticker-change ${t.up ? 'up' : 'down'}" id="change-${t.id}">${t.up ? '▲' : '▼'} ${t.change}</span>
  </span>
  <span class="ticker-sep" aria-hidden="true">·</span>
`;
