/* ============================================================
   AEON · components/educationModal.js — Focus Reader Modal
   Singleton Pattern • Accessible (WCAG / ESC) • Zero Leaks
   ============================================================ */

import { escapeHTML } from '../utils/sanitize.js';

let modalRoot = null;
let previousActiveElement = null;
let currentModulePrompt = '';

/**
 * Inicializa el contenedor del modal en el DOM una sola vez (Singleton).
 */
function ensureModalMounted() {
  if (modalRoot) return;

  modalRoot = document.createElement('div');
  modalRoot.id = 'education-modal-root';
  modalRoot.className = 'edu-modal-overlay';
  modalRoot.setAttribute('role', 'dialog');
  modalRoot.setAttribute('aria-modal', 'true');
  modalRoot.setAttribute('aria-hidden', 'true');

  modalRoot.innerHTML = `
    <div class="edu-modal-backdrop" id="edu-modal-backdrop"></div>
    <div class="edu-modal-container" id="edu-modal-container" tabindex="-1">
      <header class="edu-modal-header">
        <div class="edu-modal-meta">
          <span class="edu-level" id="edu-modal-badge"></span>
          <span class="edu-time" id="edu-modal-time"></span>
        </div>
        <button type="button" class="edu-modal-close" id="edu-modal-close" aria-label="Cerrar manual">✕</button>
      </header>

      <div class="edu-modal-title-wrap">
        <h2 class="edu-modal-title" id="edu-modal-title"></h2>
        <p class="edu-modal-subtitle" id="edu-modal-subtitle"></p>
      </div>

      <div class="edu-modal-body" id="edu-modal-body"></div>

      <footer class="edu-modal-footer">
        <button type="button" class="edu-modal-cta-btn" id="edu-modal-cta-btn">
          <span class="cta-sparkle">✦</span>
          <span>Practicar este concepto con el Copiloto IA →</span>
        </button>
      </footer>
    </div>
  `;

  document.body.appendChild(modalRoot);
  bindModalEvents();
}

/**
 * Enlaza los escuchadores de eventos una sola vez (evita duplicación).
 */
function bindModalEvents() {
  const backdrop = document.getElementById('edu-modal-backdrop');
  const closeBtn = document.getElementById('edu-modal-close');
  const ctaBtn = document.getElementById('edu-modal-cta-btn');

  backdrop?.addEventListener('click', closeEducationModal);
  closeBtn?.addEventListener('click', closeEducationModal);

  ctaBtn?.addEventListener('click', () => {
    const promptToOpen = currentModulePrompt;
    closeEducationModal();
    if (typeof window.openAeonChatWithPrompt === 'function' && promptToOpen) {
      window.openAeonChatWithPrompt(promptToOpen);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen()) {
      closeEducationModal();
    }
  });
}

function isModalOpen() {
  return modalRoot?.classList.contains('active') || false;
}

/**
 * Abre el Focus Reader Modal con los datos del módulo.
 * @param {Object} module - Objeto del módulo educativo
 */
export function openEducationModal(module) {
  if (!module) return;
  ensureModalMounted();

  previousActiveElement = document.activeElement;
  currentModulePrompt = module.aiPrompt || '';

  // 1. Asignar encabezados
  const badgeEl = document.getElementById('edu-modal-badge');
  const timeEl = document.getElementById('edu-modal-time');
  const titleEl = document.getElementById('edu-modal-title');
  const subtitleEl = document.getElementById('edu-modal-subtitle');
  const bodyEl = document.getElementById('edu-modal-body');
  const container = document.getElementById('edu-modal-container');

  if (badgeEl) {
    badgeEl.className = `edu-level ${escapeHTML(module.badgeClass || '')}`;
    badgeEl.textContent = module.level || '';
  }
  if (timeEl) timeEl.textContent = module.readTime || '';
  if (titleEl) titleEl.textContent = module.title || '';
  if (subtitleEl) subtitleEl.textContent = module.subtitle || '';

  // 2. Renderizar secciones didácticas (3 bloques)
  if (bodyEl && Array.isArray(module.sections)) {
    bodyEl.innerHTML = module.sections.map((sec, idx) => {
      const heading = escapeHTML(sec.heading || '');
      const retailError = escapeHTML(sec.retailError || '');
      const keyRule = escapeHTML(sec.keyRule || '');

      let methodHtml = '';
      if (Array.isArray(sec.institutionalMethod)) {
        methodHtml = `<ul class="edu-method-list">${sec.institutionalMethod.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
      } else if (sec.institutionalMethod) {
        methodHtml = `<p class="edu-method-text">${escapeHTML(sec.institutionalMethod)}</p>`;
      }

      return `
        <section class="edu-modal-section" aria-labelledby="edu-sec-${idx}">
          <h3 class="edu-section-heading" id="edu-sec-${idx}">${heading}</h3>

          <!-- Bloque 1: El Error Típico del Retail -->
          <div class="edu-block-retail">
            <div class="edu-block-header">
              <span class="edu-block-tag tag-retail">El Error Típico del Retail</span>
            </div>
            <p class="edu-block-content">${retailError}</p>
          </div>

          <!-- Bloque 2: El Método Institucional AEON -->
          <div class="edu-block-method">
            <div class="edu-block-header">
              <span class="edu-block-tag tag-method">El Método Institucional AEON</span>
            </div>
            ${methodHtml}
          </div>

          <!-- Bloque 3: La Regla de Oro -->
          <div class="edu-block-golden">
            <div class="edu-block-header">
              <span class="edu-block-tag tag-golden">★ Regla de Oro Institucional</span>
            </div>
            <p class="edu-golden-text">${keyRule}</p>
          </div>
        </section>
      `;
    }).join('');
  }

  // 3. Activar y gestionar foco
  modalRoot.classList.add('active');
  modalRoot.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    container?.focus();
  }, 50);
}

/**
 * Cierra el modal y restablece el foco y scroll.
 */
export function closeEducationModal() {
  if (!modalRoot || !isModalOpen()) return;

  modalRoot.classList.remove('active');
  modalRoot.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    previousActiveElement.focus();
    previousActiveElement = null;
  }
}
