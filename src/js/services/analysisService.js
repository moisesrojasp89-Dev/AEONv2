/* ============================================================
   AEON · services/analysisService.js — Institutional Analysis Service
   Robust Failover • Pure Consumption • Realtime Sync
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';
import fallbackData from '../../data/analysis_snapshot.json';

export const CORE_ASSETS = ['XAUUSD', 'BTCUSDT', 'EURUSD', 'NAS100'];

/**
 * Normaliza el símbolo para la consulta en Supabase.
 * En la DB se almacena 'BTCUSD', mientras que el frontend usa 'BTCUSDT'.
 */
function toDbSymbol(sym) {
  const norm = String(sym || 'XAUUSD').toUpperCase().trim();
  if (norm === 'BTCUSDT') return 'BTCUSD';
  return norm;
}

/**
 * Extrae y fusiona la microestructura institucional desde cited_key_levels o campos planos.
 */
function unpackStructuralRecord(normSymbol, dbRow, fallback) {
  if (!dbRow) return fallback;

  let structural = {};
  if (dbRow.cited_key_levels && typeof dbRow.cited_key_levels === 'object' && !Array.isArray(dbRow.cited_key_levels)) {
    structural = dbRow.cited_key_levels;
  }

  return {
    ...fallback,
    ...dbRow,
    symbol: normSymbol, // Preservar símbolo solicitado por la interfaz (ej. BTCUSDT)
    display_name: dbRow.display_name || fallback.display_name,
    current_price: Number(dbRow.current_price) || fallback.current_price,
    change_24h_pct: dbRow.change_24h_pct !== undefined ? Number(dbRow.change_24h_pct) : fallback.change_24h_pct,
    bias: dbRow.bias || fallback.bias,
    bias_score: dbRow.bias_score !== undefined ? Number(dbRow.bias_score) : fallback.bias_score,
    session_levels: structural.session_levels || dbRow.session_levels || fallback.session_levels,
    liquidity_pools: structural.liquidity_pools || dbRow.liquidity_pools || fallback.liquidity_pools,
    structural_poi: structural.structural_poi || dbRow.structural_poi || fallback.structural_poi,
    structural_scenarios: structural.structural_scenarios || dbRow.structural_scenarios || fallback.structural_scenarios,
    diagnosis: structural.diagnosis || dbRow.technical_thesis || dbRow.macro_driver || fallback.diagnosis,
  };
}

export const analysisService = {
  /**
   * Obtiene la inteligencia estructural y zonas ZAP de un activo.
   * @param {string} symbol - Símbolo normalizado (ej. 'XAUUSD', 'BTCUSDT')
   * @returns {Promise<Object>} Datos del análisis con fallback blindado
   */
  async getAnalysisBySymbol(symbol = 'XAUUSD') {
    const norm = String(symbol || 'XAUUSD').toUpperCase().trim();
    const fallback = fallbackData[norm] || fallbackData.XAUUSD;
    const dbSymbol = toDbSymbol(norm);

    try {
      const { data, error } = await supabase
        .from(DB_TABLES.MARKET_INTELLIGENCE)
        .select('*')
        .eq('symbol', dbSymbol)
        .maybeSingle();

      if (error || !data) {
        console.debug('[AEON Analysis] Usando snapshot de respaldo local para:', norm);
        return fallback;
      }

      return unpackStructuralRecord(norm, data, fallback);
    } catch (err) {
      console.error('[AEON Analysis] Excepción al consultar Supabase, activando fallback:', err);
      return fallback;
    }
  },

  /**
   * Suscripción reactiva en tiempo real a actualizaciones de análisis.
   * @param {string} symbol - Símbolo a monitorear
   * @param {Function} onUpdate - Callback al recibir nuevo dato
   * @returns {Object} Instancia del canal Realtime
   */
  subscribeToLiveUpdates(symbol, onUpdate) {
    const norm = String(symbol || 'XAUUSD').toUpperCase().trim();
    const dbSymbol = toDbSymbol(norm);
    const fallback = fallbackData[norm] || fallbackData.XAUUSD;

    return supabase
      .channel(`market_analysis_${norm}_channel`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.MARKET_INTELLIGENCE,
          filter: `symbol=eq.${dbSymbol}`,
        },
        payload => {
          if (payload.new && typeof onUpdate === 'function') {
            console.debug('[AEON Analysis] Actualización Realtime recibida:', norm);
            const unpacked = unpackStructuralRecord(norm, payload.new, fallback);
            onUpdate(unpacked);
          }
        }
      )
      .subscribe();
  },
};
