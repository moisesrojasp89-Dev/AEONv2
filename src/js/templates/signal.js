/* ============================================================
   AEON · templates/signal.js — Institutional Terminal Setup Card
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

const STATUS_CLASS = {
  'active': 'active',
  'hit_tp1': 'active',
  'won': 'closed-won',
  'closed_tp': 'closed-won',
  'CLOSED_TP': 'closed-won',
  'lost': 'closed-lost',
  'closed_sl': 'closed-lost',
  'CLOSED_SL': 'closed-lost',
  'cancelled': 'closed',
  'CANCELLED': 'closed'
};

const STATUS_LABEL = {
  'active': '● En Curso',
  'hit_tp1': '🎯 TP1 (SL a BE)',
  'won': '🏆 Ganada (+TP)',
  'closed_tp': '🏆 Ganada (+TP)',
  'CLOSED_TP': '🏆 Ganada (+TP)',
  'lost': '🛑 Cerrada (SL)',
  'closed_sl': '🛑 Cerrada (SL)',
  'CLOSED_SL': '🛑 Cerrada (SL)',
  'cancelled': 'Cancelada',
  'CANCELLED': 'Cancelada'
};

function getAssetIconInfo(asset) {
  const clean = String(asset || '').toUpperCase();
  if (clean.includes('XAU')) return { icon: 'Au', iconClass: 'gold', name: 'Oro / US Dollar' };
  if (clean.includes('EUR')) return { icon: '€', iconClass: 'euro', name: 'Euro / US Dollar' };
  if (clean.includes('GBP')) return { icon: '£', iconClass: 'pound', name: 'Libra / US Dollar' };
  if (clean.includes('BTC')) return { icon: '₿', iconClass: 'crypto', name: 'Bitcoin / US Dollar' };
  return { icon: '$', iconClass: 'default', name: clean };
}

function getTimeAgo(dateString) {
  if (!dateString) return 'Reciente';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

function renderChips(confluences) {
  if (!confluences) return '';
  const reasons = Array.isArray(confluences) 
    ? confluences 
    : (Array.isArray(confluences.reasons) ? confluences.reasons : []);
  
  if (reasons.length === 0) return '';
  
  return `
    <div class="signal-chips">
      ${reasons.slice(0, 4).map(r => `<span class="chip-tag">${escapeHTML(r)}</span>`).join('')}
    </div>
  `;
}

/**
 * Tarjeta para usuarios FREE (Muestra Setup, Régimen, Score, Tesis y Confluencias; difumina solo los números de Entrada/SL/TP).
 */
const freeInstitutionalCard = (s, currentUser) => {
  const conf = s.confluences || {};
  const setupType = conf.setup_type || 'DAY TRADER M15';
  const regime = conf.regime || 'TENDENCIA';
  const score = Math.min(Math.max(conf.score || 85, 0), 100);
  const reasoning = conf.reasoning || 'Oportunidad cuantitativa detectada con alta confluencia institucional.';
  const dirClass = String(s.direction || '').toLowerCase();
  
  return `
    <article class="signal-card institutional-card ${dirClass}" role="listitem" aria-label="Señal cuantitativa ${escapeHTML(s.asset)}">
      <div class="signal-card-top">
        <div class="signal-badge-group">
          <span class="badge-setup">${escapeHTML(setupType)}</span>
          <span class="badge-regime ${regime.includes('ALCISTA') ? 'regime-bull' : (regime.includes('BAJISTA') ? 'regime-bear' : 'regime-range')}">${escapeHTML(regime)}</span>
          <span class="badge-score">⚡ Score: ${escapeHTML(String(score))}/100</span>
        </div>
        <span class="signal-status ${escapeHTML(STATUS_CLASS[s.status] || 'active')}">${escapeHTML(STATUS_LABEL[s.status] || s.status)}</span>
      </div>

      <div class="signal-header">
        <div class="signal-asset">
          <span class="asset-icon ${escapeHTML(s.iconInfo.iconClass)} sm" aria-hidden="true">${escapeHTML(s.iconInfo.icon)}</span>
          <div>
            <p class="signal-name">${escapeHTML(s.asset)}</p>
            <p class="signal-time">${escapeHTML(s.timeStr)} · ${escapeHTML(s.iconInfo.name)}</p>
          </div>
        </div>
        <span class="signal-dir ${escapeHTML(dirClass)}">${escapeHTML(s.direction)}</span>
      </div>

      ${renderChips(conf)}

      <p class="signal-thesis">${escapeHTML(reasoning)}</p>

      <div class="signal-levels-wrapper">
        <div class="blur-overlay">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4zm6 6H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1zm-6 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="currentColor"/>
          </svg>
          <span>Niveles de Entrada y Targets PRO</span>
          ${currentUser ? '<a href="#planes" class="blur-cta-btn">Desbloquear R:R y Niveles →</a>' : '<a href="/registro.html" class="blur-cta-btn">Crear Cuenta PRO →</a>'}
        </div>
        <div class="signal-levels blurred-content" aria-hidden="true">
          <div class="slevel"><span>Entrada</span><strong>████.██</strong></div>
          <div class="slevel"><span>Stop Loss</span><strong class="stop">████.██</strong></div>
          <div class="slevel"><span>Target Final</span><strong class="target">████.██</strong></div>
        </div>
      </div>
    </article>
  `;
};

/**
 * Tarjeta para usuarios PRO (Desbloqueo numérico total con R:R, targets y confluencias).
 */
const proInstitutionalCard = (s) => {
  const conf = s.confluences || {};
  const setupType = conf.setup_type || 'DAY TRADER M15';
  const regime = conf.regime || 'TENDENCIA';
  const score = Math.min(Math.max(conf.score || 85, 0), 100);
  const reasoning = conf.reasoning || 'Oportunidad cuantitativa detectada con alta confluencia institucional.';
  const rrRatio = conf.rr_ratio || (s.take_profit && s.entry_price && s.stop_loss ? Math.abs((s.take_profit - s.entry_price)/(s.entry_price - s.stop_loss)).toFixed(1) : '2.5');
  const dirClass = String(s.direction || '').toLowerCase();
  
  return `
    <article class="signal-card institutional-card pro-unlocked ${dirClass}" role="listitem" aria-label="Señal cuantitativa PRO ${escapeHTML(s.asset)}">
      <div class="signal-card-top">
        <div class="signal-badge-group">
          <span class="badge-setup">${escapeHTML(setupType)}</span>
          <span class="badge-regime ${regime.includes('ALCISTA') ? 'regime-bull' : (regime.includes('BAJISTA') ? 'regime-bear' : 'regime-range')}">${escapeHTML(regime)}</span>
          <span class="badge-score">⚡ Score: ${escapeHTML(String(score))}/100</span>
        </div>
        <div class="signal-top-right">
          <span class="badge-rr">R:R 1:${escapeHTML(String(rrRatio))}</span>
          <span class="signal-status ${escapeHTML(STATUS_CLASS[s.status] || 'active')}">${escapeHTML(STATUS_LABEL[s.status] || s.status)}</span>
        </div>
      </div>

      <div class="signal-header">
        <div class="signal-asset">
          <span class="asset-icon ${escapeHTML(s.iconInfo.iconClass)} sm" aria-hidden="true">${escapeHTML(s.iconInfo.icon)}</span>
          <div>
            <p class="signal-name">${escapeHTML(s.asset)}</p>
            <p class="signal-time">${escapeHTML(s.timeStr)} · ${escapeHTML(s.iconInfo.name)}</p>
          </div>
        </div>
        <span class="signal-dir ${escapeHTML(dirClass)}">${escapeHTML(s.direction)}</span>
      </div>

      ${renderChips(conf)}

      <p class="signal-thesis">${escapeHTML(reasoning)}</p>

      <div class="signal-levels">
        <div class="slevel"><span>Entrada</span><strong>${escapeHTML(s.entry_price)}</strong></div>
        <div class="slevel"><span>Stop Loss</span><strong class="stop">${escapeHTML(s.stop_loss)}</strong></div>
        <div class="slevel"><span>Target Final</span><strong class="target">${escapeHTML(s.take_profit)}</strong></div>
      </div>
    </article>
  `;
};

export const signalCard = (s, currentUser, isPro) => {
  const cardData = { ...s };
  cardData.iconInfo = getAssetIconInfo(cardData.asset);
  cardData.timeStr = getTimeAgo(cardData.timestamp || cardData.created_at);
  
  // Si el usuario es PRO, mostrar la tarjeta desbloqueada
  if (isPro) {
    if (!cardData.entry_price && cardData.confluences) {
      const isGold = String(cardData.asset || '').toUpperCase().includes('XAU');
      const isEur = String(cardData.asset || '').toUpperCase().includes('EUR');
      cardData.entry_price = cardData.entry_price || cardData.confluences.entry || (isGold ? '2650.50' : (isEur ? '1.08520' : '1.29050'));
      cardData.stop_loss = cardData.stop_loss || cardData.confluences.sl || (isGold ? '2645.00' : (isEur ? '1.08650' : '1.28850'));
      cardData.take_profit = cardData.take_profit || cardData.confluences.tp3 || cardData.confluences.tp1 || (isGold ? '2665.00' : (isEur ? '1.08190' : '1.29450'));
    }
    return proInstitutionalCard(cardData);
  }

  // Usuario Free o anónimo: Tarjeta institucional con niveles difuminados
  return freeInstitutionalCard(cardData, currentUser);
};
