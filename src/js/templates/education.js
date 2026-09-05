/* ============================================================
   AEON · templates/education.js
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

export const eduCard = (item) => `
  <article 
    class="edu-card" 
    data-edu-id="${escapeHTML(item.id || '')}"
    role="button" 
    tabindex="0"
    aria-label="${escapeHTML(item.title || '')} - ${escapeHTML(item.readTime || '')}"
  >
    <div class="edu-card-top">
      <span class="edu-level ${escapeHTML(item.badgeClass || '')}">${escapeHTML(item.level || '')}</span>
      <span class="edu-time">${escapeHTML(item.readTime || '')}</span>
    </div>
    <h3 class="edu-title">${escapeHTML(item.title || '')}</h3>
    <p class="edu-summary">${escapeHTML(item.summary || '')}</p>
    <div class="edu-card-footer">
      <span class="edu-cta-hint">Abrir Manual Operativo →</span>
    </div>
  </article>
`;
