/* ============================================================
   AUREUM · render.js — Renderiza contenido desde markets.json
   ============================================================ */

export function renderStats(stats) {
  const el = document.getElementById('hero-stats');
  if (!el) return;
  el.innerHTML = stats.map((s, i) => `
    ${i > 0 ? '<div class="stat-divider" aria-hidden="true"></div>' : ''}
    <div class="stat">
      <span class="stat-num">${s.num}</span>
      <span class="stat-label">${s.label}</span>
    </div>
  `).join('');
}

export function renderTickers(markets) {
  const el = document.getElementById('hero-tickers');
  if (!el) return;
  el.innerHTML = markets.map(m => `
    <div class="ticker-card" id="card-${m.id}">
      <div class="ticker-left">
        <span class="ticker-icon ${m.iconClass}" aria-hidden="true">${m.icon}</span>
        <div>
          <p class="ticker-name">${m.name}</p>
          <p class="ticker-pair">${m.pair}</p>
        </div>
      </div>
      <div class="ticker-right">
        <p class="ticker-price" id="price-${m.id}">—</p>
        <p class="ticker-change" id="change-${m.id}">—</p>
      </div>
    </div>
  `).join('');
}

export function renderMarketCards(markets) {
  const el = document.getElementById('market-grid');
  if (!el) return;
  el.innerHTML = markets.map(m => `
    <article class="market-card" aria-label="${m.name}">
      <div class="market-card-top">
        <div class="market-asset">
          <span class="asset-icon ${m.iconClass}" aria-hidden="true">${m.icon}</span>
          <div>
            <h3>${m.name}</h3>
            <p class="asset-pair">${m.pair}</p>
          </div>
        </div>
        <span class="market-badge ${m.biasClass}">${m.bias}</span>
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
  `).join('');
}

export function renderSignals(signals) {
  const el = document.getElementById('signals-list');
  if (!el) return;
  el.innerHTML = signals.map(s => s.premium ? `
    <article class="signal-card blur-card" role="listitem" aria-label="Señal premium">
      <div class="blur-overlay">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4zm6 6H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1zm-6 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="currentColor"/>
        </svg>
        <span>Contenido Premium</span>
        <a href="#premium" class="blur-cta">Desbloquear →</a>
      </div>
      <div class="signal-header" aria-hidden="true">
        <div class="signal-asset">
          <span class="asset-icon ${s.iconClass} sm">${s.icon}</span>
          <div>
            <p class="signal-name">${s.asset}</p>
            <p class="signal-time">${s.time}</p>
          </div>
        </div>
        <span class="signal-dir ${s.dirClass}">${s.direction}</span>
      </div>
      <div class="signal-levels" aria-hidden="true">
        <div class="slevel"><span>Entrada</span><strong>██.███</strong></div>
        <div class="slevel"><span>Stop</span><strong class="stop">██.███</strong></div>
        <div class="slevel"><span>Target</span><strong class="target">██.███</strong></div>
      </div>
    </article>
  ` : `
    <article class="signal-card" role="listitem" aria-label="Señal ${s.asset}">
      <div class="signal-header">
        <div class="signal-asset">
          <span class="asset-icon ${s.iconClass} sm" aria-hidden="true">${s.icon}</span>
          <div>
            <p class="signal-name">${s.asset}</p>
            <p class="signal-time">${s.time}</p>
          </div>
        </div>
        <span class="signal-dir ${s.dirClass}">${s.direction}</span>
      </div>
      <div class="signal-levels">
        <div class="slevel"><span>Entrada</span><strong>${s.entry}</strong></div>
        <div class="slevel"><span>Stop</span><strong class="stop">${s.stop}</strong></div>
        <div class="slevel"><span>Target</span><strong class="target">${s.target}</strong></div>
      </div>
      <div class="signal-footer">
        <span class="signal-rr">${s.rr}</span>
        <span class="signal-status ${s.statusClass}">${s.status}</span>
      </div>
    </article>
  `).join('');
}

export function renderPremiumFeatures(features) {
  const el = document.getElementById('premium-features');
  if (!el) return;
  el.innerHTML = features.map(f => `
    <li>
      <span class="feat-check" aria-hidden="true">✓</span>
      ${f}
    </li>
  `).join('');
}
export function renderTickerBar(items) {
  const el = document.getElementById('ticker-track');
  if (!el) return;

  const html = items.map(t => `
    <span class="ticker-item">
      <span class="ticker-label">${t.label}</span>
      <span class="ticker-price">${t.price}</span>
      <span class="ticker-change ${t.up ? 'up' : 'down'}">${t.up ? '▲' : '▼'} ${t.change}</span>
    </span>
    <span class="ticker-sep" aria-hidden="true">·</span>
  `).join('');

  el.innerHTML = html + html;

  setTimeout(() => {
    const halfWidth = el.scrollWidth / 2;
    if (halfWidth === 0) return;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ticker-scroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-${halfWidth}px); }
      }
    `;
    document.head.appendChild(style);
  }, 100);
}