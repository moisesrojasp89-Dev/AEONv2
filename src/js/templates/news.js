/* ============================================================
   AEON · templates/news.js
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

export const newsCard = (n) => `
  <article class="news-row" aria-label="${escapeHTML(n.title)}" data-tag="${escapeHTML(n.tag)}">
    <div class="news-meta">
      <span class="news-tag ${escapeHTML(n.tagClass || '')}">${escapeHTML(n.tag)}</span>
      <time class="news-time">${escapeHTML(n.time || 'Reciente')}</time>
    </div>
    <div class="news-content">
      <h3 class="news-title">${escapeHTML(n.title)}</h3>
      <p class="news-summary">${escapeHTML(n.desc || n.summary)}</p>
    </div>
  </article>
`;
