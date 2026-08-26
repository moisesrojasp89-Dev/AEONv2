/* ============================================================
   AEON · templates/briefingCard.js — Visual Institutional Macro Card
   Fase 5: AI Platform & Contextual Intelligence
   ============================================================ */

import { escapeHTML, sanitizeUrl } from '../utils/sanitize.js';

const ASSET_ICONS = {
  XAUUSD: '🪙 XAU/USD',
  EURUSD: '🇪🇺 EUR/USD',
  GBPUSD: '🇬🇧 GBP/USD',
  DXY: '🇺🇸 DXY (Dólar)',
  SPX500: '📈 S&P 500',
  NAS100: '💻 NASDAQ',
  BTC: '₿ Bitcoin',
};

const BIAS_COLORS = {
  BULLISH: { bg: 'rgba(0, 255, 136, 0.12)', border: 'rgba(0, 255, 136, 0.35)', text: '#00ff88', icon: '▲' },
  BEARISH: { bg: 'rgba(255, 68, 102, 0.12)', border: 'rgba(255, 68, 102, 0.35)', text: '#ff4466', icon: '▼' },
  NEUTRAL: { bg: 'rgba(160, 174, 192, 0.12)', border: 'rgba(160, 174, 192, 0.35)', text: '#a0aec0', icon: '■' },
};

/**
 * Renderiza la tarjeta visual completa del Daily Macro Briefing.
 * @param {Object} briefing
 * @returns {string} HTML sanitizado
 */
export function renderBriefingCard(briefing) {
  if (!briefing) return '';

  const isLondon = (briefing.session_id === 'london_pre');
  const sessionBadge = isLondon ? '☕ PRE-LONDRES' : '🗽 PRE-NUEVA YORK';
  const sessionTime = isLondon ? '06:00 UTC' : '12:30 UTC';
  
  const sentiment = briefing.macro_sentiment || { score: 60, label: 'RISK_ON', risk_appetite: 'BULLISH' };
  const sentimentScore = Math.min(Math.max(sentiment.score || 50, 0), 100);
  const isBullishSentiment = sentiment.label === 'RISK_ON' || sentiment.risk_appetite === 'BULLISH';
  const sentimentColor = isBullishSentiment ? '#00ff88' : '#ff4466';

  const assetBias = briefing.asset_bias || {};
  const catalysts = Array.isArray(briefing.catalysts) ? briefing.catalysts : [];
  const imageUrl = sanitizeUrl(briefing.image_url || 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?q=80&w=1200&auto=format&fit=crop');

  // Generar Chips de Radar
  const radarChipsHtml = Object.entries(assetBias).map(([asset, bias]) => {
    const assetLabel = ASSET_ICONS[asset] || escapeHTML(asset);
    const style = BIAS_COLORS[bias] || BIAS_COLORS.NEUTRAL;
    return `
      <div class="briefing-radar-chip" style="background: ${style.bg}; border: 1px solid ${style.border}; color: ${style.text};">
        <span class="radar-chip-symbol">${assetLabel}</span>
        <span class="radar-chip-bias">${style.icon} ${escapeHTML(bias)}</span>
      </div>
    `;
  }).join('');

  // Generar Catalizadores
  const catalystsHtml = catalysts.map(c => `
    <div class="briefing-catalyst-item">
      <span class="catalyst-time">${escapeHTML(c.time || '--:--')} UTC</span>
      <span class="catalyst-currency">${escapeHTML(c.currency || 'ALL')}</span>
      <span class="catalyst-title">${escapeHTML(c.title || '')}</span>
      <span class="catalyst-badge impact-${(c.impact || 'MED').toLowerCase()}">${escapeHTML(c.impact || 'MED')}</span>
    </div>
  `).join('');

  return `
    <article class="briefing-hero-card" role="region" aria-label="Daily Macro Briefing">
      <!-- Cabecera Visual con Imagen y Degradado -->
      <div class="briefing-cover-wrapper" style="background-image: url('${imageUrl}');">
        <div class="briefing-cover-overlay"></div>
        <div class="briefing-cover-content">
          <div class="briefing-badges-row">
            <span class="briefing-pill session-pill">${sessionBadge} · ${sessionTime}</span>
            <span class="briefing-pill impact-high-pill">🔴 SESIÓN CLAVE</span>
            <span class="briefing-date">${escapeHTML(briefing.date)}</span>
          </div>
          <h3 class="briefing-main-title">${escapeHTML(briefing.title)}</h3>
        </div>
      </div>

      <!-- Cuerpo del Briefing -->
      <div class="briefing-body">
        
        <!-- Termómetro de Sentimiento Macroeconómico -->
        <div class="briefing-sentiment-box">
          <div class="sentiment-box-header">
            <span class="sentiment-title">🧭 SENTIMIENTO MACRO INSTITUCIONAL</span>
            <span class="sentiment-badge" style="color: ${sentimentColor};">${escapeHTML(sentiment.label)} (${sentimentScore}%)</span>
          </div>
          <div class="sentiment-progress-track">
            <div class="sentiment-progress-bar" style="width: ${sentimentScore}%; background: linear-gradient(90deg, #0ea5e9, ${sentimentColor});"></div>
          </div>
        </div>

        <!-- Radar de Sesgo por Activo -->
        <div class="briefing-radar-section">
          <span class="briefing-section-label">RADAR DE SESGO POR ACTIVO</span>
          <div class="briefing-radar-grid">
            ${radarChipsHtml}
          </div>
        </div>

        <!-- Catalizadores de la Jornada -->
        ${catalysts.length > 0 ? `
          <div class="briefing-catalysts-section">
            <span class="briefing-section-label">🚨 CATALIZADORES CLAVE DE LA SESIÓN</span>
            <div class="briefing-catalysts-list">
              ${catalystsHtml}
            </div>
          </div>
        ` : ''}

        <!-- Tesis Ejecutiva -->
        <div class="briefing-thesis-box">
          <div class="thesis-header">
            <span class="thesis-icon">💡</span>
            <span class="thesis-label">TESIS MACROECONÓMICA EJECUTIVA</span>
          </div>
          <p class="thesis-text">${escapeHTML(briefing.executive_thesis)}</p>
        </div>

      </div>
    </article>
  `;
}
