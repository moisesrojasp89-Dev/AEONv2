/* ============================================================
   AEON · services/marketsService.js — Institutional Markets Service
   Gestión de datos de mercado con Failover y Supabase Realtime
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';
import fallbackData from '../../../data/market_intelligence_snapshot.json';

const FALLBACK_SNAPSHOT = fallbackData || [];

export const marketsService = {
  /**
   * Obtiene la lista de los 14 activos desde Supabase con fallback integrado.
   * @returns {Promise<Array>} Lista de registros de mercado
   */
  async getMarketIntelligence() {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.MARKET_INTELLIGENCE)
        .select('*')
        .order('symbol', { ascending: true });

      if (error || !data || data.length === 0) {
        console.warn('[AEON Markets] Usando snapshot de respaldo local:', error?.message);
        return FALLBACK_SNAPSHOT;
      }

      return data;
    } catch (err) {
      console.error('[AEON Markets] Error al consultar Supabase, activando fallback:', err);
      return FALLBACK_SNAPSHOT;
    }
  },

  /**
   * Suscripción reactiva a cambios en vivo vía Supabase Realtime.
   * @param {Function} onUpdate Callback que recibe el registro actualizado
   * @returns {Object} Instancia del canal de Supabase
   */
  subscribeToLiveUpdates(onUpdate) {
    return supabase
      .channel('market_intelligence_live_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.MARKET_INTELLIGENCE },
        payload => {
          if (payload.new && typeof onUpdate === 'function') {
            onUpdate(payload.new);
          }
        }
      )
      .subscribe();
  }
};
