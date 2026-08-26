/* ============================================================
   AEON · templates/briefingCard.js — Visual Institutional Macro Card
   Fase 5: AI Platform & Contextual Intelligence
   Gobernanza: Cero Hardcoding, Single Source of Truth & XSS Guard
   ============================================================ */

import { escapeHTML, sanitizeUrl } from '../utils/sanitize.js';
import { 
  ASSET_BIAS_CONFIG, 
  CATALYST_STATUS_CONFIG, 
  BRIEFING_SESSIONS_CONFIG, 
  BRIEFING_SESSIONS 
} from '../config/constants.js';

const ASSET_LABELS = {
  XAUUSD: '🪙 XAU/USD',
  EURUSD: '🇪🇺 EUR/USD',
  GBPUSD: '🇬🇧 GBP/USD',
  DXY: '🇺🇸 DXY (Dólar)',
  SPX500: '📈 S&P 500',
  NAS100: '💻 NASDAQ',
  BTC: '₿ Bitcoin',
};

/**
 * Renderiza la tarjeta visual completa del Daily Macro Briefing con ciclo de vida de catalizadores.
 * @param {Object} briefing
 * @returns {string} HTML sanitizado
 */
export function renderBriefingCard(briefing) {
  if (!briefing) return '';

  const sessionId = briefing.session_id || BRIEFING_SESSIONS.LONDON_PRE;
  const sessionConfig = BRIEFING_SESSIONS_CONFIG[sessionId] || BRIEFING_SESSIONS_CONFIG[BRIEFING_SESSIONS.LONDON_PRE];
  
  const sentiment = briefing.macro_sentiment || { score: 60, label: 'RISK_ON', risk_appetite: 'BULLISH' };
  const sentimentScore = Math.min(Math.max(sentiment.score || 50, 0), 100);
  const isBullishSentiment = sentiment.label === 'RISK_ON' || sentiment.risk_appetite === 'BULLISH';
  const sentimentColor = isBullishSentiment ? '#3dd68c' : '#ff5c6a';

  const assetBias = briefing.asset_bias || {};
  const catalysts = Array.isArray(briefing.catalysts) ? briefing.catalysts : [];
  const imageUrl = sanitizeUrl(briefing.image_url || sessionConfig.defaultCover);
  const briefingTitle = briefing.title || sessionConfig.defaultTitle;

  // Generar Chips de Radar desde constants.js
  const radarChipsHtml = Object.entries(assetBias).map(([asset, bias]) => {
    const assetLabel = ASSET_LABELS[asset] || escapeHTML(asset);
    const biasKey = String(bias || 'NEUTRAL').toUpperCase();
    const config = ASSET_BIAS_CONFIG[biasKey] || ASSET_BIAS_CONFIG.NEUTRAL;
    return `
      <div class="briefing-radar-chip" style="background: ${config.bg}; border: 1px solid ${config.border}; color: ${config.textColor};">
        <span class="radar-chip-symbol">${assetLabel}</span>
        <span class="radar-chip-bias">${escapeHTML(config.label)}</span>
      </div>
    `;
  }).join('');

  // Generar Catalizadores con Ciclo de Vida Dinámico
  const catalystsHtml = catalysts.map(c => {
    const statusKey = String(c.status || (c.actual ? 'live' : 'upcoming')).toLowerCase();
    const statusCfg = CATALYST_STATUS_CONFIG[statusKey] || CATALYST_STATUS_CONFIG.upcoming;
    const impactClass = `impact-${(c.impact || 'MED').toLowerCase()}`;
    
    let dataPillHtml = '';
    if (c.actual) {
      dataPillHtml = `
        <span class="catalyst-actual-box">
          <strong class="c-actual">Act: ${escapeHTML(String(c.actual))}</strong>
          <span class="c-prev">Prev: ${escapeHTML(String(c.forecast || c.previous || '--'))}</span>
        </span>
      `;
    }

    return `
      <div class="briefing-catalyst-item ${escapeHTML(statusCfg.badgeClass)}">
        <span class="catalyst-time">${escapeHTML(c.time || '--:--')} UTC</span>
        <span class="catalyst-currency">${escapeHTML(c.currency || 'ALL')}</span>
        <span class="catalyst-title">${escapeHTML(c.title || '')}</span>
        ${dataPillHtml}
        <span class="catalyst-badge ${escapeHTML(impactClass)}">${escapeHTML(c.impact || 'MED')}</span>
        <span class="catalyst-status-pill ${escapeHTML(statusCfg.badgeClass)}">${escapeHTML(statusCfg.badgeLabel)}</span>
      </div>
    `;
  }).join('');

  return `
    <article class="briefing-hero-card" role="region" aria-label="Daily Macro Briefing">
      <!-- Cabecera Visual con Imagen y Degradado -->
      <header class="briefing-cover-wrapper" style="background-image: url('${imageUrl}');">
        <div class="briefing-cover-overlay"></div>
        <div class="briefing-cover-content">
          <div class="briefing-badges-row">
            <span class="briefing-pill ${escapeHTML(sessionConfig.pillClass)}">${escapeHTML(sessionConfig.label)}</span>
            <span class="briefing-pill impact-high-pill">🔴 SESIÓN CLAVE</span>
            <time class="briefing-date">${escapeHTML(briefing.date || '')}</time>
          </div>
          <h3 class="briefing-main-title">${escapeHTML(briefingTitle)}</h3>
        </div>
      </header>

      <!-- Cuerpo del Briefing -->
      <div class="briefing-body">
        
        <!-- Termómetro de Sentimiento Macroeconómico -->
        <section class="briefing-sentiment-box" aria-label="Sentimiento Institucional">
          <div class="sentiment-box-header">
            <span class="sentiment-title">🧭 SENTIMIENTO MACRO INSTITUCIONAL</span>
            <span class="sentiment-badge" style="color: ${sentimentColor};">${escapeHTML(sentiment.label)} (${sentimentScore}%)</span>
          </div>
          <div class="sentiment-progress-track" role="progressbar" aria-valuenow="${sentimentScore}" aria-valuemin="0" aria-valuemax="100">
            <div class="sentiment-progress-bar" style="width: ${sentimentScore}%; background: linear-gradient(90deg, #0ea5e9, ${sentimentColor});"></div>
          </div>
        </section>

        <!-- Radar de Sesgo por Activo -->
        <section class="briefing-radar-section" aria-label="Radar de Sesgos">
          <span class="briefing-section-label">RADAR DE SESGO POR ACTIVO</span>
          <div class="briefing-radar-grid">
            ${radarChipsHtml}
          </div>
        </section>

        <!-- Catalizadores de la Jornada -->
        ${catalysts.length > 0 ? `
          <section class="briefing-catalysts-section" aria-label="Catalizadores de la Sesión">
            <span class="briefing-section-label">🚨 CATALIZADORES CLAVE DE LA SESIÓN</span>
            <div class="briefing-catalysts-list">
              ${catalystsHtml}
            </div>
          </section>
        ` : ''}

        <!-- Tesis Ejecutiva -->
        <section class="briefing-thesis-box" aria-label="Tesis Macroeconómica">
          <div class="thesis-header">
            <span class="thesis-icon" aria-hidden="true">💡</span>
            <span class="thesis-label">TESIS MACROECONÓMICA EJECUTIVA</span>
          </div>
          <p class="thesis-text">${escapeHTML(briefing.executive_thesis || '')}</p>
        </section>

      </div>
    </article>
  `;
}
