/* ============================================================
   AEON · templates/analysisCard.js — Institutional Terminal Renderer
   Sleek Tabular Design • Zero Heavy Nested Bubbles • Preserves State
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

/**
 * Renderiza la ficha técnica del análisis con diseño institucional limpio.
 * @param {Object} data - Objeto de datos del activo
 * @param {string} activeTab - Pestaña activa ('zonas', 'escenarios', 'detalle')
 * @returns {string} Markup HTML
 */
export function renderTerminalCard(data = {}, activeTab = 'zonas') {
  if (!data || !data.symbol) return '';

  const symbol = escapeHTML(data.symbol || '');
  const displayName = escapeHTML(data.display_name || symbol);
  const isForex = data.symbol === 'EURUSD';
  const fmt = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    const num = Number(val);
    return isForex
      ? num.toFixed(4)
      : (num >= 100 ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : num.toFixed(2));
  };
  const curPrefix = isForex ? '' : '$';

  const price = typeof data.current_price === 'number'
    ? fmt(data.current_price)
    : escapeHTML(String(data.current_price || '—'));

  const changePct = Number(data.change_24h_pct || 0);
  const changeStr = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
  const changeClass = changePct >= 0 ? 'bullish' : 'bearish';

  const bias = String(data.bias || 'NEUTRAL').toUpperCase();
  const biasClass = bias.includes('BULL') ? 'bullish' : (bias.includes('BEAR') ? 'bearish' : 'neutral');
  const biasLabel = bias.includes('BULL') ? '▲ BULLISH' : (bias.includes('BEAR') ? '▼ BEARISH' : '■ NEUTRAL');

  const sessionLevels = data.session_levels || {};
  const currentSession = escapeHTML(sessionLevels.current_session || 'GLOBAL');
  const ema50 = fmt(sessionLevels.ema_50_1h);
  const vwap = fmt(sessionLevels.session_vwap);
  const dpoc = fmt(sessionLevels.dpoc_price);
  const vah = fmt(sessionLevels.vah_price);
  const val = fmt(sessionLevels.val_price);
  const pdh = fmt(sessionLevels.pdh);
  const pdl = fmt(sessionLevels.pdl);

  // 1. Zonas ZAP Estructuradas (Ladder institucional)
  const pois = Array.isArray(data.structural_poi) ? data.structural_poi : [];
  const sellPoi = pois.find(p => String(p.type || '').toUpperCase().includes('SELL')) || null;
  const buyPoi = pois.find(p => String(p.type || '').toUpperCase().includes('BUY')) || null;

  const renderPoiRow = (poi, type) => {
    if (!poi) return '';
    const isSell = type === 'sell';
    const title = isSell ? '🔴 OFERTA (SELLSIDE POI)' : '🟢 DEMANDA (BUYSIDE POI)';
    const rLow = fmt(poi.range_low);
    const rHigh = fmt(poi.range_high);
    const confluences = Array.isArray(poi.confluences) ? poi.confluences.join('  ·  ') : '';

    return `
      <div class="zap-tier ${isSell ? 'tier-sell' : 'tier-buy'}">
        <div class="zap-tier-header">
          <span class="zap-tier-title">${title}</span>
          <span class="zap-tier-range font-mono">${curPrefix}${rLow} – ${curPrefix}${rHigh}</span>
        </div>
        <div class="zap-tier-confluences font-mono">${escapeHTML(confluences)}</div>
      </div>
    `;
  };

  // 2. Piscinas de Liquidez en formato Lista Tabular
  const pools = data.liquidity_pools || {};
  const bsl = Array.isArray(pools.bsl) ? pools.bsl : [];
  const ssl = Array.isArray(pools.ssl) ? pools.ssl : [];
  const allLiquidity = [
    ...bsl.map(b => ({ ...b, poolType: 'BSL' })),
    ...ssl.map(s => ({ ...s, poolType: 'SSL' })),
  ];

  const liquidityRowsMarkup = allLiquidity.map(item => {
    const isBSL = item.poolType === 'BSL';
    const isSwept = item.status === 'swept';
    const tagClass = isSwept ? 'swept' : 'pending';
    const tagLabel = isSwept ? 'Barrido ✔' : 'Pendiente';
    const priceFormatted = fmt(item.price);

    return `
      <div class="liq-row">
        <div class="liq-meta">
          <span class="liq-dot ${isBSL ? 'dot-bsl' : 'dot-ssl'}"></span>
          <span class="liq-type">${item.poolType}</span>
          <span class="liq-label">${escapeHTML(item.label || '')}</span>
        </div>
        <div class="liq-values">
          <span class="liq-price font-mono">${curPrefix}${priceFormatted}</span>
          <span class="liq-badge ${tagClass}">${tagLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  // 3. Escenarios
  const scenarios = data.structural_scenarios || {};
  const bullPath = escapeHTML(scenarios.bullish_path || 'Evaluando confluencias alcistas...');
  const bearPath = escapeHTML(scenarios.bearish_path || 'Evaluando confluencias bajistas...');
  const invalidation = escapeHTML(scenarios.invalidation_text || `Nivel clave en ${curPrefix}${fmt(scenarios.invalidation_level)}`);

  // 4. Diagnóstico
  const diagnosis = escapeHTML(data.diagnosis || data.macro_driver || 'Analizando estructura institucional...');

  // Tabs activo state
  const isZonas = activeTab === 'zonas';
  const isEscenarios = activeTab === 'escenarios';
  const isDetalle = activeTab === 'detalle';

  return `
    <div class="terminal-card">
      <!-- Status Strip Minimalista -->
      <div class="terminal-topbar">
        <div class="terminal-asset-info">
          <h2 class="terminal-asset-name">${displayName}</h2>
          <div class="terminal-price-row">
            <span class="terminal-price font-mono">${curPrefix}${price}</span>
            <span class="terminal-change font-mono ${changeClass}">${changeStr}</span>
          </div>
        </div>
        <div class="terminal-pills-row">
          <span class="terminal-bias-tag ${biasClass}">${biasLabel}</span>
          <span class="terminal-session-tag font-mono">${currentSession}</span>
        </div>
      </div>

      <!-- Segmented Control Tabs (Limpio y plano) -->
      <div class="terminal-segmented-control" role="tablist">
        <button class="segmented-btn ${isZonas ? 'active' : ''}" data-tab="zonas" role="tab" aria-selected="${isZonas}">
          ZONAS ZAP
        </button>
        <button class="segmented-btn ${isEscenarios ? 'active' : ''}" data-tab="escenarios" role="tab" aria-selected="${isEscenarios}">
          ESCENARIOS
        </button>
        <button class="segmented-btn ${isDetalle ? 'active' : ''}" data-tab="detalle" role="tab" aria-selected="${isDetalle}">
          MÉTRICAS & DETALLE
        </button>
      </div>

      <!-- Panel 1: Zonas ZAP (Escalera de Niveles) -->
      <div class="tab-content-panel ${isZonas ? 'active' : ''}" id="tab-panel-zonas" role="tabpanel">
        <div class="zap-ladder-container">
          ${renderPoiRow(sellPoi, 'sell')}

          <div class="zap-price-divider">
            <span class="zap-divider-line"></span>
            <span class="zap-divider-badge font-mono">PRECIO: ${curPrefix}${price}</span>
            <span class="zap-divider-line"></span>
          </div>

          ${renderPoiRow(buyPoi, 'buy')}
        </div>

        <!-- Tabla de Liquidez Limpia -->
        <div class="liquidity-table-wrap">
          <div class="liq-table-header font-mono">PISCINAS DE LIQUIDEZ ($$$)</div>
          ${liquidityRowsMarkup}
        </div>
      </div>

      <!-- Panel 2: Escenarios -->
      <div class="tab-content-panel ${isEscenarios ? 'active' : ''}" id="tab-panel-escenarios" role="tabpanel">
        <div class="scenario-minimal-item item-bullish">
          <div class="scenario-mini-label">EXPANSIÓN ALCISTA</div>
          <p class="scenario-mini-text">${bullPath}</p>
        </div>

        <div class="scenario-minimal-item item-bearish">
          <div class="scenario-mini-label">CONTINUACIÓN BAJISTA</div>
          <p class="scenario-mini-text">${bearPath}</p>
        </div>

        <div class="invalidation-strip font-mono">
          <span class="inv-badge">INVALIDACIÓN</span>
          <span class="inv-text">${invalidation}</span>
        </div>
      </div>

      <!-- Panel 3: Detalle y Métricas -->
      <div class="tab-content-panel ${isDetalle ? 'active' : ''}" id="tab-panel-detalle" role="tabpanel">
        <div class="diagnosis-compact">
          <span class="diagnosis-label font-mono">DIAGNÓSTICO INSTITUCIONAL</span>
          <p class="diagnosis-body">${diagnosis}</p>
        </div>

        <div class="metrics-flat-list">
          <div class="metric-flat-row">
            <span class="metric-flat-name font-mono">EMA 50 (1H)</span>
            <span class="metric-flat-val font-mono">${curPrefix}${ema50}</span>
          </div>
          <div class="metric-flat-row">
            <span class="metric-flat-name font-mono">Session VWAP</span>
            <span class="metric-flat-val font-mono">${curPrefix}${vwap}</span>
          </div>
          <div class="metric-flat-row">
            <span class="metric-flat-name font-mono">dPOC Diario</span>
            <span class="metric-flat-val font-mono">${curPrefix}${dpoc}</span>
          </div>
          <div class="metric-flat-row">
            <span class="metric-flat-name font-mono">Área de Valor (VAH / VAL)</span>
            <span class="metric-flat-val font-mono">${curPrefix}${vah} / ${curPrefix}${val}</span>
          </div>
          <div class="metric-flat-row">
            <span class="metric-flat-name font-mono">Máx. Ayer (PDH)</span>
            <span class="metric-flat-val font-mono">${curPrefix}${pdh}</span>
          </div>
          <div class="metric-flat-row">
            <span class="metric-flat-name font-mono">Mín. Ayer (PDL)</span>
            <span class="metric-flat-val font-mono">${curPrefix}${pdl}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
