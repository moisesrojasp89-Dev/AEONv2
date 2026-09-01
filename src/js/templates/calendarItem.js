/* ============================================================
   AEON · templates/calendarItem.js
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';
import { getMacroImpactContext } from '../services/calendarService.js';

export function parseEcoValue(str) {
  if (typeof str !== 'string') return null;
  const s = str.toUpperCase().trim();
  if (!s || s === 'N/A' || s === 'PENDIENTE' || s === '—') return null;

  let multiplier = 1;
  if (s.endsWith('K')) multiplier = 1e3;
  else if (s.endsWith('M')) multiplier = 1e6;
  else if (s.endsWith('B')) multiplier = 1e9;

  const match = s.match(/-?[\d,.]+/);
  if (!match) return null;
  const val = parseFloat(match[0].replace(/,/g, ''));
  return isNaN(val) ? null : val * multiplier;
}

/**
 * Events where a LOWER actual reading is BETTER for the economy/currency.
 * For these, actual > forecast = miss (bad), actual < forecast = beat (good).
 * Stored as lowercase fragments that are matched against the event name.
 */
const INVERTED_INDICATORS = [
  'unemployment claims',
  'jobless claims',
  'claimant count',
  'unemployment rate',
  'initial claims',
  'continuing claims',
  'delinquency',
  'default',
  'trade deficit',
];

function isInvertedIndicator(eventName = '') {
  const n = eventName.toLowerCase();
  return INVERTED_INDICATORS.some(term => n.includes(term));
}

/**
 * Renders a single calendar event row + expandable detail panel.
 * The detail panel shows:
 *   - The specific actual / forecast / previous values for THIS event
 *   - The macro context (category, what it measures, affected assets, pip range)
 *   - Directional signals deduced from actual vs forecast (when data is available)
 */
export const calendarRow = (evt, index) => {
  const impactUpper = String(evt.impact || '').toUpperCase();
  const impactClass =
    impactUpper === 'HIGH' ? 'high' :
    impactUpper === 'MEDIUM' ? 'med' :
    impactUpper === 'MED' ? 'med' : 'low';

  const evtName = evt.event_name || evt.event || '';

  // ── Actual vs Forecast colouring ──
  const actualRaw   = evt.actual   || '';
  const forecastRaw = evt.forecast || '';
  const previousRaw = evt.previous || '';
  const isPending   = !actualRaw || actualRaw === 'Pendiente' || actualRaw === '—';

  // For inverted indicators (unemployment, claims) lower actual = better
  const inverted = isInvertedIndicator(evtName);

  let actualClass = '';
  let directionSignal = null; // 'beat' | 'miss' | null

  if (!isPending) {
    const actVal = parseEcoValue(actualRaw);
    const forVal = parseEcoValue(forecastRaw);
    if (actVal !== null && forVal !== null) {
      const higherIsBetter = !inverted;
      if (actVal > forVal) {
        actualClass    = higherIsBetter ? 'better' : 'worse';
        directionSignal = higherIsBetter ? 'beat'   : 'miss';
      } else if (actVal < forVal) {
        actualClass    = higherIsBetter ? 'worse'  : 'better';
        directionSignal = higherIsBetter ? 'miss'   : 'beat';
      }
    }
  } else {
    actualClass = 'pending';
  }

  const currency = evt.country || (evt.assets?.[0] ?? 'USD');
  const macro    = getMacroImpactContext(evt.event_name || evt.event || '', currency, impactUpper);

  // ── Asset badges ──
  const assetBadges = macro.affectedAssets
    .map(a => `<span class="macro-asset-badge">${escapeHTML(a)}</span>`)
    .join('');

  // ── Signal block (only when data published and direction is clear) ──
  let signalBlock = '';
  if (directionSignal === 'beat') {
    // Beat = positive for currency (already accounts for inverted indicators)
    const beatText = inverted
      ? `<strong>Dato menor al consenso</strong> → Menos solicitudes de lo esperado. Señal de mercado laboral más sano de lo previsto. Positivo para ${escapeHTML(currency)}, reduce presión para que el banco central recorte tipos.`
      : `<strong>Dato supera el consenso.</strong> Publicación positiva para ${escapeHTML(currency)}. Vigilar posibles compras institucionales y presión sobre activos inversos al ${escapeHTML(currency)}.`;
    signalBlock = `
      <div class="detail-signal beat">
        <span class="signal-arrow">▲</span>
        <span>${beatText}</span>
      </div>`;
  } else if (directionSignal === 'miss') {
    const missText = inverted
      ? `<strong>Dato mayor al consenso</strong> → Más solicitudes de lo esperado. Señal de deterioro en el mercado laboral. Negativo para ${escapeHTML(currency)}, aumenta la probabilidad de recortes de tipos.`
      : `<strong>Dato por debajo del consenso.</strong> Publicación negativa para ${escapeHTML(currency)}. Vigilar ventas institucionales y rotación hacia activos refugio.`;
    signalBlock = `
      <div class="detail-signal miss">
        <span class="signal-arrow">▼</span>
        <span>${missText}</span>
      </div>`;
  } else if (isPending) {
    signalBlock = `
      <div class="detail-signal pending-signal">
        <span class="signal-arrow">⏳</span>
        <span><strong>Dato aún no publicado.</strong> Revisar el resultado en cuanto se actualice la base de datos.</span>
      </div>`;
  }

  // ── Stats strip for mobile (shown inside detail when row is expanded) ──
  const statsStrip = `
    <div class="detail-stats-strip">
      <div class="detail-stat">
        <span class="detail-stat-label">Actual</span>
        <span class="detail-stat-val ${actualClass || ''}">${escapeHTML(isPending ? 'Pendiente' : actualRaw)}</span>
      </div>
      <div class="detail-stat">
        <span class="detail-stat-label">Consenso</span>
        <span class="detail-stat-val">${escapeHTML(forecastRaw || '—')}</span>
      </div>
      <div class="detail-stat">
        <span class="detail-stat-label">Previo</span>
        <span class="detail-stat-val">${escapeHTML(previousRaw || '—')}</span>
      </div>
    </div>`;

  return `
    <div class="eco-row-group" id="eco-grp-${index}" data-time="${escapeHTML(evt.event_time)}">

      <!-- Desktop row (8 columns) — hidden on mobile -->
      <div class="eco-row eco-row-desktop" data-index="${index}" role="button" aria-expanded="false" tabindex="0">
        <div class="eco-cell eco-time">
          <span class="eco-time-date">${escapeHTML(evt.date || '')}</span>
          <span class="eco-time-hour">${escapeHTML(evt.time || '')}</span>
        </div>
        <div class="eco-cell eco-asset"><span class="currency-tag">${escapeHTML(currency)}</span></div>
        <div class="eco-cell impact">
          <span class="impact-dot ${impactClass}" title="Impacto: ${escapeHTML(evt.impact || impactUpper)}"></span>
        </div>
        <div class="eco-cell eco-event">
          <span class="event-name">${escapeHTML(evt.event_name || evt.event || '')}</span>
          <span class="event-category">${escapeHTML(macro.category)}</span>
        </div>
        <div class="eco-cell eco-data actual ${actualClass}">${escapeHTML(isPending ? 'Pendiente' : actualRaw)}</div>
        <div class="eco-cell eco-data forecast">${escapeHTML(forecastRaw || '—')}</div>
        <div class="eco-cell eco-data previous">${escapeHTML(previousRaw || '—')}</div>
        <div class="eco-cell eco-expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>

      <!-- Mobile row (4 columns: time | event | impact | expand) -->
      <div class="eco-row eco-row-mobile" data-index="${index}" role="button" aria-expanded="false" tabindex="0">
        <div class="eco-cell eco-time">
          <span class="eco-time-date">${escapeHTML(evt.date || '')}</span>
          <span class="eco-time-hour">${escapeHTML(evt.time || '')}</span>
        </div>
        <div class="eco-cell eco-event-mobile">
          <span class="mobile-currency-tag">${escapeHTML(currency)}</span>
          <span class="event-name">${escapeHTML(evt.event_name || evt.event || '')}</span>
        </div>
        <div class="eco-cell impact">
          <span class="impact-dot ${impactClass}"></span>
        </div>
        <div class="eco-cell eco-expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>

      <!-- Expandable detail panel (shared, shown on both desktop & mobile) -->
      <div class="eco-details">
        <div class="macro-impact-card">

          <div class="macro-header-row">
            <div class="macro-title-group">
              <span class="macro-icon">⚡</span>
              <h4 class="macro-title">${escapeHTML(evt.event_name || evt.event || '')} · <span class="macro-currency">${escapeHTML(currency)}</span></h4>
            </div>
            <span class="macro-volatility-badge">~${escapeHTML(macro.volatilityPips)}</span>
          </div>

          ${statsStrip}
          ${signalBlock}

          <p class="macro-what"><strong>¿Qué mide?</strong> ${escapeHTML(macro.what)}</p>

          <div class="macro-assets-row">
            <span class="assets-label">Activos en Radar:</span>
            <div class="assets-list">${assetBadges}</div>
          </div>

        </div>
      </div>
    </div>
  `;
};
