/* ============================================================
   AEON · render.js — Orchestrates content rendering
   ============================================================ */

import { newsCard }                  from './templates/news.js';
import { renderBriefingCard }          from './templates/briefingCard.js';
import { marketCard }                from './templates/market.js';
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
