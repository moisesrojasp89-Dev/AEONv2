/* ============================================================
   AEON · templates/news.js
   ============================================================ */

export const newsCard = (n) => `
  <article class="news-row" aria-label="${n.title}" data-tag="${n.tag}">
    <div class="news-meta">
      <span class="news-tag ${n.tagClass || ''}">${n.tag}</span>
      <time class="news-time">${n.time || 'Reciente'}</time>
    </div>
    <div class="news-content">
      <h3 class="news-title">${n.title}</h3>
      <p class="news-summary">${n.desc || n.summary}</p>
    </div>
  </article>
`;
