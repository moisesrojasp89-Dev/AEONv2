/* ============================================================
   AEON · templates/analysisCard.js — Terminal Renderer
   Pure Semantic HTML • Zero Inline Styles • XSS Sanitized
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

/**
 * Renderiza la ficha técnica completa del análisis estructural.
 * @param {Object} data - Objeto de datos del activo
 * @returns {string} Markup HTML
 */
export function renderTerminalCard(data = {}) {
  if (!data || !data.symbol) return '';

  const symbol = escapeHTML(data.symbol || '');
  const displayName = escapeHTML(data.display_name || symbol);
  const price = typeof data.current_price === 'number' 
    ? (data.current_price >= 100 ? data.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : data.current_price.toFixed(4))
    : escapeHTML(String(data.current_price || '—'));
  
  const changePct = Number(data.change_24h_pct || 0);
  const changeStr = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
  const changeClass = changePct >= 0 ? 'bullish' : 'bearish';

  const bias = String(data.bias || 'NEUTRAL').toUpperCase();
  const biasClass = bias.includes('BULL') ? 'bullish' : (bias.includes('BEAR') ? 'bearish' : 'neutral');
  const biasLabel = bias.includes('BULL') ? '▲ BULLISH' : (bias.includes('BEAR') ? '▼ BEARISH' : '■ NEUTRAL');

  const sessionLevels = data.session_levels || {};
  const currentSession = escapeHTML(sessionLevels.current_session || 'GLOBAL');
  const ema50 = sessionLevels.ema_50_1h ? Number(sessionLevels.ema_50_1h).toLocaleString('en-US') : '—';
  const vwap = sessionLevels.session_vwap ? Number(sessionLevels.session_vwap).toLocaleString('en-US') : '—';
  const dpoc = sessionLevels.dpoc_price ? Number(sessionLevels.dpoc_price).toLocaleString('en-US') : '—';
  const vah = sessionLevels.vah_price ? Number(sessionLevels.vah_price).toLocaleString('en-US') : '—';
  const val = sessionLevels.val_price ? Number(sessionLevels.val_price).toLocaleString('en-US') : '—';
  const pdh = sessionLevels.pdh ? Number(sessionLevels.pdh).toLocaleString('en-US') : '—';
  const pdl = sessionLevels.pdl ? Number(sessionLevels.pdl).toLocaleString('en-US') : '—';

  // 1. Zonas POI
  const pois = Array.isArray(data.structural_poi) ? data.structural_poi : [];
  const poisMarkup = pois.map(poi => {
    const isSell = String(poi.type || '').toUpperCase().includes('SELL');
    const poiClass = isSell ? 'poi-sell' : 'poi-buy';
    const label = escapeHTML(poi.zone_label || (isSell ? 'ZAP Oferta / Venta' : 'ZAP Demanda / Compra'));
    const rLow = Number(poi.range_low || 0).toLocaleString('en-US');
    const rHigh = Number(poi.range_high || 0).toLocaleString('en-US');
    const confluences = Array.isArray(poi.confluences) ? poi.confluences : [];

    const confMarkup = confluences.map(c => `
      <span class="confluence-chip">${escapeHTML(c)}</span>
    `).join('');

    return `
      <div class="poi-card ${poiClass}">
        <div class="poi-header-row">
          <span class="poi-label">${label}</span>
          <span class="poi-range-badge">$${rLow} – $${rHigh}</span>
        </div>
        <div class="confluence-chips-wrap">
          ${confMarkup}
        </div>
      </div>
    `;
  }).join('');

  // 2. Piscinas de Liquidez ($$$)
  const pools = data.liquidity_pools || {};
  const bsl = Array.isArray(pools.bsl) ? pools.bsl : [];
  const ssl = Array.isArray(pools.ssl) ? pools.ssl : [];

  const bslMarkup = bsl.map(item => `
    <div class="liquidity-item-row">
      <div class="liquidity-label-group">
        <span>🔴 $$$ BSL</span>
        <span>${escapeHTML(item.label || '')}</span>
      </div>
      <span class="liquidity-status-tag ${item.status === 'swept' ? 'swept' : 'unmitigated'}">
        $${Number(item.price || 0).toLocaleString('en-US')} · ${item.status === 'swept' ? 'Barrido ✔' : 'Pendiente'}
      </span>
    </div>
  `).join('');

  const sslMarkup = ssl.map(item => `
    <div class="liquidity-item-row">
      <div class="liquidity-label-group">
        <span>🟢 $$$ SSL</span>
        <span>${escapeHTML(item.label || '')}</span>
      </div>
      <span class="liquidity-status-tag ${item.status === 'swept' ? 'swept' : 'unmitigated'}">
        $${Number(item.price || 0).toLocaleString('en-US')} · ${item.status === 'swept' ? 'Barrido ✔' : 'Pendiente'}
      </span>
    </div>
  `).join('');

  // 3. Escenarios
  const scenarios = data.structural_scenarios || {};
  const bullPath = escapeHTML(scenarios.bullish_path || 'Definiendo confluencia alcista...');
  const bearPath = escapeHTML(scenarios.bearish_path || 'Definiendo confluencia bajista...');
  const invalidation = escapeHTML(scenarios.invalidation_text || `Nivel clave en $${Number(scenarios.invalidation_level || 0).toLocaleString('en-US')}`);

  // 4. Diagnóstico
  const diagnosis = escapeHTML(data.diagnosis || data.macro_driver || 'Analizando estructura...');

  return `
    <div class="terminal-card">
      <!-- Status Strip -->
      <div class="asset-status-strip">
        <div>
          <h2 class="asset-name-title">${displayName}</h2>
          <span class="asset-price-val">$${price}</span>
          <span class="asset-change-val ${changeClass}">${changeStr}</span>
        </div>
        <div class="status-badge-group">
          <span class="bias-tag ${biasClass}">${biasLabel} (${Number(data.bias_score || 50)}%)</span>
          <span class="session-tag">${currentSession}</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="terminal-tabs-nav" role="tablist">
        <button class="terminal-tab-btn active" data-tab="zonas" role="tab" aria-selected="true">🎯 Zonas ZAP</button>
        <button class="terminal-tab-btn" data-tab="escenarios" role="tab" aria-selected="false">🚦 Escenarios</button>
        <button class="terminal-tab-btn" data-tab="detalle" role="tab" aria-selected="false">📖 Detalle</button>
      </div>

      <!-- Panel 1: Zonas ZAP -->
      <div class="tab-content-panel active" id="tab-panel-zonas" role="tabpanel">
        ${poisMarkup}
        
        <div class="liquidity-block">
          <div class="liquidity-block-title">
            ⚡ Piscinas de Liquidez ($$$)
          </div>
          ${bslMarkup}
          ${sslMarkup}
        </div>
      </div>

      <!-- Panel 2: Escenarios -->
      <div class="tab-content-panel" id="tab-panel-escenarios" role="tabpanel">
        <div class="scenario-card bullish">
          <div class="scenario-header">🟢 RUTA ALCISTA</div>
          <p class="scenario-text">${bullPath}</p>
        </div>

        <div class="scenario-card bearish">
          <div class="scenario-header">🔴 RUTA BAJISTA</div>
          <p class="scenario-text">${bearPath}</p>
        </div>

        <div class="invalidation-box">
          <span>⚠️ <strong>Invalidación:</strong></span>
          <span>${invalidation}</span>
        </div>
      </div>

      <!-- Panel 3: Detalle y Métricas -->
      <div class="tab-content-panel" id="tab-panel-detalle" role="tabpanel">
        <p class="diagnosis-text">${diagnosis}</p>

        <div class="metrics-mini-grid">
          <div class="metric-mini-cell">
            <span class="metric-mini-label">EMA 50 (1H)</span>
            <span class="metric-mini-val">$${ema50}</span>
          </div>
          <div class="metric-mini-cell">
            <span class="metric-mini-label">Session VWAP</span>
            <span class="metric-mini-val">$${vwap}</span>
          </div>
          <div class="metric-mini-cell">
            <span class="metric-mini-label">dPOC Diario</span>
            <span class="metric-mini-val">$${dpoc}</span>
          </div>
          <div class="metric-mini-cell">
            <span class="metric-mini-label">Área Valor (VAH / VAL)</span>
            <span class="metric-mini-val">$${vah} / $${val}</span>
          </div>
          <div class="metric-mini-cell">
            <span class="metric-mini-label">Máx. Ayer (PDH)</span>
            <span class="metric-mini-val">$${pdh}</span>
          </div>
          <div class="metric-mini-cell">
            <span class="metric-mini-label">Mín. Ayer (PDL)</span>
            <span class="metric-mini-val">$${pdl}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
