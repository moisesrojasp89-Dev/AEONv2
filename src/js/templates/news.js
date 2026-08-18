/* ============================================================
   AEON · templates/news.js
   ============================================================ */

const escape = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag]));
};

export const newsCard = (n) => `
  <article class="news-row" aria-label="${escape(n.title)}" data-tag="${escape(n.tag)}">
    <div class="news-meta">
      <span class="news-tag ${escape(n.tagClass || '')}">${escape(n.tag)}</span>
      <time class="news-time">${escape(n.time || 'Reciente')}</time>
    </div>
    <div class="news-content">
      <h3 class="news-title">${escape(n.title)}</h3>
      <p class="news-summary">${escape(n.desc || n.summary)}</p>
    </div>
  </article>
`;
