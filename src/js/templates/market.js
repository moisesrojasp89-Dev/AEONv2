/* ============================================================
   AEON · templates/market.js
   ============================================================ */

const BIAS_CLASS = {
  'Alcista': 'badge-bull',
  'Bajista': 'badge-bear',
  'Lateral': 'badge-lateral',
};

export const marketCard = (m) => `
  <article class="market-card" aria-label="${m.name}">
    <div class="market-card-top">
      <div class="market-asset">
        <span class="asset-icon i-${m.icon || ''}" aria-hidden="true">${m.icon === 'gold' ? 'A' : m.icon === 'euro' ? '€' : m.icon === 'bitcoin' ? '₿' : ''}</span>
        <div>
          <h3>${m.name}</h3>
          <p class="asset-pair">${m.pair}</p>
        </div>
      </div>
    </div>
    <div class="mcard-price-row">
      <span class="mcard-price" id="mcard-price-${m.id}">—</span>
      <span class="mcard-change" id="mcard-change-${m.id}">—</span>
    </div>
    <p class="market-desc">${m.desc}</p>
    <div class="market-levels">
      <div class="level">
        <span class="level-label">Soporte</span>
        <span class="level-val">${m.support}</span>
      </div>
      <div class="level">
        <span class="level-label">Resistencia</span>
        <span class="level-val">${m.resistance}</span>
      </div>
    </div>
  </article>
`;
