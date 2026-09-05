/* ============================================================
   AEON · components/chatWidget.js — Institutional AI Chat Widget
   Zero-Trust Client Rendering • Anti-XSS • Multimodal V3
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';
import { escapeHTML } from '../utils/sanitize.js';
import {
  sendChatMessage,
  getStoredHistory,
  saveHistory,
  clearStoredHistory,
  abortActiveRequest,
  fetchUserAiQuota,
} from '../services/chatService.js';

let isChatOpen = false;
let isSubmitting = false;
let cooldownInterval = null;
let currentQuota = { remaining: 50, total: 50 };
let currentAttachedImage = null; // { mimeType: string, data: string, previewUrl: string, name: string, sizeKb: number }

/**
 * Determina el estado de autenticación y nivel del usuario.
 * @returns {Promise<{ state: 'guest' | 'free' | 'pro', email?: string }>}
 */
async function getUserAccessState() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user) return { state: 'guest' };

    // Validar si el usuario aún existe en el servidor Supabase
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      await supabase.auth.signOut();
      return { state: 'guest' };
    }

    // Consultar tabla profiles para tier
    const { data: profile } = await supabase
      .from(DB_TABLES.PROFILES)
      .select('tier')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile?.tier === 'pro' || profile?.tier === 'institutional') {
      return { state: 'pro', email: session.user.email };
    }

    // Fallback opcional a subscriptions
    const { data: sub } = await supabase
      .from(DB_TABLES.SUBSCRIPTIONS)
      .select('plan, status, current_period_end')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (sub && (sub.plan === 'pro' || sub.plan === 'institutional')) {
      const isValid = !sub.current_period_end || new Date(sub.current_period_end) >= new Date();
      if (isValid) return { state: 'pro', email: session.user.email };
    }

    return { state: 'free', email: session.user.email };
  } catch (_) {
    return { state: 'guest' };
  }
}

/**
 * Procesa y comprime una imagen en cliente mediante HTML5 Canvas (<50ms).
 * @param {File} file
 */
function compressAndAttachImage(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 1600;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.85);
      const base64Data = dataUrl.split(',')[1];
      const sizeKb = Math.round((base64Data.length * 3) / 4 / 1024);

      currentAttachedImage = {
        mimeType: mimeType,
        data: base64Data,
        previewUrl: dataUrl,
        name: file.name || 'captura_grafico.jpg',
        sizeKb: sizeKb,
      };

      renderAttachedImagePreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Muestra u oculta la barra flotante de preview de imagen.
 */
function renderAttachedImagePreview() {
  const previewBar = document.getElementById('chat-image-preview-bar');
  const previewImg = document.getElementById('chat-preview-img');
  const previewName = document.getElementById('chat-preview-name');
  const previewSize = document.getElementById('chat-preview-size');

  if (!previewBar) return;

  if (currentAttachedImage) {
    if (previewImg) previewImg.src = currentAttachedImage.previewUrl;
    if (previewName) previewName.textContent = currentAttachedImage.name;
    if (previewSize) previewSize.textContent = `${currentAttachedImage.sizeKb} KB`;
    previewBar.style.display = 'flex';
  } else {
    previewBar.style.display = 'none';
    if (previewImg) previewImg.src = '';
  }
}

/**
 * Limpia la imagen adjunta actual.
 */
function clearAttachedImage() {
  currentAttachedImage = null;
  renderAttachedImagePreview();
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.value = '';
}

/**
 * Renderiza el markup base del widget en el DOM.
 */
export async function initChatWidget() {
  if (document.getElementById('aeon-chat-root')) return;

  const root = document.createElement('div');
  root.id = 'aeon-chat-root';
  root.innerHTML = `
    <!-- Floating Action Button -->
    <button class="aeon-chat-fab" id="chat-fab-toggle" aria-label="Abrir AEON Copilot" title="AEON Copilot IA">
      <span class="chat-fab-pulse" aria-hidden="true"></span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chat-fab-icon">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
      </svg>
      <span class="chat-fab-label">AEON Copilot</span>
    </button>

    <!-- Main Chat Window -->
    <aside class="aeon-chat-panel" id="aeon-chat-panel" aria-hidden="true" role="dialog" aria-label="Terminal Conversacional AEON">
      <!-- Header -->
      <header class="chat-header">
        <div class="chat-header-brand">
          <span class="chat-status-dot online" aria-hidden="true"></span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-hover);">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77L5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="chat-header-title">AEON Copilot</span>
        </div>
        <div class="chat-header-actions">
          <span class="chat-quota-badge" id="chat-quota-display">--/50 hoy</span>
          <button class="chat-btn-header" id="chat-btn-clear" aria-label="Limpiar conversación" title="Limpiar historial">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="chat-btn-header" id="chat-btn-close" aria-label="Cerrar chat" title="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Dynamic Content Area -->
      <div class="chat-body" id="chat-body-area"></div>

      <!-- Input Footer -->
      <footer class="chat-footer" id="chat-footer-area">
        <!-- Floating Image Preview Bar -->
        <div class="chat-image-preview-bar" id="chat-image-preview-bar" style="display: none;">
          <div class="preview-thumb-wrap">
            <img id="chat-preview-img" src="" alt="Gráfico adjunto" />
            <button type="button" class="preview-remove-btn" id="chat-preview-remove" title="Quitar captura">✕</button>
          </div>
          <div class="preview-info">
            <span class="preview-filename" id="chat-preview-name">captura.jpg</span>
            <span class="preview-filesize" id="chat-preview-size">0 KB</span>
          </div>
        </div>

        <form class="chat-input-wrapper" id="chat-input-form">
          <button type="button" class="chat-btn-attach" id="chat-btn-attach" title="Adjuntar captura de gráfico o pega con Ctrl+V">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <input type="file" id="chat-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;" />

          <textarea
            class="chat-textarea"
            id="chat-textarea-input"
            rows="1"
            maxlength="800"
            placeholder="Pregunta o pega una captura con Ctrl+V..."
            aria-label="Mensaje para AEON Copilot"
          ></textarea>
          <button type="submit" class="chat-btn-send" id="chat-btn-send" aria-label="Enviar mensaje">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div class="chat-input-meta">
          <span class="chat-char-counter" id="chat-char-count">0 / 800</span>
          <span class="chat-cooldown-text" id="chat-cooldown-display"></span>
        </div>
      </footer>
    </aside>
  `;

  document.body.appendChild(root);
  bindChatEvents();
  await refreshChatView();
}

/**
 * Conecta los listeners del widget.
 */
function bindChatEvents() {
  const fab = document.getElementById('chat-fab-toggle');
  const closeBtn = document.getElementById('chat-btn-close');
  const clearBtn = document.getElementById('chat-btn-clear');
  const form = document.getElementById('chat-input-form');
  const textarea = document.getElementById('chat-textarea-input');
  const attachBtn = document.getElementById('chat-btn-attach');
  const fileInput = document.getElementById('chat-file-input');
  const removeImgBtn = document.getElementById('chat-preview-remove');
  const panel = document.getElementById('aeon-chat-panel');

  fab?.addEventListener('click', toggleChatPanel);
  closeBtn?.addEventListener('click', () => toggleChatPanel(false));
  clearBtn?.addEventListener('click', handleClearChat);

  // Adjuntar imagen desde explorador de archivos
  attachBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      compressAndAttachImage(e.target.files[0]);
    }
  });

  // Remover imagen adjunta
  removeImgBtn?.addEventListener('click', clearAttachedImage);

  // Captura de imágenes pegadas desde el portapapeles (Ctrl + V)
  panel?.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          compressAndAttachImage(file);
          e.preventDefault();
          break;
        }
      }
    }
  });

  // Drag & drop sobre el panel del chat
  panel?.addEventListener('dragover', (e) => {
    e.preventDefault();
    panel.classList.add('drag-over');
  });
  panel?.addEventListener('dragleave', () => {
    panel.classList.remove('drag-over');
  });
  panel?.addEventListener('drop', (e) => {
    e.preventDefault();
    panel.classList.remove('drag-over');
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      compressAndAttachImage(e.dataTransfer.files[0]);
    }
  });

  // Auto-resize de textarea y contador de caracteres
  textarea?.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 90)}px`;
    const counter = document.getElementById('chat-char-count');
    if (counter) counter.textContent = `${textarea.value.length} / 800`;
  });

  // Enviar con Enter (Shift+Enter para salto de línea)
  textarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form?.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // Enviar formulario
  form?.addEventListener('submit', handleSendMessage);

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isChatOpen) {
      toggleChatPanel(false);
    }
  });

  // Escuchar cambios de Auth para actualizar la vista en caliente
  supabase.auth.onAuthStateChange(() => {
    refreshChatView();
  });
}

/**
 * Abre o cierra el panel del chat.
 * @param {boolean} [forceState]
 */
export function toggleChatPanel(forceState) {
  const panel = document.getElementById('aeon-chat-panel');
  if (!panel) return;

  isChatOpen = typeof forceState === 'boolean' ? forceState : !isChatOpen;

  if (isChatOpen) {
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
    const textarea = document.getElementById('chat-textarea-input');
    setTimeout(() => textarea?.focus(), 150);
    syncQuotaBadge();
  } else {
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
    abortActiveRequest();
  }
}

/**
 * Sincroniza el badge de cuota visual directamente con el contador atómico en Postgres.
 */
async function syncQuotaBadge() {
  const quotaBadge = document.getElementById('chat-quota-display');
  if (!quotaBadge) return;

  try {
    const quota = await fetchUserAiQuota();
    currentQuota.remaining = quota.remaining;
    currentQuota.total = quota.total;
    quotaBadge.textContent = `${quota.remaining}/${quota.total} hoy`;

    const sendBtn = document.getElementById('chat-btn-send');
    if (quota.remaining <= 0) {
      if (sendBtn) sendBtn.disabled = true;
    }
  } catch (_) {}
}

/**
 * Actualiza la vista completa según el estado del usuario (Guest, Free, Pro).
 */
async function refreshChatView() {
  const bodyArea = document.getElementById('chat-body-area');
  const footerArea = document.getElementById('chat-footer-area');
  const quotaBadge = document.getElementById('chat-quota-display');
  if (!bodyArea) return;

  const access = await getUserAccessState();

  // 1. ESTADO GUEST (No autenticado)
  if (access.state === 'guest') {
    if (footerArea) footerArea.style.display = 'none';
    if (quotaBadge) quotaBadge.textContent = 'Requiere Login';

    bodyArea.innerHTML = `
      <div class="chat-paywall-container">
        <div class="chat-paywall-icon">🔒</div>
        <h3 class="chat-paywall-title">Copiloto Cuantitativo AEON</h3>
        <p class="chat-paywall-desc">Inicia sesión para consultar análisis institucional de Order Flow, auditar gráficos y calcular lotajes en tiempo real.</p>
        <a href="/login.html" class="btn-primary btn-large" style="width: 100%; justify-content: center; text-decoration: none;">Iniciar Sesión</a>
      </div>
    `;
    return;
  }

  // 2. ESTADO FREE (Paywall Pro)
  if (access.state === 'free') {
    if (footerArea) footerArea.style.display = 'none';
    if (quotaBadge) quotaBadge.textContent = 'Plan Free';

    bodyArea.innerHTML = `
      <div class="chat-paywall-container">
        <div class="chat-paywall-badge">★ Exclusivo Plan AEON Pro</div>
        <div class="chat-paywall-icon">⚡</div>
        <h3 class="chat-paywall-title">Asistente Cuantitativo IA</h3>
        <p class="chat-paywall-desc">
          El Copiloto IA de Order Flow, auditoría de gráficos y cálculo de riesgo institucional está reservado para miembros con membresía activa.
        </p>
        <ul class="chat-paywall-features">
          <li>✓ Auditoría y análisis de capturas de pantalla de gráficos</li>
          <li>✓ Sesgo intradiario, dPOC y VWAP por símbolo</li>
          <li>✓ Detección de zonas de liquidez y desequilibrios</li>
          <li>✓ Algoritmo institucional de cálculo de lotaje</li>
          <li>✓ 50 consultas cuantitativas diarias</li>
        </ul>
        <a href="/perfil.html" class="btn-primary btn-large" style="width: 100%; justify-content: center; text-decoration: none;">Desbloquear AEON Pro →</a>
      </div>
    `;
    return;
  }

  // 3. ESTADO PRO (Acceso Total Desbloqueado)
  if (footerArea) footerArea.style.display = 'flex';
  syncQuotaBadge();
  renderConversationHistory();
}

/**
 * Renderiza el historial de conversación en el DOM.
 */
function renderConversationHistory() {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;

  const history = getStoredHistory();

  if (history.length === 0) {
    bodyArea.innerHTML = `
      <div class="chat-msg chat-msg-bot">
        <div class="chat-category-badge category-tecnico-orderflow">✦ Terminal Cuántica Activa</div>
        <p class="chat-bot-text">
          Bienvenido al <strong>Copiloto Institucional AEON</strong>. Puedo calcular tu <strong>lotaje exacto</strong>, analizar el <strong>dPOC y VWAP</strong> intradía, evaluar los catalizadores macroeconómicos o <strong>auditar tus gráficos y capturas de pantalla</strong>.
        </p>
        <div class="chat-levels-grid">
          <div class="chat-level-item">Cálculo de Lote: Indícame balance, % de riesgo y Stop Loss.</div>
          <div class="chat-level-item">Order Flow: Consulta dPOC, VWAP o sesgo por símbolo.</div>
          <div class="chat-level-item">Multimodal: Pega una captura de tu gráfico con Ctrl+V.</div>
        </div>
      </div>
    `;
    return;
  }

  bodyArea.innerHTML = history.map(item => {
    if (item.role === 'user') {
      const imgHtml = item.image?.previewUrl 
        ? `<div class="chat-user-img-wrap"><img src="${item.image.previewUrl}" class="chat-user-img-thumb" alt="Gráfico adjunto" onclick="window.open('${item.image.previewUrl}', '_blank')" /></div>` 
        : '';
      const textHtml = item.content ? `<span>${escapeHTML(item.content)}</span>` : '';
      return `<div class="chat-msg chat-msg-user">${imgHtml}${textHtml}</div>`;
    }

    const data = item.data || {};
    const catClass = getCategoryClass(data.categoria);
    const catLabel = getCategoryLabel(data.categoria);

    const levelsHtml = Array.isArray(data.niveles_clave) && data.niveles_clave.length > 0
      ? `<div class="chat-levels-grid">${data.niveles_clave.map(lvl => `<div class="chat-level-item">${escapeHTML(lvl)}</div>`).join('')}</div>`
      : '';

    const riskHtml = data.advertencia_riesgo
      ? `<div class="chat-risk-box"><span>⚠</span><span>${escapeHTML(data.advertencia_riesgo)}</span></div>`
      : '';

    return `
      <div class="chat-msg chat-msg-bot">
        <div class="chat-category-badge ${catClass}">✦ ${escapeHTML(catLabel)}</div>
        <p class="chat-bot-text">${escapeHTML(data.analisis || '')}</p>
        ${levelsHtml}
        ${riskHtml}
      </div>
    `;
  }).join('');

  scrollToBottom();
}

/**
 * Envío de mensaje a la Edge Function.
 */
async function handleSendMessage(e) {
  e.preventDefault();
  if (isSubmitting) return;

  const textarea = document.getElementById('chat-textarea-input');
  const sendBtn = document.getElementById('chat-btn-send');
  const text = textarea?.value?.trim() || '';
  const imageToSend = currentAttachedImage;

  // Requiere al menos texto o imagen
  if (!text && !imageToSend) return;

  isSubmitting = true;
  if (sendBtn) sendBtn.disabled = true;

  // Renderizar mensaje del usuario inmediatamente
  appendUserMessage(text, imageToSend?.previewUrl);
  textarea.value = '';
  textarea.dispatchEvent(new Event('input'));
  clearAttachedImage();

  // Indicador de "Pensando..."
  const loadingIndicator = showTypingIndicator();

  try {
    const imgPayload = imageToSend ? { mimeType: imageToSend.mimeType, data: imageToSend.data } : null;
    const result = await sendChatMessage(text, '', imgPayload);
    loadingIndicator.remove();

    if (result.success && result.data) {
      appendBotResponse(result.data);

      // Actualizar cuota visible
      if (result.meta?.remaining_quota !== undefined) {
        currentQuota.remaining = result.meta.remaining_quota;
        const quotaBadge = document.getElementById('chat-quota-display');
        if (quotaBadge) quotaBadge.textContent = `${result.meta.remaining_quota}/50 hoy`;
      }

      // Guardar en sessionStorage
      const current = getStoredHistory();
      current.push({
        role: 'user',
        content: text,
        image: imageToSend ? { previewUrl: imageToSend.previewUrl } : undefined
      });
      current.push({ role: 'assistant', content: result.data.analisis, data: result.data });
      saveHistory(current);
    }
  } catch (err) {
    loadingIndicator.remove();
    handleChatError(err);
  } finally {
    isSubmitting = false;
    if (sendBtn && !cooldownInterval) sendBtn.disabled = false;
    scrollToBottom();
  }
}

/**
 * Manejo de errores con copy seguro y honesto.
 */
function handleChatError(err) {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;

  if (err.code === 'rate_limit' || err.retry_after) {
    startCooldown(err.retry_after || 10);
    appendSystemNotice(`⏳ Cooldown de seguridad: Por favor espera ${err.retry_after || 10}s antes de enviar otra consulta.`);
    return;
  }

  if (err.code === 'daily_limit_reached') {
    appendSystemNotice('🚫 Has alcanzado el límite institucional de 50 consultas diarias. La cuota se reiniciará a las 00:00 UTC.');
    return;
  }

  if (err.code === 'unauthorized') {
    appendSystemNotice('🔒 Tu sesión ha expirado. Por favor <a href="/login.html" style="color: var(--accent-hover);">inicia sesión nuevamente</a>.');
    refreshChatView();
    return;
  }

  appendSystemNotice(`⚠ ${escapeHTML(err.message || 'El motor de IA no pudo procesar tu consulta en este momento. Inténtalo de nuevo en unos instantes.')}`);
}

/**
 * Agrega un mensaje del usuario al DOM.
 * @param {string} text
 * @param {string} [imagePreviewUrl]
 */
function appendUserMessage(text, imagePreviewUrl = null) {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg chat-msg-user';

  if (imagePreviewUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'chat-user-img-wrap';
    const imgEl = document.createElement('img');
    imgEl.src = imagePreviewUrl;
    imgEl.className = 'chat-user-img-thumb';
    imgEl.alt = 'Gráfico adjunto';
    imgEl.onclick = () => window.open(imagePreviewUrl, '_blank');
    imgWrap.appendChild(imgEl);
    msgEl.appendChild(imgWrap);
  }

  if (text) {
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    msgEl.appendChild(textSpan);
  }

  bodyArea.appendChild(msgEl);
  scrollToBottom();
}

/**
 * Agrega la respuesta estructurada del bot al DOM.
 */
function appendBotResponse(data) {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;

  const catClass = getCategoryClass(data.categoria);
  const catLabel = getCategoryLabel(data.categoria);

  const levelsHtml = Array.isArray(data.niveles_clave) && data.niveles_clave.length > 0
    ? `<div class="chat-levels-grid">${data.niveles_clave.map(lvl => `<div class="chat-level-item">${escapeHTML(lvl)}</div>`).join('')}</div>`
    : '';

  const riskHtml = data.advertencia_riesgo
    ? `<div class="chat-risk-box"><span>⚠</span><span>${escapeHTML(data.advertencia_riesgo)}</span></div>`
    : '';

  const card = document.createElement('div');
  card.className = 'chat-msg chat-msg-bot';
  card.innerHTML = `
    <div class="chat-category-badge ${catClass}">✦ ${escapeHTML(catLabel)}</div>
    <p class="chat-bot-text">${escapeHTML(data.analisis || '')}</p>
    ${levelsHtml}
    ${riskHtml}
  `;

  bodyArea.appendChild(card);
  scrollToBottom();
}

/**
 * Muestra el indicador animado de escritura.
 */
function showTypingIndicator() {
  const bodyArea = document.getElementById('chat-body-area');
  const indicator = document.createElement('div');
  indicator.className = 'chat-msg chat-msg-bot chat-typing-indicator';
  indicator.id = 'chat-typing-active';
  indicator.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  bodyArea?.appendChild(indicator);
  scrollToBottom();
  return indicator;
}

/**
 * Muestra un aviso del sistema dentro del chat.
 */
function appendSystemNotice(htmlContent) {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;

  const notice = document.createElement('div');
  notice.className = 'chat-system-notice';
  notice.innerHTML = htmlContent;
  bodyArea.appendChild(notice);
  scrollToBottom();
}

/**
 * Gestiona el cooldown visual de 10 segundos tras cada consulta.
 */
function startCooldown(seconds) {
  const sendBtn = document.getElementById('chat-btn-send');
  const cooldownText = document.getElementById('chat-cooldown-display');
  let remaining = seconds;

  if (sendBtn) sendBtn.disabled = true;
  if (cooldownText) cooldownText.textContent = `Espera ${remaining}s...`;

  clearInterval(cooldownInterval);
  cooldownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      if (sendBtn) sendBtn.disabled = false;
      if (cooldownText) cooldownText.textContent = '';
    } else {
      if (cooldownText) cooldownText.textContent = `Espera ${remaining}s...`;
    }
  }, 1000);
}

/**
 * Limpia el historial de conversación en cliente.
 */
function handleClearChat() {
  clearStoredHistory();
  renderConversationHistory();
}

/**
 * Mapea la categoría al nombre de clase CSS.
 */
function getCategoryClass(cat) {
  switch (cat) {
    case 'GESTION_RIESGO': return 'category-gestion-riesgo';
    case 'TECNICO_ORDERFLOW': return 'category-tecnico-orderflow';
    case 'MACRO': return 'category-macro';
    case 'CATALIZADOR': return 'category-catalizador';
    default: return 'category-fuera-de-ambito';
  }
}

/**
 * Mapea la categoría al label visible en español.
 */
function getCategoryLabel(cat) {
  switch (cat) {
    case 'GESTION_RIESGO': return 'Gestión de Riesgo';
    case 'TECNICO_ORDERFLOW': return 'Order Flow & ZAP';
    case 'MACRO': return 'Contexto Macro';
    case 'CATALIZADOR': return 'Catalizador Sniper';
    default: return 'Ámbito Institucional';
  }
}

function scrollToBottom() {
  const bodyArea = document.getElementById('chat-body-area');
  if (bodyArea) {
    bodyArea.scrollTop = bodyArea.scrollHeight;
  }
}
