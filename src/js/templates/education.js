/* ============================================================
   AEON · templates/education.js
   ============================================================ */

export const eduCard = (item) => `
  <article class="edu-card" aria-label="${item.title}">
    <span class="edu-level">${item.level}</span>
    <h3 class="edu-title">${item.title}</h3>
    <p class="edu-summary">${item.summary}</p>
  </article>
`;
