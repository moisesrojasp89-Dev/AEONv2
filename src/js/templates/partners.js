/* ============================================================
   AEON · templates/partners.js
   ============================================================ */

import { escapeHTML, sanitizeUrl } from '../utils/sanitize.js';

export const partnerCard = (p) => `
  <a class="partner-card" href="${sanitizeUrl(p.url)}" aria-label="${escapeHTML(p.name)}">
    <span class="partner-mark" aria-hidden="true">${escapeHTML(p.initials)}</span>
    <span class="partner-name">${escapeHTML(p.name)}</span>
  </a>
`;
