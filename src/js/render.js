/* ============================================================
   AEON · render.js — Orchestrates content rendering
   ============================================================ */

import { newsCard }      from './templates/news.js';
import { marketCard }    from './templates/market.js';
import { signalCard }    from './templates/signal.js';
import { eduCard }       from './templates/education.js';
import { partnerCard }   from './templates/partners.js';
import { tickerBarItem } from './templates/ticker.js';

const TICKER_PX_PER_SEC = 28;

function syncTickerDuration(track) {
  if (!track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const distance = track.scrollWidth / 2;
  if (!distance) return;
  track.style.setProperty('--ticker-duration', `${Math.max(distance / TICKER_PX_PER_SEC, 40)}s`);
}

function fill(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

export function renderNews(news)           { fill('news-list',      news.map(newsCard).join('')); }
export function renderMarketCards(markets) { fill('market-grid',    markets.map(marketCard).join('')); }
export function renderSignals(signals)     { fill('signals-list',   signals.map(signalCard).join('')); }
export function renderEducation(items)     { fill('education-grid', items.map(eduCard).join('')); }
export function renderPartners(partners)   { fill('partners-grid',  partners.map(partnerCard).join('')); }

export function renderPremiumFeatures(features) {
  fill('premium-features', features.map(
    (f) => `<li><span class="feat-check" aria-hidden="true">✓</span>${f}</li>`
  ).join(''));
}

export function renderTickerBar(items) {
  const el = document.getElementById('ticker-track');
  if (!el) return;

  const html = items.map(tickerBarItem).join('');
  el.innerHTML = html + html;

  requestAnimationFrame(() => syncTickerDuration(el));

  if (!el.dataset.tickerBound) {
    el.dataset.tickerBound = '1';
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => syncTickerDuration(el), 150);
    });
  }
}
