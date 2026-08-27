/* ============================================================
   AEON · templates/marketCard.js — Institutional Market Intel Card
   Terminal de Mercados (14 Activos Globales)
   Gobernanza: Sanitización XSS, Glassmorphism, Zero Hardcode
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

const ASSET_ICONS = {
  SPX500: '🇺🇸',
  NAS100: '🇺🇸',
  US30:   '🇺🇸',
  JP225:  '🇯🇵',
  XAUUSD: '🪙',
  BTCUSD: '₿',
  DXY:    '🇺🇸',
  EURUSD: '🇪🇺',
  USDJPY: '🇯🇵',
  GBPUSD: '🇬🇧',
  USDCAD: '🇨🇦',
  AUDUSD: '🇦🇺',
  NZDUSD: '🇳🇿',
  USDCHF: '🇨🇭',
};

/**
 * Renderiza la tarjeta visual completa de un activo de mercado.
 * @param {Object} m Datos del activo desde public.market_intelligence
 * @returns {string} HTML sanitizado
 */
export function renderMarketCard(m) {
  if (!m) return '';

  const symbol = escapeHTML(m.symbol || '');
  const displayName = escapeHTML(m.display_name || symbol);
  const icon = ASSET_ICONS[m.symbol] || '📈';
  const category = escapeHTML(m.category || 'FOREX');
  
  const currentPrice = Number(m.current_price || 0).toLocaleString('en-US', {
    minimumFractionDigits: m.decimals !== undefined ? m.decimals : (m.symbol === 'EURUSD' || m.symbol === 'GBPUSD' || m.symbol === 'USDCAD' || m.symbol === 'AUDUSD' || m.symbol === 'NZDUSD' || m.symbol === 'USDCHF' ? 5 : 2),
    maximumFractionDigits: 5
  });

  const change24h = Number(m.change_24h_pct || 0);
  const isPositiveChange = change24h >= 0;
  const changeBadgeClass = isPositiveChange ? 'text-green' : 'text-red';
  const changePrefix = isPositiveChange ? '+' : '';
  const changeIcon = isPositiveChange ? '▲' : '▼';

  const bias = String(m.bias || 'NEUTRAL').toUpperCase();
  const biasScore = Math.min(Math.max(Number(m.bias_score || 50), 0), 100);

  let biasBadgeColor = 'var(--yellow)';
  let biasBgColor = 'rgba(234, 179, 8, 0.12)';
  let biasBorderColor = 'rgba(234, 179, 8, 0.3)';
  let biasText = 'NEUTRAL';
  let biasDot = '⚪';

  if (bias === 'BULLISH') {
    biasBadgeColor = 'var(--green)';
    biasBgColor = 'rgba(61, 214, 140, 0.12)';
    biasBorderColor = 'rgba(61, 214, 140, 0.3)';
    biasText = 'ALCISTA';
    biasDot = '🟢';
  } else if (bias === 'BEARISH') {
    biasBadgeColor = 'var(--red)';
    biasBgColor = 'rgba(255, 92, 106, 0.12)';
    biasBorderColor = 'rgba(255, 92, 106, 0.3)';
    biasText = 'BAJISTA';
    biasDot = '🔴';
  }

  const s1 = Number(m.support_1 || 0);
  const r1 = Number(m.resistance_1 || 0);
  const dpoc = Number(m.dpoc_price || 0);
  const vwap = Number(m.session_vwap || 0);

  // Cálculo de posición en barra de rango
  let rangePct = 50;
  if (r1 > s1 && m.current_price) {
    rangePct = Math.min(Math.max(((Number(m.current_price) - s1) / (r1 - s1)) * 100, 5), 95);
  }

  const macroDriver = escapeHTML(m.macro_driver || 'Sin catalizador macro relevante.');
  const technicalThesis = escapeHTML(m.technical_thesis || 'Consolidación técnica en rango.');

  let tagsHTML = '';
  if (Array.isArray(m.catalyst_tags)) {
    tagsHTML = m.catalyst_tags.map(t => `<span class="market-tag">#${escapeHTML(t)}</span>`).join(' ');
  }

  return `
    <article class="market-card glass-panel" data-symbol="${symbol}" data-category="${category}">
      <!-- Cabecera de la Tarjeta -->
      <div class="market-card-header">
        <div class="market-asset-info">
          <span class="market-icon">${icon}</span>
          <div>
            <h3 class="market-title">${displayName}</h3>
            <span class="market-ticker">${symbol} • ${category}</span>
          </div>
        </div>
        <div class="market-price-box">
          <div class="market-price font-mono">${currentPrice}</div>
          <div class="market-change font-mono ${changeBadgeClass}">
            ${changeIcon} ${changePrefix}${change24h.toFixed(2)}%
          </div>
        </div>
      </div>

      <!-- Insignia de Sesgo Institucional -->
      <div class="market-bias-row">
        <div class="market-bias-badge" style="background:${biasBgColor}; border:1px solid ${biasBorderColor}; color:${biasBadgeColor};">
          <span>${biasDot} ${biasText}</span>
          <span class="font-mono font-bold">${biasScore}%</span>
        </div>
        <div class="market-session-tag font-mono">
          <span>ORIGEN: ${escapeHTML(m.session_origin || 'GLOBAL')}</span>
        </div>
      </div>

      <!-- Rango Microestructural Visual (S1 / dPOC / R1) -->
      <div class="market-levels-box">
        <div class="market-levels-header font-mono">
          <span class="text-green">S1: ${s1}</span>
          <span class="text-accent">dPOC: ${dpoc}</span>
          <span class="text-red">R1: ${r1}</span>
        </div>
        <div class="market-range-track">
          <div class="market-range-fill" style="width: ${rangePct}%;"></div>
          <div class="market-range-thumb" style="left: ${rangePct}%;"></div>
        </div>
        <div class="market-vwap-note font-mono">
          <span>Session VWAP: <strong>${vwap}</strong></span>
        </div>
      </div>

      <!-- Síntesis AEON Real Intelligence -->
      <div class="market-thesis-box">
        <div class="market-thesis-label">
          <span class="aeon-sparkle">✨</span> AEON Real Intelligence
        </div>
        <p class="market-macro-text">${macroDriver}</p>
        <p class="market-tech-text">${technicalThesis}</p>
        ${tagsHTML ? `<div class="market-tags-row font-mono">${tagsHTML}</div>` : ''}
      </div>
    </article>
  `;
}
