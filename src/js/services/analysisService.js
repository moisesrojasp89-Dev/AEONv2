/* ============================================================
   AEON · services/analysisService.js — Institutional Analysis Service
   Robust Failover • Pure Consumption • Realtime Sync
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';
import fallbackData from '../../data/analysis_snapshot.json';

export const CORE_ASSETS = ['XAUUSD', 'BTCUSDT', 'EURUSD', 'NAS100'];

export const analysisService = {
  /**
   * Obtiene la inteligencia estructural y zonas ZAP de un activo.
   * @param {string} symbol - Símbolo normalizado (ej. 'XAUUSD')
   * @returns {Promise<Object>} Datos del análisis con fallback blindado
   */
  async getAnalysisBySymbol(symbol = 'XAUUSD') {
    const norm = String(symbol || 'XAUUSD').toUpperCase().trim();
    const fallback = fallbackData[norm] || fallbackData.XAUUSD;

    try {
      const { data, error } = await supabase
        .from(DB_TABLES.MARKET_INTELLIGENCE)
        .select('*')
        .eq('symbol', norm)
        .maybeSingle();

      if (error || !data) {
        console.debug('[AEON Analysis] Usando snapshot de respaldo local para:', norm);
        return fallback;
      }

      // Si el registro de la DB aún no tiene las columnas JSONB extendidas, fusionar con fallback
      return {
        ...fallback,
        ...data,
        session_levels: data.session_levels || fallback.session_levels,
        liquidity_pools: data.liquidity_pools || fallback.liquidity_pools,
        structural_poi: data.structural_poi || fallback.structural_poi,
        structural_scenarios: data.structural_scenarios || fallback.structural_scenarios,
        diagnosis: data.macro_driver || fallback.diagnosis,
      };
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

    return supabase
      .channel(`market_analysis_${norm}_channel`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_TABLES.MARKET_INTELLIGENCE,
          filter: `symbol=eq.${norm}`,
        },
        payload => {
          if (payload.new && typeof onUpdate === 'function') {
            console.debug('[AEON Analysis] Actualización Realtime recibida:', payload.new.symbol);
            onUpdate(payload.new);
          }
        }
      )
      .subscribe();
  },
};
