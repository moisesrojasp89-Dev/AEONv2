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
    n.includes('price index') || n.includes('consumer price') || n.includes('trimmed mean')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX500', 'NAS100'] :
      country === 'EUR' ? ['EUR/USD', 'EUR/GBP', 'DXY', 'XAU/USD'] :
      country === 'GBP' ? ['GBP/USD', 'EUR/GBP', 'DXY'] :
      country === 'JPY' ? ['USD/JPY', 'EUR/JPY', 'DXY'] :
      country === 'AUD' ? ['AUD/USD', 'DXY', 'XAU/USD'] :
      country === 'CAD' ? ['USD/CAD', 'DXY'] :
      [`${country}/USD`, 'DXY', 'XAU/USD'];

    const isCore = n.includes('core');
    const isPCE  = n.includes('pce');
    const isPPI  = n.includes('ppi');
    const isTrimmed = n.includes('trimmed') || n.includes('median');

    let what = '';
    if (isPCE && country === 'USD') {
      what = 'PCE (Personal Consumption Expenditures): es el indicador de inflación preferido por la Reserva Federal (Fed) para calibrar su política monetaria. A diferencia del CPI, el PCE ajusta por cambios en el comportamiento del consumidor. Un PCE por encima del objetivo del 2% de la Fed = más presión para mantener o subir tasas = USD más fuerte, Oro bajo presión.';
    } else if (isCore && country === 'USD') {
      what = 'CPI Subyacente (Core CPI): excluye alimentos y energía por ser volátiles. Es la lectura que más pesa en las decisiones de la Fed porque muestra la tendencia inflacionaria estructural. Dato clave del segundo martes de cada mes. Sorpresa al alza = presión bajista en Oro y acciones, alcista en USD.';
    } else if (isPPI) {
      what = 'Índice de Precios al Productor (PPI): mide la inflación en el origen del ciclo productivo (antes de llegar al consumidor). Anticipa el CPI por 1–2 meses. Un PPI elevado sugiere que los productores trasladarán costes más altos al consumidor final, manteniendo la presión inflacionaria.';
    } else if (isTrimmed) {
      what = `CPI Trimmed Mean o Median de ${country}: versión suavizada del CPI que elimina los valores extremos (los componentes más volátiles) para mostrar la tendencia central de la inflación. Utilizado como referencia por el banco central de ${country} para decisiones de tipos.`;
    } else {
      what = `IPC (Índice de Precios al Consumidor) de ${country}: mide la variación media de los precios que paga el consumidor por una cesta representativa de bienes y servicios. Si supera el objetivo del banco central (normalmente 2%), aumenta la presión para subir tasas, fortaleciendo la divisa. Si cae por debajo, abre la puerta a recortes y debilita la moneda.`;
    }

    return {
      category: 'Inflación',
      what,
      affectedAssets: assets,
      volatilityPips: impact === 'HIGH' ? '40–90 pips' : '15–40 pips',
    };
  }

  /* ---- Labour market ---- */
  if (
    n.includes('non-farm') || n.includes('nonfarm') || n.includes('payroll') ||
    n.includes('unemployment') || n.includes('desempleo') || n.includes('jobless') ||
    n.includes('adp') || n.includes('employment change') || n.includes('labor') ||
    n.includes('labour') || n.includes('cambio de empleo') || n.includes('claimant') ||
    n.includes('average hourly') || n.includes('wages')
  ) {
    const assets =
      country === 'USD' ? ['DXY', 'XAU/USD', 'EUR/USD', 'SPX500', 'US30'] :
      country === 'EUR' ? ['EUR/USD', 'EUR/GBP', 'DXY'] :
      country === 'GBP' ? ['GBP/USD', 'EUR/GBP'] :
      country === 'AUD' ? ['AUD/USD', 'DXY', 'XAU/USD'] :
      country === 'CAD' ? ['USD/CAD', 'DXY'] :
      country === 'NZD' ? ['NZD/USD', 'DXY'] :
      [`${country}/USD`, 'DXY'];

    // More specific description for NFP
    const isNFP = n.includes('non-farm') || n.includes('nonfarm') || n.includes('payroll');
    const isADP = n.includes('adp');
    const isHourlyEarnings = n.includes('hourly') || n.includes('wages');
    const isUnemployment = n.includes('unemployment') || n.includes('jobless') || n.includes('claimant');

    let what = '';
    if (isNFP && country === 'USD') {
      what = 'Nóminas No Agrícolas (NFP): mide la variación neta de empleados en todos los sectores de EE.UU. excepto agricultura, gobierno, domésticos y autónomos (≈80% de la fuerza laboral que contribuye al PIB). Publicado el primer viernes de cada mes por la Oficina de Estadísticas Laborales (BLS). Es el dato de empleo de mayor impacto global: un resultado débil debilita el USD y presiona a la Fed a recortar tasas; uno sólido fortalece el USD y aleja los recortes.';
    } else if (isADP) {
      what = 'Encuesta de empleo privado publicada por ADP dos días antes del NFP oficial. Actúa como adelanto al mercado y puede mover el USD con fuerza si diverge mucho del consenso. No incluye empleo gubernamental.';
    } else if (isHourlyEarnings) {
      what = 'Mide la variación mensual en los salarios por hora en el sector no agrícola. Dato clave de presión inflacionaria salarial: salarios al alza = más inflación futura = Fed más hawkish = USD más fuerte. Se publica junto al NFP el primer viernes del mes.';
    } else if (isUnemployment) {
      what = 'Tasa de desempleo o número de solicitudes de subsidio por desempleo. El mandato dual de la Fed (empleo máximo + estabilidad de precios) hace que un aumento del paro abra la puerta a recortes de tasas, debilitando el USD. El nivel "natural" de pleno empleo está aproximadamente entre 3.5% y 4.5%.';
    } else {
      what = `Datos de empleo de ${country}. El mercado laboral es uno de los dos mandatos principales de los bancos centrales. Una lectura mejor de lo esperado refuerza la divisa al alejar los recortes de tasas; una peor la debilita.`;
    }

    return {
      category: 'Mercado Laboral',
      what,
      affectedAssets: assets,
      volatilityPips: isNFP ? '50–130 pips' : impact === 'HIGH' ? '40–90 pips' : '15–40 pips',
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
