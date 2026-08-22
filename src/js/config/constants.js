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
 * Supported Assets & Crypto Mapping
 */
export const ASSETS = {
  CRYPTO: {
    BTC: 'bitcoin',
  },
  OANDA_DEFAULT_INSTRUMENTS: [
    'EUR_USD',
    'XAU_USD',
    'SPX500_USD',
    'NAS100_USD',
    'US30_USD',
  ],
};

/**
 * Signal Status Labels & CSS Mappings
 */
export const SIGNAL_STATUS = {
  ACTIVE: { label: 'Activa', class: 'active' },
  WON: { label: 'Ganada', class: 'closed' },
  LOST: { label: 'Perdida', class: 'closed' },
  CANCELLED: { label: 'Cancelada', class: 'closed' },
};
