/* ============================================================
   AEON · templates/partners.js
   ============================================================ */

export const partnerCard = (p) => `
  <a class="partner-card" href="${p.url}" aria-label="${p.name}">
    <span class="partner-mark" aria-hidden="true">${p.initials}</span>
    <span class="partner-name">${p.name}</span>
  </a>
`;
