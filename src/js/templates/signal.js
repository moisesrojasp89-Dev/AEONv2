/* ============================================================
   AEON · templates/signal.js
   ============================================================ */

const STATUS_CLASS = { 'Activa': 'active', 'Cerrada': 'closed' };

const lockedCard = (s) => `
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
      <span class="signal-dir ${s.direction.toLowerCase()}">${s.direction}</span>
    </div>
    <div class="signal-levels" aria-hidden="true">
      <div class="slevel"><span>Entrada</span><strong>██.███</strong></div>
      <div class="slevel"><span>Stop</span><strong class="stop">██.███</strong></div>
      <div class="slevel"><span>Target</span><strong class="target">██.███</strong></div>
    </div>
  </article>
`;

const publicCard = (s) => `
  <article class="signal-card" role="listitem" aria-label="Señal ${s.asset}">
    <div class="signal-header">
      <div class="signal-asset">
        <span class="asset-icon ${s.iconClass} sm" aria-hidden="true">${s.icon}</span>
        <div>
          <p class="signal-name">${s.asset}</p>
          <p class="signal-time">${s.time}</p>
        </div>
      </div>
      <span class="signal-dir ${s.direction.toLowerCase()}">${s.direction}</span>
    </div>
    <div class="signal-levels">
      <div class="slevel"><span>Entrada</span><strong>${s.entry}</strong></div>
      <div class="slevel"><span>Stop</span><strong class="stop">${s.stop}</strong></div>
      <div class="slevel"><span>Target</span><strong class="target">${s.target}</strong></div>
    </div>
    <div class="signal-footer">
      <span class="signal-rr">${s.rr}</span>
      <span class="signal-status ${STATUS_CLASS[s.status] ?? ''}">${s.status}</span>
    </div>
  </article>
`;

export const signalCard = (s) => s.premium ? lockedCard(s) : publicCard(s);
