/* ============================================================
   AEON · services/calendarService.js — Economic Calendar Engine
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

const CALENDAR_CACHE_KEY = 'AEON_CALENDAR_CACHE_V2';

/**
 * Classifies an event name into a macro category and returns structured context.
 * All dynamic text uses event-specific data, NOT generic boilerplate.
 * @param {string} eventName
 * @param {string} country  - ISO currency code, e.g. 'USD', 'EUR'
 * @param {string} impact   - 'HIGH' | 'MEDIUM' | 'LOW'
 * @returns {{ category: string, what: string, affectedAssets: string[], volatilityPips: string }}
 */
export function getMacroImpactContext(eventName = '', country = 'USD', impact = 'HIGH') {
  const n = eventName.toLowerCase();

  /* ---- Inflation ---- */
  if (
    n.includes('cpi') || n.includes('ipc') || n.includes('pce') ||
    n.includes('ppi') || n.includes('inflation') || n.includes('inflación') ||
    n.includes('price index') || n.includes('consumer price')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'NAS100'] :
      country === 'EUR' ? ['EUR/USD', 'EUR/GBP', 'DXY', 'XAU/USD'] :
      country === 'GBP' ? ['GBP/USD', 'EUR/GBP', 'DXY'] :
      country === 'JPY' ? ['USD/JPY', 'EUR/JPY', 'DXY'] :
      [`${country}/USD`, 'DXY', 'XAU/USD'];
    return {
      category: 'Inflación',
      what: 'Mide la variación de precios al consumidor o productor. Indica si la presión inflacionaria sube, baja o se estabiliza, lo que condiciona directamente las decisiones de tipos de interés del banco central.',
      affectedAssets: assets,
      volatilityPips: impact === 'HIGH' ? '40–90 pips' : '15–40 pips',
    };
  }

  /* ---- Labour market ---- */
  if (
    n.includes('non-farm') || n.includes('nonfarm') || n.includes('payroll') ||
    n.includes('unemployment') || n.includes('desempleo') || n.includes('jobless') ||
    n.includes('adp') || n.includes('employment change') || n.includes('labor') ||
    n.includes('labour') || n.includes('cambio de empleo') || n.includes('claimant')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500', 'US30'] :
      country === 'EUR' ? ['EUR/USD', 'EUR/GBP', 'DXY'] :
      country === 'GBP' ? ['GBP/USD', 'EUR/GBP'] :
      [`${country}/USD`, 'DXY'];
    return {
      category: 'Mercado Laboral',
      what: 'Evalúa la creación de empleo, la tasa de desocupación y la tensión salarial. El mandato dual de los principales bancos centrales hace que estos datos sean de primera línea.',
      affectedAssets: assets,
      volatilityPips: impact === 'HIGH' ? '50–120 pips' : '20–50 pips',
    };
  }

  /* ---- Central banks / interest rates ---- */
  if (
    n.includes('interest rate') || n.includes('rate decision') || n.includes('rate statement') ||
    n.includes('tasa de interés') || n.includes('tipos de interés') ||
    n.includes('fomc') || n.includes('fed ') || n.includes('ecb') ||
    n.includes('boe') || n.includes('boj') || n.includes('boc') ||
    n.includes('rba') || n.includes('rbnz') || n.includes('snb') ||
    n.includes('monetary policy') || n.includes('política monetaria') ||
    n.includes('press conference') || n.includes('minutes')
  ) {
    return {
      category: 'Política Monetaria',
      what: 'Decisión de tipos de interés o actas/declaraciones del banco central. Es el catalizador de mayor impacto global: define el costo del dinero y el flujo de capitales entre divisas.',
      affectedAssets: ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'SPX500', 'BTC/USD'],
      volatilityPips: '80–180+ pips',
    };
  }

  /* ---- GDP / Growth ---- */
  if (
    n.includes('gdp') || n.includes('pib') || n.includes('gross domestic') ||
    n.includes('economic growth') || n.includes('crecimiento')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'SPX500', 'NAS100', 'XAU/USD', 'EUR/USD'] :
      country === 'EUR' ? ['EUR/USD', 'DAX', 'DXY'] :
      country === 'GBP' ? ['GBP/USD', 'FTSE', 'DXY'] :
      [`${country}/USD`, 'DXY'];
    return {
      category: 'Crecimiento Económico (PIB)',
      what: 'Mide el valor total de bienes y servicios producidos. Un PIB por encima del consenso señala expansión; por debajo, contracción y posible recesión.',
      affectedAssets: assets,
      volatilityPips: impact === 'HIGH' ? '35–70 pips' : '10–35 pips',
    };
  }

  /* ---- PMI / Manufacturing / Services ---- */
  if (
    n.includes('pmi') || n.includes('manufacturing') || n.includes('services pmi') ||
    n.includes('composite') || n.includes('industrial') || n.includes('factory')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'SPX500', 'EUR/USD'] :
      country === 'EUR' ? ['EUR/USD', 'DAX', 'DXY'] :
      country === 'GBP' ? ['GBP/USD', 'FTSE'] :
      [`${country}/USD`, 'DXY'];
    return {
      category: 'Actividad Manufacturera / PMI',
      what: 'El PMI (Índice de Gestores de Compras) sondea a empresas sobre producción, pedidos y empleo. Lecturas sobre 50 = expansión; bajo 50 = contracción. Anticipa el PIB.',
      affectedAssets: assets,
      volatilityPips: impact === 'HIGH' ? '25–60 pips' : '10–25 pips',
    };
  }

  /* ---- Retail sales / consumer spending ---- */
  if (
    n.includes('retail') || n.includes('ventas al por menor') || n.includes('consumer spending') ||
    n.includes('consumer confidence') || n.includes('confianza del consumidor') ||
    n.includes('sentiment')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'SPX500', 'EUR/USD'] :
      country === 'EUR' ? ['EUR/USD', 'DXY'] :
      country === 'GBP' ? ['GBP/USD', 'DXY'] :
      [`${country}/USD`, 'DXY'];
    return {
      category: 'Consumo & Confianza',
      what: 'Las ventas minoristas reflejan el gasto del consumidor (≈70% del PIB en economías desarrolladas). La confianza del consumidor anticipa el consumo futuro.',
      affectedAssets: assets,
      volatilityPips: impact === 'HIGH' ? '20–50 pips' : '10–25 pips',
    };
  }

  /* ---- Trade balance / current account ---- */
  if (
    n.includes('trade balance') || n.includes('balanza comercial') ||
    n.includes('current account') || n.includes('cuenta corriente') ||
    n.includes('import') || n.includes('export')
  ) {
    return {
      category: 'Balanza Comercial',
      what: 'Diferencia entre exportaciones e importaciones. Un superávit comercial tiende a apreciar la divisa; un déficit la debilita a largo plazo.',
      affectedAssets: [`${country}/USD`, 'DXY', 'XAU/USD'],
      volatilityPips: impact === 'HIGH' ? '20–45 pips' : '5–20 pips',
    };
  }

  /* ---- Housing / Real estate ---- */
  if (
    n.includes('housing') || n.includes('home') || n.includes('construction') ||
    n.includes('building permits') || n.includes('existing home') || n.includes('new home')
  ) {
    return {
      category: 'Sector Inmobiliario',
      what: 'Los datos de vivienda reflejan la salud del crédito y la política de tipos: tasas altas contraen el sector; tasas bajas lo expanden.',
      affectedAssets: country === 'USD' ? ['DXY', 'SPX500', 'XAU/USD'] : [`${country}/USD`, 'DXY'],
      volatilityPips: impact === 'HIGH' ? '15–40 pips' : '5–15 pips',
    };
  }

  /* ---- Generic fallback ---- */
  const genericAssets =
    country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD'] :
    country === 'EUR' ? ['EUR/USD', 'DXY'] :
    country === 'GBP' ? ['GBP/USD', 'DXY'] :
    country === 'JPY' ? ['USD/JPY', 'DXY'] :
    country === 'CHF' ? ['USD/CHF', 'EUR/CHF', 'DXY'] :
    country === 'CAD' ? ['USD/CAD', 'DXY', 'OIL'] :
    country === 'AUD' ? ['AUD/USD', 'DXY', 'XAU/USD'] :
    country === 'NZD' ? ['NZD/USD', 'DXY'] :
    [`${country}/USD`, 'DXY'];

  return {
    category: 'Indicador Económico',
    what: `Publicación de datos macroeconómicos de ${country}. Lecturas fuera del consenso generan reacción de precios en los activos relacionados con esta divisa.`,
    affectedAssets: genericAssets,
    volatilityPips: impact === 'HIGH' ? '30–60 pips' : impact === 'MEDIUM' ? '10–30 pips' : '5–15 pips',
  };
}

/**
 * Fetches all economic calendar events from Supabase, with session-storage cache fallback.
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
      try { sessionStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(events)); } catch (_) {}
      return events;
    }
  } catch (err) {
    console.warn('[AEON] fetchCalendarEvents error, using cache:', err.message);
  }

  try {
    const cached = sessionStorage.getItem(CALENDAR_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  return [];
}
