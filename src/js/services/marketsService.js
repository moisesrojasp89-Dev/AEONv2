/* ============================================================
   AEON · services/marketsService.js — Institutional Markets Service
   Gestión de datos de mercado con Failover y Supabase Realtime
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

// Snapshot inicial de respaldo integrado para resiliencia offline instantánea
const FALLBACK_SNAPSHOT = [
  {
    symbol: "SPX500", category: "INDICES", display_name: "S&P 500", session_origin: "US",
    current_price: 7730.99, change_24h_pct: 0.95, bias: "BULLISH", bias_score: 92,
    support_1: 7674.18, resistance_1: 7764.53, dpoc_price: 7675.5, session_vwap: 7719.13,
    macro_driver: "Flujo comprador institucional activo por encima del dPOC y Session VWAP.",
    technical_thesis: "Estructura alcista con soporte clave en 7674.18 proyectando expansión a 7764.53.",
    catalyst_tags: ["BULLISH_FLOW", "VWAP_SUPPORT", "DPOC_EXPANSION"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "NAS100", category: "INDICES", display_name: "Nasdaq 100", session_origin: "US",
    current_price: 29622.0, change_24h_pct: -0.08, bias: "BULLISH", bias_score: 92,
    support_1: 29446.5, resistance_1: 29752.75, dpoc_price: 29599.0, session_vwap: 29570.72,
    macro_driver: "Flujo comprador institucional activo por encima del dPOC y Session VWAP.",
    technical_thesis: "Estructura alcista con soporte clave en 29446.5 proyectando expansión a 29752.75.",
    catalyst_tags: ["BULLISH_FLOW", "TECH_MOMENTUM"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "US30", category: "INDICES", display_name: "Dow Jones 30", session_origin: "US",
    current_price: 53569.44, change_24h_pct: 0.25, bias: "BULLISH", bias_score: 92,
    support_1: 53374.17, resistance_1: 53736.17, dpoc_price: 53464.84, session_vwap: 53557.59,
    macro_driver: "Flujo comprador institucional activo por encima del dPOC y Session VWAP.",
    technical_thesis: "Estructura alcista con soporte clave en 53374.17 proyectando expansión a 53736.17.",
    catalyst_tags: ["INDUSTRIAL_FLOW", "WALL_STREET"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "JP225", category: "INDICES", display_name: "Nikkei 225", session_origin: "ASIA",
    current_price: 66131.98, change_24h_pct: 0.86, bias: "BULLISH", bias_score: 85,
    support_1: 64842.73, resistance_1: 67187.95, dpoc_price: 65862.95, session_vwap: 66210.56,
    macro_driver: "Apetito por riesgo en la sesión asiática con soporte firme en 64842.73.",
    technical_thesis: "Consolidación sobre el dPOC proyectando búsqueda de máximos en 67187.95.",
    catalyst_tags: ["TOKYO_SESSION", "BOJ", "RISK_ON"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "XAUUSD", category: "METALS", display_name: "Oro al Contado", session_origin: "GLOBAL",
    current_price: 4655.4, change_24h_pct: -0.47, bias: "BEARISH", bias_score: 85,
    support_1: 4615.03, resistance_1: 4696.73, dpoc_price: 4685.28, session_vwap: 4653.28,
    macro_driver: "Presión vendedora dominante cotizando bajo la línea de Session VWAP.",
    technical_thesis: "Rechazo en zona de resistencia 4696.73 con objetivo en soporte 4615.03.",
    catalyst_tags: ["BEARISH_PRESSURE", "VWAP_REJECTION"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "BTCUSD", category: "CRYPTO", display_name: "Bitcoin", session_origin: "GLOBAL",
    current_price: 80382.85, change_24h_pct: 1.72, bias: "BULLISH", bias_score: 92,
    support_1: 79003.07, resistance_1: 81305.68, dpoc_price: 78686.15, session_vwap: 79728.52,
    macro_driver: "Flujo comprador institucional activo por encima del dPOC y Session VWAP.",
    technical_thesis: "Estructura alcista con soporte clave en 79003.07 proyectando expansión a 81305.68.",
    catalyst_tags: ["BULLISH_FLOW", "CRYPTO_MOMENTUM"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "DXY", category: "FOREX", display_name: "Dólar Index (DXY)", session_origin: "US",
    current_price: 99.129, change_24h_pct: 0.02, bias: "BULLISH", bias_score: 85,
    support_1: 99.046, resistance_1: 99.236, dpoc_price: 99.125, session_vwap: 99.158,
    macro_driver: "Consolidación alcista del dólar americano sobre soporte de 99.046.",
    technical_thesis: "Estructura lateral con sesgo comprador leve hacia 99.236.",
    catalyst_tags: ["DXY_STRENGTH", "FED_YIELDS"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "EURUSD", category: "FOREX", display_name: "Euro / Dólar", session_origin: "EUROPE",
    current_price: 1.16591, change_24h_pct: -0.01, bias: "NEUTRAL", bias_score: 50,
    support_1: 1.1646, resistance_1: 1.16677, dpoc_price: 1.16571, session_vwap: 1.16551,
    macro_driver: "Consolidación en rango equilibrado alrededor del punto de control dPOC.",
    technical_thesis: "Precio oscilando entre el soporte 1.1646 y la resistencia 1.16677.",
    catalyst_tags: ["RANGE_CONSOLIDATION", "ECB_WAIT"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "USDJPY", category: "FOREX", display_name: "Dólar / Yen Japonés", session_origin: "ASIA",
    current_price: 159.349, change_24h_pct: 0.11, bias: "BULLISH", bias_score: 85,
    support_1: 159.129, resistance_1: 159.547, dpoc_price: 159.361, session_vwap: 159.346,
    macro_driver: "Divergencia de política monetaria manteniendo presión alcista en el par.",
    technical_thesis: "Soporte dinámico en 159.129 con objetivo en resistencia de 159.547.",
    catalyst_tags: ["YEN_WEAKNESS", "BOJ_POLICY"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "GBPUSD", category: "FOREX", display_name: "Libra / Dólar", session_origin: "EUROPE",
    current_price: 1.35958, change_24h_pct: 0.03, bias: "NEUTRAL", bias_score: 50,
    support_1: 1.35774, resistance_1: 1.3608, dpoc_price: 1.35927, session_vwap: 1.35885,
    macro_driver: "Equilibrio de liquidez en apertura europea.",
    technical_thesis: "Rango delimitado entre soporte 1.35774 y resistencia 1.3608.",
    catalyst_tags: ["BOE_NEUTRAL", "LONDON_OPEN"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "USDCAD", category: "FOREX", display_name: "Dólar / Dólar Canadiense", session_origin: "US",
    current_price: 1.38525, change_24h_pct: -0.15, bias: "BEARISH", bias_score: 85,
    support_1: 1.3836, resistance_1: 1.388, dpoc_price: 1.38621, session_vwap: 1.38681,
    macro_driver: "Fortaleza relativa de materias primas impulsando al dólar canadiense.",
    technical_thesis: "Rechazo en 1.3880 con proyección hacia soporte de 1.3836.",
    catalyst_tags: ["COMMODITY_FX", "BOC"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "AUDUSD", category: "FOREX", display_name: "Dólar Australiano / Dólar", session_origin: "ASIA",
    current_price: 0.71974, change_24h_pct: 0.20, bias: "BULLISH", bias_score: 92,
    support_1: 0.71834, resistance_1: 0.72056, dpoc_price: 0.71826, session_vwap: 0.71905,
    macro_driver: "Apetito por riesgo y demanda de exportaciones australianas.",
    technical_thesis: "Ruptura alcista sobre el dPOC con soporte en 0.71834 y target en 0.72056.",
    catalyst_tags: ["RBA_HAWKISH", "RISK_ON"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "NZDUSD", category: "FOREX", display_name: "Dólar Neozelandés / Dólar", session_origin: "ASIA",
    current_price: 0.59527, change_24h_pct: 0.07, bias: "NEUTRAL", bias_score: 50,
    support_1: 0.59418, resistance_1: 0.59612, dpoc_price: 0.59487, session_vwap: 0.59503,
    macro_driver: "Consolidación en rango equilibrado en sesión asiática.",
    technical_thesis: "Oscilación controlada entre soporte 0.59418 y resistencia 0.59612.",
    catalyst_tags: ["RBNZ_NEUTRAL", "ASIA_PACIFIC"],
    last_updated: new Date().toISOString()
  },
  {
    symbol: "USDCHF", category: "FOREX", display_name: "Dólar / Franco Suizo", session_origin: "EUROPE",
    current_price: 0.80392, change_24h_pct: -0.16, bias: "NEUTRAL", bias_score: 50,
    support_1: 0.80239, resistance_1: 0.80579, dpoc_price: 0.8039, session_vwap: 0.8047,
    macro_driver: "Flujos de refugio manteniendo equilibrio en el franco suizo.",
    technical_thesis: "Rango estrecho entre soporte 0.80239 y resistencia 0.80579.",
    catalyst_tags: ["SNB_STABILITY", "SAFE_HAVEN"],
    last_updated: new Date().toISOString()
  }
];

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
