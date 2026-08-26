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
