/* ============================================================
   AEON · templates/briefingCard.js — Institutional Terminal Macro Card
   Fase 5: AI Platform & Contextual Intelligence
   Gobernanza: Cero Hardcoding, Single Source of Truth & XSS Guard
   ============================================================ */

import { escapeHTML, sanitizeUrl } from '../utils/sanitize.js';
import { 
  ASSET_BIAS_CONFIG, 
  CATALYST_STATUS_CONFIG, 
  getCurrentMarketSession
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
 * Convierte una hora UTC (ej. "12:30" o "12:30 UTC") a la hora local del dispositivo del usuario.
 * @param {string} utcTimeStr
 * @returns {string} Hora local formateada (ej. "08:30")
 */
function formatToUserLocalTime(utcTimeStr) {
  if (!utcTimeStr || utcTimeStr === '--:--') return '--:--';
  try {
    const cleanTime = String(utcTimeStr).replace(/UTC/gi, '').trim();
    const parts = cleanTime.split(':');
    if (parts.length >= 2) {
      const d = new Date();
      d.setUTCHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  } catch {
    return utcTimeStr;
  }
  return utcTimeStr;
}

/**
 * Renderiza la tarjeta visual completa del Daily Macro Briefing con ciclo de vida de catalizadores y sesión activa dinámica.
 * @param {Object} briefing
 * @returns {string} HTML sanitizado
 */
export function renderBriefingCard(briefing) {
  if (!briefing) return '';

  // Determinar sesión basada de forma estricta en el contenido y metadatos del briefing
  let sessionLabel = 'SESIÓN AMERICANA';
  let sessionStatus = 'WALL STREET & FED';
  let sessionPillClass = 'session-ny-live';

  const sessionKey = String(briefing.session || '').toLowerCase();
  const titleLower = String(briefing.title || '').toLowerCase();

  if (sessionKey === 'london_pre' || sessionKey.includes('london') || titleLower.includes('europea') || titleLower.includes('londres')) {
    sessionLabel = 'SESIÓN EUROPEA';
    sessionStatus = 'LONDRES & BCE';
    sessionPillClass = 'session-london-live';
  } else if (sessionKey.includes('asia') || titleLower.includes('asia') || titleLower.includes('tokio')) {
    sessionLabel = 'SESIÓN ASIA-PACÍFICO';
    sessionStatus = 'TOKIO & SÍDNEY';
    sessionPillClass = 'session-asia';
  } else {
    sessionLabel = 'SESIÓN AMERICANA';
    sessionStatus = 'WALL STREET & FED';
    sessionPillClass = 'session-ny-live';
  }

  const sentiment = briefing.macro_sentiment || { score: 60, label: 'RISK_ON', risk_appetite: 'BULLISH' };
  const sentimentScore = Math.min(Math.max(sentiment.score || 50, 0), 100);
  const isBullishSentiment = sentiment.label === 'RISK_ON' || sentiment.risk_appetite === 'BULLISH';
  const sentimentColor = isBullishSentiment ? '#3dd68c' : '#ff5c6a';

  const assetBias = briefing.asset_bias || {};
  const catalysts = Array.isArray(briefing.catalysts) ? briefing.catalysts : [];
  const imageUrl = sanitizeUrl(briefing.image_url || (sessionLabel === 'SESIÓN EUROPEA' ? 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?q=80&w=1200&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop'));
  const briefingTitle = briefing.title || (sessionLabel === 'SESIÓN EUROPEA' ? 'Sesión Europea: Flujo Institucional y Killzones de Londres' : 'Sesión Americana: Apertura Wall Street y Reacción a Datos Macro');

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

  // Generar Catalizadores con Tira de Terminal Institucional
  const catalystsHtml = catalysts.map(c => {
    const statusKey = String(c.status || (c.actual ? 'live' : 'upcoming')).toLowerCase();
    const statusCfg = CATALYST_STATUS_CONFIG[statusKey] || CATALYST_STATUS_CONFIG.upcoming;
    const impactClass = `impact-${(c.impact || 'MED').toLowerCase()}`;
    const localTime = formatToUserLocalTime(c.time || '--:--');
    
    let dataPillHtml = '';
    if (c.actual) {
      dataPillHtml = `
        <span class="c-data-strip">
          <span class="c-data-val">Act: <strong>${escapeHTML(String(c.actual))}</strong></span>
          <span class="c-data-prev">Prev: ${escapeHTML(String(c.forecast || c.previous || '--'))}</span>
        </span>
      `;
    }

    return `
      <div class="catalyst-strip-row ${escapeHTML(statusCfg.badgeClass)}">
        <div class="c-col-time">
          <span class="c-time">${escapeHTML(localTime)}</span>
          <span class="c-currency">${escapeHTML(c.currency || 'USD')}</span>
        </div>
        <div class="c-col-main">
          <span class="c-event-title">${escapeHTML(c.title || '')}</span>
          ${dataPillHtml}
        </div>
        <div class="c-col-tags">
          <span class="c-impact-pill ${escapeHTML(impactClass)}">${escapeHTML(c.impact || 'MED')}</span>
          <span class="c-status-tag ${escapeHTML(statusCfg.badgeClass)}">${escapeHTML(statusCfg.badgeLabel)}</span>
        </div>
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
            <span class="briefing-pill ${escapeHTML(sessionPillClass)}">${escapeHTML(sessionLabel)}</span>
            <span class="briefing-pill impact-high-pill">${escapeHTML(sessionStatus)}</span>
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

        <!-- Catalizadores de la Jornada en Tira Terminal -->
        ${catalysts.length > 0 ? `
          <section class="briefing-catalysts-section" aria-label="Catalizadores de la Sesión">
            <span class="briefing-section-label">🚨 CATALIZADORES CLAVE DE LA SESIÓN</span>
            <div class="catalyst-strip-table">
              ${catalystsHtml}
            </div>
          </section>
        ` : ''}

        <!-- Tesis Ejecutiva de Terminal -->
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
