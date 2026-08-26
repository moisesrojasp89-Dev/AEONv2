/* ============================================================
   AEON · templates/news.js — Real-Time Tactical News Template
   Gobernanza: Renderizado Seguro, Cero Hardcoding y Semántica Accesible
   ============================================================ */

import { escapeHTML, sanitizeUrl } from '../utils/sanitize.js';

export const newsCard = (n) => {
  const tag = escapeHTML(n.tag || 'MACRO');
  const tagClass = escapeHTML(n.tag_class || n.tagClass || '');
  const title = escapeHTML(n.title || '');
  const time = escapeHTML(n.time || 'Reciente');
  const link = sanitizeUrl(n.link || n.url || '#');

  let rawDesc = String(n.desc || n.summary || '');
  let tacticalImpact = n.tactical_impact || '';
  
  if (!tacticalImpact && rawDesc.includes('⚡ IMPACTO:')) {
    const parts = rawDesc.split('⚡ IMPACTO:');
    rawDesc = parts[0].trim();
    tacticalImpact = parts[1].trim();
  }

  const summary = escapeHTML(rawDesc);
  const escapedImpact = escapeHTML(tacticalImpact);

  return `
    <article class="news-row" aria-label="${title}" data-tag="${tag}">
      <div class="news-meta">
        <span class="news-tag ${tagClass}">${tag}</span>
        <time class="news-time">${time}</time>
      </div>
      <div class="news-content">
        <h3 class="news-title">
          ${link !== '#' ? `<a href="${link}" target="_blank" rel="noopener noreferrer" class="news-link">${title}</a>` : title}
        </h3>
        <p class="news-summary">${summary}</p>
        ${escapedImpact ? `
          <div class="news-tactical-reading" aria-label="Lectura Táctica AEON">
            <span class="tactical-badge">⚡ IMPACTO AEON:</span>
            <span class="tactical-text">${escapedImpact}</span>
          </div>
        ` : ''}
      </div>
    </article>
  `;
};

