/* ============================================================
   AEON · config/constants.js — Centralized Configuration
   ============================================================ */

/**
 * Supabase Database Tables
 */
export const DB_TABLES = {
  ECONOMIC_CALENDAR: 'economic_calendar',
  SIGNALS: 'signals',
  SIGNALS_PRO_DATA: 'signals_pro_data',
  SUBSCRIPTIONS: 'subscriptions',
  PROFILES: 'profiles',
  NEWS: 'news',
  DAILY_BRIEFINGS: 'daily_briefings',
};

/**
 * Data Polling & Timing Intervals (in milliseconds)
 */
export const TIMING = {
  PRICES_REFRESH_MS: 60_000,
  CRYPTO_TIMEOUT_MS: 8_000,
  TICKER_DURATION_SEC: 120,
};

/**
 * Supported Assets & Universal Mapping
 */
export const ASSETS = {
  CRYPTO: {
    BTC: 'bitcoin',
  },
  DEFAULT_INSTRUMENTS: [
    'EUR_USD',
    'XAU_USD',
    'SPX500_USD',
    'NAS100_USD',
    'US30_USD',
  ],
  // Backwards compatibility alias
  OANDA_DEFAULT_INSTRUMENTS: [
    'EUR_USD',
    'XAU_USD',
    'SPX500_USD',
    'NAS100_USD',
    'US30_USD',
  ],
};

/**
 * Canonical Signal Status Enum & UI Mappings
 * Unified across PostgreSQL, Backend Bots, and Frontend UI.
 */
export const SIGNAL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  HIT_TP1: 'hit_tp1',
  CLOSED_TP: 'closed_tp',
  CLOSED_BE: 'closed_be',
  CLOSED_SL: 'closed_sl',
  WON: 'won',       // Legacy alias for closed_tp
  LOST: 'lost',     // Legacy alias for closed_sl
  CANCELLED: 'cancelled',
};

export const SIGNAL_STATUS_CONFIG = {
  [SIGNAL_STATUS.PENDING]: { label: '⏳ Pendiente', class: 'pending', isActive: true },
  [SIGNAL_STATUS.ACTIVE]: { label: '● En Curso', class: 'active', isActive: true },
  [SIGNAL_STATUS.HIT_TP1]: { label: '🎯 TP1 (SL a BE)', class: 'active', isActive: true },
  [SIGNAL_STATUS.CLOSED_TP]: { label: '🏆 Ganada (+TP)', class: 'closed-won', isActive: false },
  [SIGNAL_STATUS.CLOSED_BE]: { label: '🛡️ Break-Even (0.0R)', class: 'closed-be', isActive: false },
  [SIGNAL_STATUS.CLOSED_SL]: { label: '🛑 Cerrada (SL)', class: 'closed-lost', isActive: false },
  [SIGNAL_STATUS.WON]: { label: '🏆 Ganada (+TP)', class: 'closed-won', isActive: false },
  [SIGNAL_STATUS.LOST]: { label: '🛑 Cerrada (SL)', class: 'closed-lost', isActive: false },
  [SIGNAL_STATUS.CANCELLED]: { label: 'Cancelada', class: 'closed', isActive: false },
};

/**
 * Radar Asset Bias Enum & UI Configurations
 */
export const ASSET_BIAS = {
  BULLISH: 'BULLISH',
  BEARISH: 'BEARISH',
  NEUTRAL: 'NEUTRAL',
  PULLBACK: 'PULLBACK',
};

export const ASSET_BIAS_CONFIG = {
  [ASSET_BIAS.BULLISH]: {
    label: '▲ BULLISH',
    class: 'bias-bull',
    textColor: '#3dd68c',
    bg: 'rgba(61, 214, 140, 0.12)',
    border: 'rgba(61, 214, 140, 0.25)',
  },
  [ASSET_BIAS.BEARISH]: {
    label: '▼ BEARISH',
    class: 'bias-bear',
    textColor: '#ff5c6a',
    bg: 'rgba(255, 92, 106, 0.12)',
    border: 'rgba(255, 92, 106, 0.25)',
  },
  [ASSET_BIAS.NEUTRAL]: {
    label: '■ NEUTRAL',
    class: 'bias-neutral',
    textColor: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.10)',
    border: 'rgba(148, 163, 184, 0.20)',
  },
  [ASSET_BIAS.PULLBACK]: {
    label: '↺ PULLBACK',
    class: 'bias-pullback',
    textColor: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.25)',
  },
};

/**
 * Macro Catalyst Lifecycle Status & Visual Styles
 */
export const CATALYST_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  DIGESTED: 'digested',
};

export const CATALYST_STATUS_CONFIG = {
  [CATALYST_STATUS.UPCOMING]: {
    badgeLabel: 'PRÓXIMO',
    badgeClass: 'status-upcoming',
  },
  [CATALYST_STATUS.LIVE]: {
    badgeLabel: 'PUBLICADO',
    badgeClass: 'status-live',
  },
  [CATALYST_STATUS.DIGESTED]: {
    badgeLabel: 'DIGERIDO',
    badgeClass: 'status-digested',
  },
};

/**
 * Daily Briefing Institutional Sessions
 */
export const BRIEFING_SESSIONS = {
  LONDON_PRE: 'london_pre',
  NY_PRE: 'ny_pre',
};

export const BRIEFING_SESSIONS_CONFIG = {
  [BRIEFING_SESSIONS.LONDON_PRE]: {
    label: 'Pre-Londres · 06:00 UTC',
    pillClass: 'session-london',
    defaultTitle: 'Sesión Europea: Enfoque en Liquidez y Catalizadores Clave',
    defaultCover: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?q=80&w=1200&auto=format&fit=crop',
  },
  [BRIEFING_SESSIONS.NY_PRE]: {
    label: 'Pre-Nueva York · 12:30 UTC',
    pillClass: 'session-ny',
    defaultTitle: 'Sesión Americana: Apertura Wall Street y Flujo Institucional',
    defaultCover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
  },
};

/**
 * Dynamic Universal Market Sessions
 */
export const MARKET_SESSIONS = {
  PRE_LONDON: 'PRE_LONDON',
  LONDON_LIVE: 'LONDON_LIVE',
  PRE_NY: 'PRE_NY',
  NY_LIVE: 'NY_LIVE',
  NY_CLOSE: 'NY_CLOSE',
  ASIA_PACIFIC: 'ASIA_PACIFIC',
};

export const MARKET_SESSIONS_CONFIG = {
  [MARKET_SESSIONS.PRE_LONDON]: {
    label: 'PRE-LONDRES',
    statusTag: '🟡 PREPARACIÓN',
    pillClass: 'session-pre-london',
    cover: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?q=80&w=1200&auto=format&fit=crop',
    title: 'Sesión Europea: Preparación Killzones y Liquidez de Londres'
  },
  [MARKET_SESSIONS.LONDON_LIVE]: {
    label: 'SESIÓN LONDRES ACTIVA',
    statusTag: '🟢 EN VIVO',
    pillClass: 'session-london-live',
    cover: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop',
    title: 'Sesión Europea: Flujo Interbancario y Cruces GBP/EUR'
  },
  [MARKET_SESSIONS.PRE_NY]: {
    label: 'PRE-NUEVA YORK',
    statusTag: '🟡 AJUSTE MACRO',
    pillClass: 'session-pre-ny',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    title: 'Sesión Americana: Reacción a Catalizadores Macro y Datos de EE.UU.'
  },
  [MARKET_SESSIONS.NY_LIVE]: {
    label: 'SESIÓN WALL STREET (NY)',
    statusTag: '🟢 EN VIVO',
    pillClass: 'session-ny-live',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    title: 'Sesión Americana: Apertura Wall Street y Flujo Institucional'
  },
  [MARKET_SESSIONS.NY_CLOSE]: {
    label: 'CIERRE WALL STREET',
    statusTag: '⚪ POST-MERCADO',
    pillClass: 'session-ny-close',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    title: 'Cierre Americano: Balance Institucional y Flujo de Derivados'
  },
  [MARKET_SESSIONS.ASIA_PACIFIC]: {
    label: 'SESIÓN ASIA-PACÍFICO',
    statusTag: '🔵 TOKIO & SÍDNEY',
    pillClass: 'session-asia',
    cover: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
    title: 'Sesión Asiática: Rangos de Consolidación y Flujo del Banco de Japón'
  }
};

/**
 * Resuelve la sesión activa según el reloj UTC en tiempo real.
 * @param {Date} [now]
 * @returns {Object} Configuración de la sesión activa
 */
export function getCurrentMarketSession(now = new Date()) {
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const timeVal = utcHours * 60 + utcMinutes;

  if (timeVal >= 360 && timeVal < 480) {
    return MARKET_SESSIONS_CONFIG[MARKET_SESSIONS.PRE_LONDON];
  }
  if (timeVal >= 480 && timeVal < 750) {
    return MARKET_SESSIONS_CONFIG[MARKET_SESSIONS.LONDON_LIVE];
  }
  if (timeVal >= 750 && timeVal < 810) {
    return MARKET_SESSIONS_CONFIG[MARKET_SESSIONS.PRE_NY];
  }
  if (timeVal >= 810 && timeVal < 1200) {
    return MARKET_SESSIONS_CONFIG[MARKET_SESSIONS.NY_LIVE];
  }
  if (timeVal >= 1200 && timeVal < 1260) {
    return MARKET_SESSIONS_CONFIG[MARKET_SESSIONS.NY_CLOSE];
  }
  return MARKET_SESSIONS_CONFIG[MARKET_SESSIONS.ASIA_PACIFIC];
}

/**
 * News Categories & Tactical Tags
 */
export const NEWS_CATEGORIES = {
  ALL: { id: 'all', label: 'Live Feed', tagClass: 'tag-all' },
  ORO: { id: 'ORO', label: 'Metales', tagClass: 'tag-gold' },
  FOREX: { id: 'FOREX', label: 'Forex', tagClass: 'tag-forex' },
  INDICES: { id: 'ÍNDICES', label: 'Índices', tagClass: 'tag-indices' },
  FED: { id: 'FED', label: 'Centrales', tagClass: 'tag-fed' },
  MACRO: { id: 'MACRO', label: 'Macro', tagClass: 'tag-macro' },
};


