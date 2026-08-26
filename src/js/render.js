/* ============================================================
   AEON · render.js — Orchestrates content rendering
   ============================================================ */

import { newsCard }                  from './templates/news.js';
import { renderBriefingCard }          from './templates/briefingCard.js';
import { marketCard }                from './templates/market.js';
import { signalCard, closedSignalCard } from './templates/signal.js';
import { eduCard }                   from './templates/education.js';
import { tickerBarItem }             from './templates/ticker.js';
import { escapeHTML }                from './utils/sanitize.js';

function fill(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

export function renderBriefing(briefing)   { fill('briefing-card-container', renderBriefingCard(briefing)); }
export function renderNews(news)           { fill('news-list',      news.map(newsCard).join('')); }
export function renderMarketCards(markets) { fill('market-grid',    markets.map(marketCard).join('')); }

export function renderSignals(signals, currentUser, isPro) { 
  if (!signals || signals.length === 0) {
    fill('signals-list', `
      <div class="signals-empty">
        <div class="empty-badge">Radar Cuantitativo Activo</div>
        <h3>Escaneando Killzones de Liquidez</h3>
        <p>El motor adaptativo está monitoreando en vivo los Puntos de Control (POC), Session VWAP y confluencias en las sesiones de Londres y Nueva York. Próxima emisión de alta probabilidad en radar.</p>
      </div>
    `);
    return;
  }
  fill('signals-list', signals.map(s => signalCard(s, currentUser, isPro)).join('')); 
}

export function renderSignalHistory(historySignals) {
  if (!historySignals || historySignals.length === 0) {
    fill('signals-list', `
      <div class="signals-empty">
        <div class="empty-badge">Historial en Inicialización</div>
        <h3>Track Record Auditado en Marcha</h3>
        <p>Los trades cerrados por el Trade Watcher de AEON se registrarán aquí automáticamente con precio de salida, R realizado y resultado final.</p>
      </div>
    `);
    return;
  }
  fill('signals-list', historySignals.map(s => closedSignalCard(s)).join(''));
}

export function renderKPIBar(mode = 'live', metrics = {}) {
  const container = document.getElementById('signals-kpi-bar');
  if (!container) return;

  if (mode === 'live') {
    container.innerHTML = `
      <div class="kpi-item">
        <span class="kpi-lbl">Ratio R:R Objetivo</span>
        <span class="kpi-val highlight">1:2.0 – 1:3.0</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-lbl">Gestión de Riesgo</span>
        <span class="kpi-val">Break-Even en 1.5R</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-lbl">Timeframes Operados</span>
        <span class="kpi-val">M5 Scalp / M15 Day</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-lbl">Frecuencia / Disciplina</span>
        <span class="kpi-val">1 – 3 setups / día</span>
      </div>
    `;
  } else {
    // Mode History / Track Record
    const winRate = metrics.winRate || '0.0%';
    const pf = metrics.profitFactor || '0.00';
    const avgR = metrics.avgR || '2.50';
    const totalR = metrics.totalR || '+0.0R';
    const wonCount = metrics.won || 0;
    const lostCount = metrics.lost || 0;
    const beCount = metrics.be || 0;

    container.innerHTML = `
      <div class="kpi-item">
        <span class="kpi-lbl">Tasa de Acierto (Win Rate)</span>
        <span class="kpi-val green">${escapeHTML(winRate)} <small style="font-size: 0.68rem; color: var(--muted-2); font-weight: normal;">(${wonCount}W / ${lostCount}L / ${beCount}BE)</small></span>
      </div>
      <div class="kpi-item">
        <span class="kpi-lbl">Profit Factor Auditado</span>
        <span class="kpi-val highlight">${escapeHTML(pf)}</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-lbl">R:R Promedio Realizado</span>
        <span class="kpi-val">1:${escapeHTML(avgR)}</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-lbl">Rendimiento Neto Acumulado</span>
        <span class="kpi-val highlight">${escapeHTML(totalR)}</span>
      </div>
    `;
  }
}

export function renderEducation(items)     { fill('education-grid', items.map(eduCard).join('')); }

export function renderPremiumFeatures(features) {
  fill('premium-features', features.map(
    (f) => `<li><span class="feat-check" aria-hidden="true">✓</span>${escapeHTML(f)}</li>`
  ).join(''));
}

export function renderTickerBar(items) {
  const el = document.getElementById('ticker-track');
  if (!el) return;

  const html = items.map(tickerBarItem).join('');
  el.innerHTML = html + html;
  el.style.animationDuration = '180s';
}
