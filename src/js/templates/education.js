/* ============================================================
   AEON · templates/education.js
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

export const eduCard = (item) => `
  <article class="edu-card" aria-label="${escapeHTML(item.title)}">
    <span class="edu-level">${escapeHTML(item.level)}</span>
    <h3 class="edu-title">${escapeHTML(item.title)}</h3>
    <p class="edu-summary">${escapeHTML(item.summary)}</p>
  </article>
`;
