/* ============================================================
   AEON · templates/news.js — Clean Terminal News Template
   Gobernanza: Renderizado Seguro, Cero Hardcoding y Semántica Accesible
   ============================================================ */

import { escapeHTML, sanitizeUrl } from '../utils/sanitize.js';

function formatLocalNewsTime(createdStr, fallbackTime) {
  if (createdStr) {
    try {
      const d = new Date(createdStr);
      if (!isNaN(d.getTime())) {
        const diffMs = Date.now() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Hace ${diffHours}h`;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
  }
  if (fallbackTime) {
    // Limpiar 'UTC' y mostrar sólo hora o texto
    return fallbackTime.replace(/\s*UTC/gi, '').trim();
  }
  return 'Reciente';
}

export const newsCard = (n) => {
  const tag = escapeHTML(n.tag || 'MACRO');
  const tagClass = escapeHTML(n.tag_class || n.tagClass || '');
  const title = escapeHTML(n.title || '');
  const time = escapeHTML(formatLocalNewsTime(n.created_at, n.time));
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

  const isExternal = link.startsWith('http://') || link.startsWith('https://');

  return `
    <article class="news-row" aria-label="${title}" data-tag="${tag}">
      <div class="news-meta">
        <span class="news-tag ${tagClass}">${tag}</span>
        <time class="news-time">${time}</time>
      </div>
      <div class="news-content">
        <h3 class="news-title">
          ${isExternal ? `<a href="${link}" target="_blank" rel="noopener noreferrer" class="news-link">${title}</a>` : title}
        </h3>
        <p class="news-summary">${summary}</p>
        ${escapedImpact ? `
          <p class="news-insight-line">
            <span class="insight-label">◆ AEON:</span>
            <span class="insight-text">${escapedImpact}</span>
          </p>
        ` : ''}
      </div>
    </article>
  `;
};



