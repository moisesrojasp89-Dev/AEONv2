/* ============================================================
   AEON · templates/signal.js — Institutional Terminal Setup Card
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';
import { SIGNAL_STATUS_CONFIG } from '../config/constants.js';

function getStatusDisplay(status) {
  const s = String(status || 'active').toLowerCase();
  const cfg = SIGNAL_STATUS_CONFIG[s];
  return {
    class: cfg?.class || 'active',
    label: cfg?.label || status,
  };
}

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

function formatPrice(asset, val) {
  if (val === undefined || val === null || val === '') return '—';
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  const cleanAsset = String(asset || '').toUpperCase();
  if (cleanAsset.includes('XAU')) {
    return num.toFixed(2);
  }
  if (cleanAsset.includes('EUR') || cleanAsset.includes('GBP')) {
    return num.toFixed(5);
  }
  return String(val);
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
  const statusInfo = getStatusDisplay(s.status);
  
  return `
    <article class="signal-card institutional-card ${dirClass}" role="listitem" aria-label="Señal cuantitativa ${escapeHTML(s.asset)}">
      <div class="signal-card-top">
        <div class="signal-badge-group">
          <span class="badge-setup">${escapeHTML(setupType)}</span>
          <span class="badge-regime ${regime.includes('ALCISTA') ? 'regime-bull' : (regime.includes('BAJISTA') ? 'regime-bear' : 'regime-range')}">${escapeHTML(regime)}</span>
        </div>
        <div class="signal-top-right">
          <span class="signal-status ${escapeHTML(statusInfo.class)}">${escapeHTML(statusInfo.label)}</span>
        </div>
      </div>

      <div class="signal-sub-bar">
        <span class="badge-score">⚡ Score: ${escapeHTML(String(score))}/100</span>
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
          <span class="blur-title">Niveles de Entrada y Targets PRO</span>
          ${currentUser ? '<a href="#planes" class="blur-cta-btn">Desbloquear R:R y Niveles →</a>' : '<a href="/registro.html" class="blur-cta-btn">Crear Cuenta PRO →</a>'}
        </div>
        <div class="signal-levels blurred-content" aria-hidden="true">
          <div class="slevel"><span class="slevel-title">ENTRADA</span><strong class="slevel-val">████.██</strong></div>
          <div class="slevel"><span class="slevel-title">STOP LOSS</span><strong class="slevel-val stop">████.██</strong></div>
          <div class="slevel"><span class="slevel-title">TARGET</span><strong class="slevel-val target">████.██</strong></div>
        </div>
      </div>
    </article>
  `;
};

/**
 * Tarjeta para usuarios PRO (Desbloqueo numérico total con R:R, targets alineados y confluencias).
 */
const proInstitutionalCard = (s) => {
  const conf = s.confluences || {};
  const setupType = conf.setup_type || 'DAY TRADER M15';
  const regime = conf.regime || 'TENDENCIA';
  const score = Math.min(Math.max(conf.score || 85, 0), 100);
  const reasoning = conf.reasoning || 'Oportunidad cuantitativa detectada con alta confluencia institucional.';
  const rrRatio = conf.rr_ratio || (s.take_profit && s.entry_price && s.stop_loss ? Math.abs((s.take_profit - s.entry_price)/(s.entry_price - s.stop_loss)).toFixed(1) : '2.5');
  const dirClass = String(s.direction || '').toLowerCase();
  const statusInfo = getStatusDisplay(s.status);
  
  const formattedEntry = formatPrice(s.asset, s.entry_price);
  const formattedSL = formatPrice(s.asset, s.stop_loss);
  const formattedTP = formatPrice(s.asset, s.take_profit);

  return `
    <article class="signal-card institutional-card pro-unlocked ${dirClass}" role="listitem" aria-label="Señal cuantitativa PRO ${escapeHTML(s.asset)}">
      <div class="signal-card-top">
        <div class="signal-badge-group">
          <span class="badge-setup">${escapeHTML(setupType)}</span>
          <span class="badge-regime ${regime.includes('ALCISTA') ? 'regime-bull' : (regime.includes('BAJISTA') ? 'regime-bear' : 'regime-range')}">${escapeHTML(regime)}</span>
        </div>
        <div class="signal-top-right">
          <span class="badge-rr">R:R 1:${escapeHTML(String(rrRatio))}</span>
          <span class="signal-status ${escapeHTML(statusInfo.class)}">${escapeHTML(statusInfo.label)}</span>
        </div>
      </div>

      <div class="signal-sub-bar">
        <span class="badge-score">⚡ Score: ${escapeHTML(String(score))}/100</span>
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
        <div class="slevel">
          <span class="slevel-title">ENTRADA</span>
          <strong class="slevel-val">${escapeHTML(formattedEntry)}</strong>
        </div>
        <div class="slevel">
          <span class="slevel-title">STOP LOSS</span>
          <strong class="slevel-val stop">${escapeHTML(formattedSL)}</strong>
        </div>
        <div class="slevel">
          <span class="slevel-title">TARGET</span>
          <strong class="slevel-val target">${escapeHTML(formattedTP)}</strong>
        </div>
      </div>
    </article>
  `;
};

/**
 * Tarjeta de Historial de Trade Cerrado (Track Record).
 */
export const closedSignalCard = (s) => {
  const cardData = { ...s };
  cardData.iconInfo = getAssetIconInfo(cardData.asset);
  const conf = cardData.confluences || {};
  const setupType = conf.setup_type || 'DAY TRADER M15';
  const regime = conf.regime || 'TENDENCIA';
  const reasoning = conf.reasoning || 'Trade cuantitativo ejecutado por reglas de confluencia institucional.';
  const dirClass = String(cardData.direction || '').toLowerCase();
  const statusInfo = getStatusDisplay(cardData.status);
  
  let rPill = '+2.5R';
  let rClass = 'pill-tp';
  if (Number.isFinite(conf.realized_r)) {
    const rVal = conf.realized_r;
    rPill = (rVal > 0 ? `+${rVal}R` : `${rVal}R`);
    rClass = rVal > 0 ? 'pill-tp' : (rVal === 0 ? 'pill-be' : 'pill-sl');
  } else if (cardData.status === 'closed_tp' || cardData.status === 'won') {
    rPill = `+${conf.rr_ratio || '2.5'}R`;
    rClass = 'pill-tp';
  } else if (cardData.status === 'closed_be') {
    rPill = '0.0R (BE)';
    rClass = 'pill-be';
  } else {
    rPill = '-1.0R (SL)';
    rClass = 'pill-sl';
  }

  const exitPriceStr = formatPrice(cardData.asset, conf.exit_price || cardData.take_profit || cardData.stop_loss);
  const dateStr = cardData.timestamp ? new Date(cardData.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Reciente';

  return `
    <article class="signal-card history-card ${escapeHTML(statusInfo.class)}" role="listitem">
      <div class="signal-card-top">
        <div class="signal-badge-group">
          <span class="badge-setup">${escapeHTML(setupType)}</span>
          <span class="badge-regime ${regime.includes('ALCISTA') ? 'regime-bull' : (regime.includes('BAJISTA') ? 'regime-bear' : 'regime-range')}">${escapeHTML(regime)}</span>
        </div>
        <div class="signal-top-right">
          <span class="badge-realized-r ${escapeHTML(rClass)}">${escapeHTML(rPill)}</span>
          <span class="signal-status ${escapeHTML(statusInfo.class)}">${escapeHTML(statusInfo.label)}</span>
        </div>
      </div>

      <div class="signal-header">
        <div class="signal-asset">
          <span class="asset-icon ${escapeHTML(cardData.iconInfo.iconClass)} sm" aria-hidden="true">${escapeHTML(cardData.iconInfo.icon)}</span>
          <div>
            <p class="signal-name">${escapeHTML(cardData.asset)}</p>
            <p class="signal-time">${escapeHTML(dateStr)} · ${escapeHTML(cardData.iconInfo.name)}</p>
          </div>
        </div>
        <span class="signal-dir ${escapeHTML(dirClass)}">${escapeHTML(cardData.direction)}</span>
      </div>

      ${renderChips(conf)}

      <p class="signal-thesis">${escapeHTML(reasoning)}</p>

      <div class="history-exit-box">
        <div class="history-exit-item">
          <span class="hexit-lbl">PRECIO DE SALIDA</span>
          <strong class="hexit-val">${escapeHTML(exitPriceStr)}</strong>
        </div>
        <div class="history-exit-item">
          <span class="hexit-lbl">RESULTADO R</span>
          <strong class="hexit-val ${escapeHTML(rClass)}">${escapeHTML(rPill)}</strong>
        </div>
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
    return proInstitutionalCard(cardData);
  }

  // Usuario Free o anónimo: Tarjeta institucional con niveles difuminados
  return freeInstitutionalCard(cardData, currentUser);
};
