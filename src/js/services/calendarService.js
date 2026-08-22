/* ============================================================
   AEON · services/calendarService.js — Economic Calendar & Macro Engine
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

const CALENDAR_CACHE_KEY = 'AEON_CALENDAR_CACHE_V1';

/**
 * Generates macroeconomic context, transmission mechanisms, and affected assets for any event.
 * @param {string} eventName
 * @param {string} country
 * @param {string} impact
 * @returns {Object}
 */
export function getMacroImpactContext(eventName = '', country = 'USD', impact = 'HIGH') {
  const name = eventName.toLowerCase();
  
  // 1. Inflación (CPI, PPI, PCE)
  if (name.includes('cpi') || name.includes('ipc') || name.includes('pce') || name.includes('infla') || name.includes('ppi')) {
    return {
      category: 'Inflación',
      summary: 'Mide la evolución de precios al consumidor. Factor crítico para las decisiones de política monetaria y tasas de interés de los bancos centrales.',
      bullishScenario: `Dato superior al consenso presiona al alza las tasas de interés, fortaleciendo el ${country} y generando presión bajista sobre el Oro (XAU/USD) y los Índices.`,
      bearishScenario: `Dato inferior al consenso sugiere desaceleración inflacionaria, debilitando el ${country} e impulsando repuntes en el Oro y Renta Variable.`,
      affectedAssets: country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500', 'NAS100'] : [`${country}/USD`, 'EUR/USD', 'DXY'],
      volatility: 'Muy Alta (45 - 90 pips)',
    };
  }

  // 2. Empleo y Mercado Laboral (NFP, Unemployment, Jobless Claims, ADP)
  if (name.includes('non-farm') || name.includes('payroll') || name.includes('unemployment') || name.includes('empleo') || name.includes('jobless') || name.includes('adp')) {
    return {
      category: 'Mercado Laboral',
      summary: 'Evalúa la salud del empleo y la creación de puestos de trabajo. El mandato dual de los bancos centrales vigila estrechamente la tensión laboral.',
      bullishScenario: `Creación de empleo sólida y baja tasa de desempleo fortalecen el ${country} por expectativas de tipos sostenidos.`,
      bearishScenario: `Debilidad en nóminas o aumento del paro debilita el ${country} e incentiva compras de activos refugio.`,
      affectedAssets: country === 'USD' ? ['XAU/USD', 'EUR/USD', 'US30', 'SPX500', 'DXY'] : [`${country}/USD`, 'DXY'],
      volatility: 'Muy Alta (50 - 110 pips)',
    };
  }

  // 3. Tasas de Interés y Bancos Centrales (FED, ECB, BOE, BOJ, SNB, Rate Decision)
  if (name.includes('rate') || name.includes('tasa') || name.includes('fed') || name.includes('fomc') || name.includes('ecb') || name.includes('boe') || name.includes('monetary')) {
    return {
      category: 'Política Monetaria',
      summary: 'Decisión oficial de tipos de interés y orientación futura (Forward Guidance). El catalizador macro de mayor impacto global.',
      bullishScenario: `Subida o postura Hawkish (restrictiva) impulsa masivamente el ${country}, provocando caídas en materias primas y criptomonedas.`,
      bearishScenario: `Recorte o postura Dovish (acomodaticia) debilita el ${country} y dispara la liquidez hacia el Oro, Acciones y Cripto.`,
      affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'BTC/USD'],
      volatility: 'Extrema (80 - 150+ pips)',
    };
  }

  // 4. Actividad Económica & Crecimiento (GDP / PIB, Retail Sales / Ventas Minoristas, PMI)
  if (name.includes('gdp') || name.includes('pib') || name.includes('pmi') || name.includes('retail') || name.includes('ventas') || name.includes('manufacturing') || name.includes('services')) {
    return {
      category: 'Actividad Económica',
      summary: 'Mide el ritmo de expansión o contracción del sector productivo, consumo de los hogares y actividad empresarial.',
      bullishScenario: `Lecturas por encima de 50 o del consenso indican expansión económica, sosteniendo el valor del ${country}.`,
      bearishScenario: `Contracción económica alimenta temores de recesión, debilitando las divisas pro-cíclicas.`,
      affectedAssets: country === 'USD' ? ['SPX500', 'NAS100', 'EUR/USD', 'XAU/USD'] : [`${country}/USD`, 'DXY'],
      volatility: 'Moderada / Alta (30 - 60 pips)',
    };
  }

  // 5. Genérico
  return {
    category: 'Indicador Macroeconómico',
    summary: `Publicación de datos económicos oficiales para la economía de ${country}.`,
    bullishScenario: `Lectura positiva respecto a previsiones favorece compras institucionales del ${country}.`,
    bearishScenario: `Lectura negativa incrementa la cautela y presión vendedora sobre el ${country}.`,
    affectedAssets: [`${country}/USD`, 'DXY', 'XAU/USD'],
    volatility: impact === 'HIGH' ? 'Alta (35 - 70 pips)' : 'Moderada (15 - 35 pips)',
  };
}

/**
 * Fetches all economic calendar events from Supabase or cached storage.
 * @returns {Promise<Array>}
 */
export async function fetchCalendarEvents() {
  try {
    const { data: events, error } = await supabase
      .from(DB_TABLES.ECONOMIC_CALENDAR)
      .select('*')
      .order('event_time', { ascending: true });

    if (error) throw error;

    if (Array.isArray(events) && events.length > 0) {
      try {
        sessionStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(events));
      } catch (_) {}
      return events;
    }
  } catch (err) {
    console.warn('[AEON] Error en fetchCalendarEvents, recurriendo a caché:', err.message);
  }

  try {
    const cached = sessionStorage.getItem(CALENDAR_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  return [];
}
