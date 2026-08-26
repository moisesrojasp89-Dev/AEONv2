import { escapeHTML } from '../utils/sanitize.js';

export const tickerBarItem = (t) => `
  <span class="ticker-item">
    <span class="ticker-label">${escapeHTML(t.pair || t.label)}</span>
    <span class="ticker-price" id="price-${escapeHTML(t.id)}">${escapeHTML(t.price)}</span>
    <span class="ticker-change ${t.positive !== false ? 'up' : 'down'}" id="change-${escapeHTML(t.id)}">${t.positive !== false ? '▲' : '▼'} ${escapeHTML(t.change)}</span>
  </span>
  <span class="ticker-sep" aria-hidden="true">·</span>
`;
