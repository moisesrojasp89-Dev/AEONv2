/* ============================================================
   AEON · templates/news.js
   ============================================================ */

export const newsCard = (n) => `
  <article class="news-card" aria-label="${n.title}">
    <div class="news-meta">
      <span class="news-tag ${n.tagClass}">${n.tag}</span>
      <time class="news-time">${n.time}</time>
    </div>
    <h3 class="news-title">${n.title}</h3>
    <p class="news-summary">${n.summary}</p>
  </article>
`;
