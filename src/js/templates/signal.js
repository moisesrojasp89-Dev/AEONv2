/* ============================================================
   AEON · templates/signal.js
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

const STATUS_CLASS = { 'active': 'active', 'won': 'closed', 'lost': 'closed', 'cancelled': 'closed' };
const STATUS_LABEL = { 'active': 'Activa', 'won': 'Ganada', 'lost': 'Perdida', 'cancelled': 'Cancelada' };

function getAssetIconInfo(asset) {
  const clean = String(asset || '');
  if (clean.includes('XAU')) return { icon: 'Au', iconClass: 'gold' };
  if (clean.includes('EUR')) return { icon: '€', iconClass: 'euro' };
  if (clean.includes('GBP')) return { icon: '£', iconClass: 'pound' };
  if (clean.includes('BTC')) return { icon: '₿', iconClass: 'crypto' };
  return { icon: '$', iconClass: 'default' };
}

function getTimeAgo(dateString) {
  if (!dateString) return 'Reciente';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

const lockedCard = (s, currentUser) => `
  <article class="signal-card blur-card" role="listitem" aria-label="Señal premium">
    <div class="blur-overlay">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4zm6 6H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1zm-6 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="currentColor"/>
      </svg>
      <span>Contenido Premium</span>
      ${currentUser ? '<a href="#planes" class="btn btn-primary" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 0.9rem;">Mejorar Rango a PRO</a>' : '<a href="/registro.html" class="blur-cta">Desbloquear →</a>'}
    </div>
    <div class="signal-header" aria-hidden="true">
      <div class="signal-asset">
        <span class="asset-icon ${escapeHTML(s.iconInfo.iconClass)} sm">${escapeHTML(s.iconInfo.icon)}</span>
        <div>
          <p class="signal-name">${escapeHTML(s.asset)}</p>
          <p class="signal-time">${escapeHTML(s.timeStr)}</p>
        </div>
      </div>
      <span class="signal-dir ${escapeHTML(String(s.direction || '').toLowerCase())}">${escapeHTML(s.direction)}</span>
    </div>
    <div class="signal-levels" aria-hidden="true">
      <div class="slevel"><span>Entrada</span><strong>██.███</strong></div>
      <div class="slevel"><span>Stop</span><strong class="stop">██.███</strong></div>
      <div class="slevel"><span>Target</span><strong class="target">██.███</strong></div>
    </div>
  </article>
`;

const loadingProCard = (s) => `
  <article class="signal-card" role="listitem" aria-label="Cargando Señal ${escapeHTML(s.asset)}">
    <div class="signal-header">
      <div class="signal-asset">
        <span class="asset-icon ${escapeHTML(s.iconInfo.iconClass)} sm" aria-hidden="true">${escapeHTML(s.iconInfo.icon)}</span>
        <div>
          <p class="signal-name">${escapeHTML(s.asset)}</p>
          <p class="signal-time">${escapeHTML(s.timeStr)}</p>
        </div>
      </div>
      <span class="signal-dir ${escapeHTML(String(s.direction || '').toLowerCase())}">${escapeHTML(s.direction)}</span>
    </div>
    <div class="signal-levels" style="opacity: 0.5; justify-content: center; padding: 2rem 0;">
      <span>⏳ Cargando análisis PRO...</span>
    </div>
    <div class="signal-footer">
      <span class="signal-rr">-</span>
      <span class="signal-status ${escapeHTML(STATUS_CLASS[s.status] ?? '')}">${escapeHTML(STATUS_LABEL[s.status] || s.status)}</span>
    </div>
  </article>
`;

const publicCard = (s) => `
  <article class="signal-card" role="listitem" aria-label="Señal ${escapeHTML(s.asset)}">
    <div class="signal-header">
      <div class="signal-asset">
        <span class="asset-icon ${escapeHTML(s.iconInfo.iconClass)} sm" aria-hidden="true">${escapeHTML(s.iconInfo.icon)}</span>
        <div>
          <p class="signal-name">${escapeHTML(s.asset)}</p>
          <p class="signal-time">${escapeHTML(s.timeStr)}</p>
        </div>
      </div>
      <span class="signal-dir ${escapeHTML(String(s.direction || '').toLowerCase())}">${escapeHTML(s.direction)}</span>
    </div>
    <div class="signal-levels">
      <div class="slevel"><span>Entrada</span><strong>${escapeHTML(s.entry_price)}</strong></div>
      <div class="slevel"><span>Stop</span><strong class="stop">${escapeHTML(s.stop_loss)}</strong></div>
      <div class="slevel"><span>Target</span><strong class="target">${escapeHTML(s.take_profit)}</strong></div>
    </div>
    <div class="signal-footer">
      <span class="signal-rr">RR Calculado</span>
      <span class="signal-status ${escapeHTML(STATUS_CLASS[s.status] ?? '')}">${escapeHTML(STATUS_LABEL[s.status] || s.status)}</span>
    </div>
  </article>
`;

export const signalCard = (s, currentUser, isPro) => {
  const cardData = { ...s };
  cardData.iconInfo = getAssetIconInfo(cardData.asset);
  cardData.timeStr = getTimeAgo(cardData.created_at);
  
  // Consistencia Eventual: Si es PRO pero aún no tiene datos de entry_price
  if (isPro && !cardData.entry_price) {
    return loadingProCard(cardData);
  }

  // Si no es PRO y no tiene entry_price, muestra bloqueado
  if (!isPro && !cardData.entry_price) {
    return lockedCard(cardData, currentUser);
  }

  // Si tiene los datos (Llegaron por Realtime PRO)
  return publicCard(cardData);
};
