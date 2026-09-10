/* ============================================================
   AEON · templates/macroLiquidityHUD.js — Federal Reserve Macro HUD
   Design Tokens 100% • Zero Deuda Técnica • Zero !important
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

/**
 * Formats a metric value with appropriate unit prefix/suffix.
 */
function formatValue(val, unit) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  if (unit === '%') {
    return `${num.toFixed(3)}`;
  }
  if (unit === 'T') {
    return `$${num.toFixed(2)}`;
  }
  if (unit === 'B' || unit === 'M') {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  }
  return `${num}`;
}

/**
 * Formats change and change percentage.
 */
function formatChange(change, changePct, unit) {
  if (change === null || change === undefined || isNaN(change)) {
    return { text: '0.00%', cls: 'neutral', sign: '' };
  }
  const num = Number(change);
  const pct = Number(changePct || 0);
  const sign = num > 0 ? '+' : '';
  let cls = 'neutral';
  if (num > 0.0001) cls = 'positive';
  else if (num < -0.0001) cls = 'negative';

  const unitSymbol = unit === '%' ? ' pts' : '';
  const formattedVal = Math.abs(num) >= 100 ? num.toFixed(0) : num.toFixed(3);
  const text = `${sign}${formattedVal}${unitSymbol} (${sign}${pct.toFixed(2)}%)`;
  return { text, cls };
}

/**
 * Returns readable label and CSS class for the impact bias.
 */
function getBiasInfo(bias) {
  switch (String(bias || '').toUpperCase()) {
    case 'RESTRICTIVE':
      return { label: 'Restrictivo', cls: 'bias-restrictive' };
    case 'EXPANSIVE':
      return { label: 'Expansivo', cls: 'bias-expansive' };
    default:
      return { label: 'Neutral', cls: 'bias-neutral' };
  }
}

/**
 * Generates the HTML string for the HUD container and its 5 pillar items.
 */
export function createMacroLiquidityHUD(items = []) {
  if (!items || !items.length) {
    return `
      <div class="macro-hud-wrapper">
        <div class="macro-hud-container">
          <div class="macro-hud-header">
            <div class="macro-hud-badge-group">
              <span class="macro-hud-beacon"></span>
              <span class="macro-hud-title">Pulso de Liquidez Fed & Rendimientos</span>
            </div>
            <span class="macro-hud-source-label">Cargando telemetría...</span>
          </div>
        </div>
      </div>
    `;
  }

  // Sort by display_order
  const sorted = [...items].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const itemsHTML = sorted.map((item, idx) => {
    const sym = escapeHTML(item.symbol || '');
    const name = escapeHTML(item.name || '');
    const unit = escapeHTML(item.unit || '%');
    const valStr = formatValue(item.current_value, item.unit);
    const change = formatChange(item.change_24h, item.change_24h_pct, item.unit);
    const bias = getBiasInfo(item.impact_bias);

    return `
      <article class="macro-hud-item" data-symbol="${sym}" data-idx="${idx}">
        <div class="macro-hud-item-top">
          <span class="macro-hud-sym">${sym}</span>
          <button 
            type="button" 
            class="macro-hud-info-btn js-macro-info" 
            data-symbol="${sym}" 
            aria-label="Ver análisis y detalle de ${name}"
            title="Ver análisis y detalle institucional"
          >ℹ️</button>
        </div>
        <div class="macro-hud-label" title="${name}">${name}</div>
        <div class="macro-hud-main-val">
          <span class="macro-hud-val">${valStr}</span>
          <span class="macro-hud-unit">${unit}</span>
        </div>
        <div class="macro-hud-bottom">
          <span class="macro-hud-change ${change.cls}">${escapeHTML(change.text)}</span>
          <span class="macro-hud-bias-tag ${bias.cls}">${bias.label}</span>
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="macro-hud-wrapper" aria-label="Pulso de Liquidez Federal y Tasas de Descuento">
      <div class="macro-hud-container">
        <div class="macro-hud-header">
          <div class="macro-hud-badge-group">
            <span class="macro-hud-beacon" aria-hidden="true"></span>
            <span class="macro-hud-title">Pulso de Liquidez Fed & Rendimientos</span>
          </div>
          <span class="macro-hud-source-label">
            <span>NY Fed • US Treasury • FRED</span>
          </span>
        </div>
        <div class="macro-hud-strip" role="region" aria-label="Indicadores Macro de Liquidez">
          ${itemsHTML}
        </div>
      </div>
    </section>
  `;
}

/**
 * Creates modal HTML for an inspected pillar.
 */
export function createMacroDetailModal(item) {
  if (!item) return '';

  const sym = escapeHTML(item.symbol || '');
  const name = escapeHTML(item.name || '');
  const unit = escapeHTML(item.unit || '%');
  const valStr = formatValue(item.current_value, item.unit);
  const change = formatChange(item.change_24h, item.change_24h_pct, item.unit);
  const bias = getBiasInfo(item.impact_bias);
  const desc = escapeHTML(item.description || 'Sin descripción disponible.');
  const imp = escapeHTML(item.market_implication || 'Sin datos de implicación de mercado.');
  const src = escapeHTML(item.source_name || 'FEDERAL_RESERVE');

  return `
    <div class="macro-modal-backdrop is-open" id="macro-detail-modal" role="dialog" aria-modal="true" aria-labelledby="macro-modal-title">
      <div class="macro-modal-container">
        <header class="macro-modal-header">
          <div class="macro-modal-title-group">
            <span class="macro-modal-sym-badge">${sym} • ${bias.label.toUpperCase()}</span>
            <h3 class="macro-modal-title" id="macro-modal-title">${name}</h3>
          </div>
          <button type="button" class="macro-modal-close-btn js-macro-modal-close" aria-label="Cerrar modal">✕</button>
        </header>
        <div class="macro-modal-body">
          <div class="macro-hud-item" style="border-radius: var(--radius-sm); pointer-events: none;">
            <div class="macro-hud-main-val">
              <span class="macro-hud-val" style="font-size: 1.5rem;">${valStr}</span>
              <span class="macro-hud-unit" style="font-size: 0.9rem;">${unit}</span>
            </div>
            <div class="macro-hud-bottom">
              <span class="macro-hud-change ${change.cls}">${escapeHTML(change.text)}</span>
              <span class="macro-hud-bias-tag ${bias.cls}">${bias.label}</span>
            </div>
          </div>

          <div>
            <div class="macro-modal-section-title">
              <span>📖</span> ¿Qué Mide Este Pilar?
            </div>
            <p class="macro-modal-desc">${desc}</p>
          </div>

          <div>
            <div class="macro-modal-section-title">
              <span>⚡</span> Implicación en Oro, Acciones, Cripto y Dólar
            </div>
            <div class="macro-modal-implication-card">
              ${imp}
            </div>
          </div>
        </div>
        <footer class="macro-modal-footer">
          <span>Fuente Oficial: ${src}</span>
          <span>AEON Quant Intelligence</span>
        </footer>
      </div>
    </div>
  `;
}
