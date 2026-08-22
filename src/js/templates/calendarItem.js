/* ============================================================
   AEON · templates/calendarItem.js — Rich Macro Impact Matrix
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';
import { getMacroImpactContext } from '../services/calendarService.js';

export function parseEcoValue(str) {
  if (typeof str !== 'string') return null;
  const s = str.toUpperCase().trim();
  if (!s || s === 'N/A' || s === 'PENDIENTE') return null;

  let multiplier = 1;
  if (s.includes('K')) multiplier = 1e3;
  else if (s.includes('M')) multiplier = 1e6;
  else if (s.includes('B')) multiplier = 1e9;

  const match = s.match(/-?[\d,.]+/);
  if (!match) return null;

  const numStr = match[0].replace(/,/g, '');
  const val = parseFloat(numStr);

  if (isNaN(val)) return null;

  return val * multiplier;
}

export const calendarRow = (evt, index) => {
  const impactUpper = String(evt.impact || '').toUpperCase();
  const impactClass = impactUpper === 'HIGH' ? 'high' : (impactUpper === 'MEDIUM' || impactUpper === 'MED' ? 'med' : 'low');
  
  let actualClass = '';
  if (evt.actual === 'Pendiente' || !evt.actual) {
    actualClass = 'pending';
  } else {
    const actVal = parseEcoValue(evt.actual);
    const forVal = parseEcoValue(evt.forecast);
    
    if (actVal !== null && forVal !== null) {
      actualClass = actVal >= forVal ? 'better' : 'worse';
    }
  }

  const currency = evt.country || (evt.assets && evt.assets[0] ? evt.assets[0] : 'USD');
  const macro = getMacroImpactContext(evt.event_name || evt.event || '', currency, impactUpper);

  const assetBadges = (macro.affectedAssets || [])
    .map(a => `<span class="macro-asset-badge">${escapeHTML(a)}</span>`)
    .join('');

  return `
    <div class="eco-row-group" id="eco-grp-${index}" data-time="${escapeHTML(evt.event_time)}">
      <div class="eco-row" data-index="${index}" role="button" aria-expanded="false" tabindex="0">
        <div class="eco-cell eco-time">
          <span class="eco-time-date">${escapeHTML(evt.date || '')}</span>
          <span class="eco-time-hour">${escapeHTML(evt.time || '')}</span>
        </div>
        <div class="eco-cell eco-asset">
          <span class="currency-tag">${escapeHTML(currency)}</span>
        </div>
        <div class="eco-cell impact">
          <span class="impact-dot ${impactClass}" title="Impacto ${escapeHTML(evt.impact)}"></span>
        </div>
        <div class="eco-cell eco-event">
          <span class="event-name">${escapeHTML(evt.event_name || evt.event)}</span>
          <span class="event-category">${escapeHTML(macro.category)}</span>
        </div>
        <div class="eco-cell eco-data actual ${actualClass}">${escapeHTML(evt.actual || 'Pendiente')}</div>
        <div class="eco-cell eco-data forecast">${escapeHTML(evt.forecast || '—')}</div>
        <div class="eco-cell eco-data previous">${escapeHTML(evt.previous || '—')}</div>
        <div class="eco-cell eco-expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div class="eco-details">
        <div class="macro-impact-card">
          <div class="macro-header-row">
            <div class="macro-title-group">
              <span class="macro-icon">⚡</span>
              <h4 class="macro-title">Matriz de Transmisión Macro · ${escapeHTML(currency)}</h4>
            </div>
            <span class="macro-volatility-badge">Volatilidad: ${escapeHTML(macro.volatility)}</span>
          </div>

          <p class="macro-summary">${escapeHTML(macro.summary)}</p>

          <div class="macro-scenarios-grid">
            <div class="macro-scenario-box bullish">
              <div class="scenario-label">▲ Escenario > Consenso</div>
              <p class="scenario-text">${escapeHTML(macro.bullishScenario)}</p>
            </div>
            <div class="macro-scenario-box bearish">
              <div class="scenario-label">▼ Escenario < Consenso</div>
              <p class="scenario-text">${escapeHTML(macro.bearishScenario)}</p>
            </div>
          </div>

          <div class="macro-assets-row">
            <span class="assets-label">Activos en Radar:</span>
            <div class="assets-list">${assetBadges}</div>
          </div>
        </div>
      </div>
    </div>
  `;
};
