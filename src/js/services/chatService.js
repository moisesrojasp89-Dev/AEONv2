/* ============================================================
   AEON · services/chatService.js — Institutional AI Client
   Zero-Trust Client Layer • AbortController • Silent Token Refresh
   ============================================================ */

import { supabase } from '../supabaseClient.js';

const SUPABASE_URL = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://ytccnxlfakjilxwauxic.supabase.co';
const CHAT_ENDPOINT = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/aeon-chat`;
const STORAGE_KEY = 'aeon_chat_history_v1';
const MAX_STORED_MESSAGES = 6;

let activeAbortController = null;

/**
 * Obtiene el historial reciente guardado en la sesión del navegador.
 * @returns {Array<{ role: 'user' | 'assistant', content: string, data?: object }>}
 */
export function getStoredHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED_MESSAGES) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Guarda el historial en sessionStorage.
 * @param {Array} history
 */
export function saveHistory(history) {
  try {
    const trimmed = history.slice(-MAX_STORED_MESSAGES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (_) {}
}

/**
 * Limpia el historial almacenado.
 */
export function clearStoredHistory() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/**
 * Cancela cualquier petición HTTP que esté actualmente en curso.
 */
export function abortActiveRequest() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
}

/**
 * Envía un mensaje al Copiloto Cuántico en la Edge Function de Supabase.
 * @param {string} userMessage - Pregunta del usuario
 * @param {string} [asset] - Símbolo opcional (ej. "XAUUSD")
 * @returns {Promise<{ success: boolean, data: object, meta: object }>}
 */
export async function sendChatMessage(userMessage, asset = '') {
  // 1. Cancelar petición previa si estuviera en curso
  abortActiveRequest();
  activeAbortController = new AbortController();

  // 2. Obtener sesión de Supabase Auth
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session;

    // Si no hay sesión o el token está cerca de expirar, intentar refrescar silenciosamente
    if (!session) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      session = refreshData?.session;
    }
  } catch (_) {}

  if (!session?.access_token) {
    throw {
      code: 'unauthorized',
      message: 'Tu sesión ha expirado o no estás conectado. Inicia sesión para continuar.',
    };
  }

  // 3. Preparar payload de historial
  const currentHistory = getStoredHistory().map(h => ({
    role: h.role,
    content: typeof h.content === 'string' ? h.content : (h.data?.analisis || ''),
  }));

  const payload = {
    message: userMessage.trim(),
    history: currentHistory,
    asset: asset || undefined,
  };

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
      signal: activeAbortController.signal,
    });

    // 4. Manejo de Respuestas HTTP
    if (response.ok) {
      const result = await response.json();
      activeAbortController = null;
      return result;
    }

    // 5. Manejo de Errores Específicos
    let errorJson = {};
    try {
      errorJson = await response.json();
    } catch (_) {}

    activeAbortController = null;

    if (response.status === 401) {
      throw {
        code: 'unauthorized',
        message: 'Sesión expirada. Por favor recarga la página o inicia sesión nuevamente.',
      };
    }

    if (response.status === 403) {
      throw {
        code: 'pro_required',
        message: errorJson.message || 'El Asistente Cuantitativo IA es exclusivo para miembros AEON Pro.',
        upgrade_url: errorJson.upgrade_url || '/perfil.html',
      };
    }

    if (response.status === 429) {
      throw {
        code: errorJson.error || 'rate_limit',
        message: errorJson.message || 'Límite de consultas o cooldown alcanzado.',
        retry_after: errorJson.retry_after || 10,
        remaining: errorJson.remaining ?? 0,
      };
    }

    // HTTP 503 / Error genérico: Copy honesto y sin falsas promesas de cuota (indicación del Arquitecto)
    throw {
      code: 'ai_service_unavailable',
      message: 'El motor de IA no pudo procesar tu consulta en este momento. Inténtalo de nuevo en unos instantes.',
    };

  } catch (err) {
    activeAbortController = null;
    if (err.name === 'AbortError') {
      throw { code: 'aborted', message: 'Consulta cancelada.' };
    }
    throw err;
  }
}
