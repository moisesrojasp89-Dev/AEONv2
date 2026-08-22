/* ============================================================
   AEON · templates/market.js
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

export const marketCard = (m) => `
  <article class="market-card" aria-label="${escapeHTML(m.name)}">
    <div class="market-card-top">
      <div class="market-asset">
        <span class="asset-icon i-${escapeHTML(m.icon || '')}" aria-hidden="true">${m.icon === 'gold' ? 'A' : m.icon === 'euro' ? '€' : m.icon === 'bitcoin' ? '₿' : ''}</span>
        <div>
          <h3>${escapeHTML(m.name)}</h3>
          <p class="asset-pair">${escapeHTML(m.pair)}</p>
        </div>
      </div>
    </div>
    <div class="mcard-price-row">
      <span class="mcard-price" id="mcard-price-${escapeHTML(m.id)}">—</span>
      <span class="mcard-change" id="mcard-change-${escapeHTML(m.id)}">—</span>
    </div>
    <p class="market-desc">${escapeHTML(m.desc)}</p>
    <div class="market-levels">
      <div class="level">
        <span class="level-label">Soporte</span>
        <span class="level-val">${escapeHTML(m.support)}</span>
      </div>
      <div class="level">
        <span class="level-label">Resistencia</span>
        <span class="level-val">${escapeHTML(m.resistance)}</span>
      </div>
    </div>
  </article>
`;
