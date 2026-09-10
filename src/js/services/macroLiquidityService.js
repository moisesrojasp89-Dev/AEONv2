/* ============================================================
   AEON · services/macroLiquidityService.js — Federal Reserve Macro HUD Service
   Gestión de telemetría de liquidez con Failover y Supabase Realtime
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';
import fallbackData from '../../data/macro_liquidity_snapshot.json';

const FALLBACK_SNAPSHOT = fallbackData || [];

class MacroLiquidityService {
  constructor() {
    this._items = [...FALLBACK_SNAPSHOT];
    this._channel = null;
  }

  /**
   * Obtiene los 5 pilares de liquidez y rendimientos con failover a snapshot local.
   * @returns {Promise<Array>} Lista de registros macro
   */
  async getMacroLiquidity() {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.MACRO_LIQUIDITY)
        .select('*')
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        console.warn('[AEON Macro] Usando snapshot de respaldo local:', error?.message);
        this._items = [...FALLBACK_SNAPSHOT];
        return this._items;
      }

      this._items = data;
      return this._items;
    } catch (err) {
      console.error('[AEON Macro] Error al consultar Supabase, activando snapshot:', err);
      this._items = [...FALLBACK_SNAPSHOT];
      return this._items;
    }
  }

  /**
   * Obtiene un registro por su símbolo (ej. 'US10Y', 'RRPONTSYD').
   * @param {string} symbol
   * @returns {Object|null}
   */
  getItem(symbol) {
    const s = String(symbol || '').toUpperCase().trim();
    return this._items.find(item => item.symbol.toUpperCase() === s) || null;
  }

  /**
   * Suscripción reactiva a cambios en vivo vía Supabase Realtime.
   * @param {Function} onUpdate Callback con la lista actualizada o elemento modificado
   * @returns {Object} Canal de Supabase
   */
  subscribeToLiveUpdates(onUpdate) {
    if (this._channel) {
      return this._channel;
    }

    this._channel = supabase
      .channel('macro_liquidity_live_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.MACRO_LIQUIDITY },
        payload => {
          if (payload.new) {
            const updated = payload.new;
            const idx = this._items.findIndex(i => i.symbol === updated.symbol);
            if (idx >= 0) {
              this._items[idx] = updated;
            } else {
              this._items.push(updated);
            }
            if (typeof onUpdate === 'function') {
              onUpdate(this._items, updated);
            }
          }
        }
      )
      .subscribe();

    return this._channel;
  }

  /**
   * Desconecta el canal de Realtime.
   */
  unsubscribe() {
    if (this._channel) {
      supabase.removeChannel(this._channel);
      this._channel = null;
    }
  }
}

export const macroLiquidityService = new MacroLiquidityService();
