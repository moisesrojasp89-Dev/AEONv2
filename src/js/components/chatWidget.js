/* ============================================================
   AEON · components/chatWidget.js — Institutional AI Chat Widget
   Zero-Trust Client Rendering • Anti-XSS • Multi-State UX
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
} from '../services/chatService.js';

let isChatOpen = false;
let isSubmitting = false;
let cooldownInterval = null;
let currentQuota = { remaining: 50, total: 50 };

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
 * Renderiza el markup base del widget en el DOM.
 */
export async function initChatWidget() {
  if (document.getElementById('aeon-chat-root')) return;

  const root = document.createElement('div');
  root.id = 'aeon-chat-root';
  root.innerHTML = `
    <!-- Floating Action Button -->
    <button class="aeon-chat-fab" id="chat-fab-toggle" aria-label="Abrir Copiloto IA de AEON" title="Copiloto Cuantitativo & Gestión de Riesgo">
      <span class="chat-fab-icon">✦</span>
      <span class="chat-fab-label">AEON Copilot</span>
    </button>

    <!-- Chat Panel Window -->
    <aside class="aeon-chat-panel" id="aeon-chat-panel" aria-hidden="true">
      <header class="chat-header">
        <div class="chat-header-title">
          <span class="chat-pulse-dot" aria-hidden="true"></span>
          <span>✦ AEON Copilot</span>
        </div>
        <div class="chat-header-meta">
          <span class="chat-quota-badge" id="chat-quota-display">50/50 hoy</span>
          <button class="chat-btn-action" id="chat-btn-clear" title="Limpiar conversación" aria-label="Limpiar conversación">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
          <button class="chat-btn-action" id="chat-btn-close" title="Cerrar chat" aria-label="Cerrar chat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Dynamic Content Area -->
      <div class="chat-body" id="chat-body-area"></div>

      <!-- Quick Prompt Suggestions Bar -->
      <div class="chat-quick-prompts" id="chat-quick-prompts">
        <button class="chat-prompt-chip" data-prompt="Calcula mi lotaje para cuenta de $10,000, riesgo 1% y Stop Loss de 25 pips en XAUUSD">📊 Calcular Lote</button>
        <button class="chat-prompt-chip" data-prompt="¿Cuál es el sesgo intradiario, dPOC y VWAP actual de XAUUSD?">🧭 Sesgo XAUUSD</button>
        <button class="chat-prompt-chip" data-prompt="¿Cuáles son las zonas de liquidez y volumen institucional en EURUSD?">🌊 Liquidez EURUSD</button>
        <button class="chat-prompt-chip" data-prompt="¿Cómo aplico la regla institucional de riesgo del 1% para proteger mi drawdown?">🛡️ Gestión de Riesgo</button>
      </div>

      <!-- Input Footer -->
      <footer class="chat-footer" id="chat-footer-area">
        <form class="chat-input-wrapper" id="chat-input-form">
          <textarea
            class="chat-textarea"
            id="chat-textarea-input"
            rows="1"
            maxlength="800"
            placeholder="Pregunta sobre Order Flow o cálculo de lotajes..."
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
  const quickPrompts = document.getElementById('chat-quick-prompts');

  fab?.addEventListener('click', toggleChatPanel);
  closeBtn?.addEventListener('click', () => toggleChatPanel(false));
  clearBtn?.addEventListener('click', handleClearChat);

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

  // Chips de sugerencia rápida
  quickPrompts?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-prompt-chip');
    if (!chip || !textarea) return;
    textarea.value = chip.getAttribute('data-prompt') || '';
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
  });

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
  } else {
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
    abortActiveRequest(); // Cancelar petición en vuelo si cierra el panel (requisito del Arquitecto)
  }
}

/**
 * Actualiza la vista completa según el estado del usuario (Guest, Free, Pro).
 */
async function refreshChatView() {
  const bodyArea = document.getElementById('chat-body-area');
  const quickPrompts = document.getElementById('chat-quick-prompts');
  const footerArea = document.getElementById('chat-footer-area');
  const quotaBadge = document.getElementById('chat-quota-display');
  if (!bodyArea) return;

  const access = await getUserAccessState();

  // 1. ESTADO GUEST (No autenticado)
  if (access.state === 'guest') {
    if (quickPrompts) quickPrompts.style.display = 'none';
    if (footerArea) footerArea.style.display = 'none';
    if (quotaBadge) quotaBadge.textContent = 'Requiere Login';

    bodyArea.innerHTML = `
      <div class="chat-paywall-container">
        <div class="chat-paywall-icon">🔒</div>
        <h3 class="chat-paywall-title">Copiloto Cuantitativo AEON</h3>
        <p class="chat-paywall-desc">Inicia sesión para consultar análisis institucional de Order Flow y cálculo de lotajes en tiempo real.</p>
        <a href="/login.html" class="btn-primary btn-large" style="width: 100%; justify-content: center; text-decoration: none;">Iniciar Sesión</a>
      </div>
    `;
    return;
  }

  // 2. ESTADO FREE (Logueado pero sin plan Pro)
  if (access.state === 'free') {
    if (quickPrompts) quickPrompts.style.display = 'none';
    if (footerArea) footerArea.style.display = 'none';
    if (quotaBadge) quotaBadge.textContent = 'Solo Pro';

    bodyArea.innerHTML = `
      <div class="chat-paywall-container">
        <div class="chat-paywall-icon">⭐</div>
        <h3 class="chat-paywall-title">Exclusivo Plan AEON Pro</h3>
        <p class="chat-paywall-desc">El copiloto de IA con dPOC en tiempo real y cálculo de lotaje está reservado para miembros Pro.</p>
        <div class="chat-paywall-features">
          <div>✔ Cálculo matemático de lotaje y riesgo institucional</div>
          <div>✔ Sesgo institucional, dPOC y VWAP en tiempo real</div>
          <div>✔ 50 consultas diarias sin esperas</div>
        </div>
        <a href="/perfil.html" class="btn-primary btn-large" style="width: 100%; justify-content: center; text-decoration: none;">Desbloquear AEON Pro →</a>
      </div>
    `;
    return;
  }

  // 3. ESTADO PRO (Acceso total)
  if (quickPrompts) quickPrompts.style.display = 'flex';
  if (footerArea) footerArea.style.display = 'flex';
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
          Bienvenido al <strong>Copiloto Institucional AEON</strong>. Puedo calcular tu <strong>lotaje exacto</strong>, analizar el <strong>dPOC y VWAP</strong> intradía o evaluar los catalizadores macroeconómicos.
        </p>
        <div class="chat-levels-grid">
          <div class="chat-level-item">Cálculo de Lote: Indícame balance, % de riesgo y Stop Loss.</div>
          <div class="chat-level-item">Order Flow: Consulta dPOC, VWAP o sesgo por símbolo.</div>
        </div>
      </div>
    `;
    return;
  }

  bodyArea.innerHTML = history.map(item => {
    if (item.role === 'user') {
      return `<div class="chat-msg chat-msg-user">${escapeHTML(item.content)}</div>`;
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
        <div class="chat-category-badge ${catClass}">${catLabel}</div>
        <p class="chat-bot-text">${escapeHTML(data.analisis || item.content)}</p>
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
  const text = textarea?.value?.trim();
  if (!text) return;

  isSubmitting = true;
  if (sendBtn) sendBtn.disabled = true;

  // Renderizar mensaje del usuario inmediatamente
  appendUserMessage(text);
  textarea.value = '';
  textarea.dispatchEvent(new Event('input'));

  // Indicador de "Pensando..."
  const loadingIndicator = showTypingIndicator();

  try {
    const result = await sendChatMessage(text);
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
      current.push({ role: 'user', content: text });
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

  // 1. HTTP 429 Cooldown
  if (err.code === 'rate_limit' || err.retry_after) {
    startCooldown(err.retry_after || 10);
    appendSystemNotice(`⏳ Cooldown de seguridad: Por favor espera ${err.retry_after || 10}s antes de enviar otra consulta.`);
    return;
  }

  // 2. HTTP 429 Cuota Diaria Agotada
  if (err.code === 'daily_limit_reached') {
    appendSystemNotice('🚫 Has alcanzado el límite institucional de 50 consultas diarias. La cuota se reiniciará a las 00:00 UTC.');
    return;
  }

  // 3. HTTP 401 Sesión Expirada
  if (err.code === 'unauthorized') {
    appendSystemNotice('🔒 Tu sesión ha expirado. Por favor <a href="/login.html" style="color: var(--accent-hover);">inicia sesión nuevamente</a>.');
    refreshChatView();
    return;
  }

  // 4. HTTP 503 / Servicio Caído (Copy verificado con el Arquitecto)
  appendSystemNotice(`⚠ ${escapeHTML(err.message || 'El motor de IA no pudo procesar tu consulta en este momento. Inténtalo de nuevo en unos instantes.')}`);
}

/**
 * Agrega un mensaje del usuario al DOM.
 */
function appendUserMessage(text) {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg chat-msg-user';
  msgEl.textContent = text;
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
    <div class="chat-category-badge ${catClass}">${catLabel}</div>
    <p class="chat-bot-text">${escapeHTML(data.analisis)}</p>
    ${levelsHtml}
    ${riskHtml}
  `;

  bodyArea.appendChild(card);
  scrollToBottom();
}

/**
 * Muestra burbuja de carga "Pensando...".
 */
function showTypingIndicator() {
  const bodyArea = document.getElementById('chat-body-area');
  const indicator = document.createElement('div');
  indicator.className = 'chat-msg chat-msg-bot';
  indicator.innerHTML = `
    <div class="chat-category-badge category-tecnico-orderflow">✦ Procesando</div>
    <p class="chat-bot-text" style="opacity: 0.7; font-style: italic;">Calculando parámetros de liquidez y riesgo...</p>
  `;
  bodyArea.appendChild(indicator);
  scrollToBottom();
  return indicator;
}

/**
 * Muestra aviso del sistema en el chat.
 */
function appendSystemNotice(htmlContent) {
  const bodyArea = document.getElementById('chat-body-area');
  if (!bodyArea) return;
  const notice = document.createElement('div');
  notice.className = 'chat-risk-box';
  notice.style.background = 'rgba(239, 68, 68, 0.1)';
  notice.style.borderColor = 'rgba(239, 68, 68, 0.3)';
  notice.style.color = '#fca5a5';
  notice.innerHTML = `<span>⚡</span><div>${htmlContent}</div>`;
  bodyArea.appendChild(notice);
  scrollToBottom();
}

/**
 * Cooldown regresivo en el botón de enviar.
 */
function startCooldown(seconds) {
  const sendBtn = document.getElementById('chat-btn-send');
  const cooldownText = document.getElementById('chat-cooldown-display');
  if (cooldownInterval) clearInterval(cooldownInterval);

  let remaining = seconds;
  if (sendBtn) sendBtn.disabled = true;

  const update = () => {
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      if (cooldownText) cooldownText.textContent = '';
      if (sendBtn && !isSubmitting) sendBtn.disabled = false;
      return;
    }
    if (cooldownText) cooldownText.textContent = `Espera ${remaining}s...`;
    remaining--;
  };

  update();
  cooldownInterval = setInterval(update, 1000);
}

/**
 * Limpiar conversación.
 */
function handleClearChat() {
  clearStoredHistory();
  abortActiveRequest();
  renderConversationHistory();
}

function scrollToBottom() {
  const bodyArea = document.getElementById('chat-body-area');
  if (bodyArea) {
    bodyArea.scrollTop = bodyArea.scrollHeight;
  }
}

function getCategoryClass(cat) {
  switch (cat) {
    case 'GESTION_RIESGO': return 'category-gestion-riesgo';
    case 'TECNICO_ORDERFLOW': return 'category-tecnico-orderflow';
    case 'MACRO': return 'category-macro';
    case 'CATALIZADOR': return 'category-catalizador';
    default: return 'category-fuera-de-ambito';
  }
}

function getCategoryLabel(cat) {
  switch (cat) {
    case 'GESTION_RIESGO': return '📊 GESTIÓN DE RIESGO';
    case 'TECNICO_ORDERFLOW': return '🌊 ORDER FLOW & dPOC';
    case 'MACRO': return '🌐 ANÁLISIS MACRO';
    case 'CATALIZADOR': return '⚡ CATALIZADOR';
    default: return '🛡️ ÁMBITO INSTITUCIONAL';
  }
}
