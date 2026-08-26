/* ============================================================
   AEON · templates/news.js — Institutional News & Intelligence Card
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
          <div class="news-intelligence-box" aria-label="AEON Intelligence">
            <div class="intel-header">
              <span class="intel-badge">◆ AEON INTELLIGENCE</span>
              <span class="intel-type">ANÁLISIS INSTITUCIONAL</span>
            </div>
            <p class="intel-text">${escapedImpact}</p>
          </div>
        ` : ''}
      </div>
    </article>
  `;
};


