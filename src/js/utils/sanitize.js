/* ============================================================
   AEON · utils/sanitize.js — Security & HTML Sanitization
   ============================================================ */

const HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
};

/**
 * Safely escapes HTML special characters from untrusted strings to prevent XSS attacks.
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, char => HTML_ENTITY_MAP[char] || char);
}

/**
 * Validates and sanitizes URLs to prevent javascript: and other dangerous pseudo-protocols.
 * @param {string} url
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('mailto:')) {
    return escapeHTML(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return escapeHTML(trimmed);
    }
  } catch {
    // If URL constructor fails on relative URL, return escaped relative path
    if (/^[a-zA-Z0-9_\-\/\.\?#=&%+]+$/.test(trimmed)) {
      return escapeHTML(trimmed);
    }
  }
  return fallback;
}
