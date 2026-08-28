/* ============================================================
   AEON — calendar.js — Economic Calendar & Macro Controller
   ============================================================ */

import { initNavbar } from './navbar.js';
import { calendarRow } from './templates/calendarItem.js';
import { fetchCalendarEvents } from './services/calendarService.js';
import { checkSession } from './auth.js';
import { escapeHTML } from './utils/sanitize.js';
import { supabase } from './supabaseClient.js';
import { DB_TABLES } from './config/constants.js';

import fallbackCalendarData from '../data/economic_calendar_snapshot.json';

let globalEvents = [];
let liveCountdownStarted = false;

function formatLocalTime(utcDateStr) {
  const d = new Date(utcDateStr);
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 3);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  return {
    date: `${weekday.toUpperCase()} ${dayNum}/${monthNum}`,
    time: time,
  };
}

function isToday(dateObj) {
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

function isThisWeek(dateObj) {
  const today = new Date();
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
  firstDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(firstDay);
  lastDay.setDate(lastDay.getDate() + 6);
  lastDay.setHours(23, 59, 59, 999);
  return dateObj >= firstDay && dateObj <= lastDay;
}

function isThisMonth(dateObj) {
  const today = new Date();
  if (
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  ) {
    return true;
  }
  // Tolerancia para sincronización de reloj de cliente
  const diffDays = Math.abs((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 35;
}

function updateNextCatalyst() {
  const container = document.querySelector('.catalyst-box');
  if (!container || !globalEvents || globalEvents.length === 0) return;

  const now = new Date();
  // 1. Buscar próximo catalizador mayor (Alto Impacto) a futuro
  const nextEvent = globalEvents.find((e) => {
    return String(e.impact || '').toUpperCase() === 'HIGH' && new Date(e.event_time) > now;
  });

  if (!nextEvent) {
    // 2. Si no hay próximo de Alto Impacto, buscar cualquier próximo a futuro
    const anyNext = globalEvents.find((e) => new Date(e.event_time) > now);
    if (anyNext) {
      renderCatalystCard(container, anyNext, now);
      return;
    }

    // 3. Si ya ocurrieron todos los catalizadores de la jornada, mostrar el último de Alto Impacto publicado
    const lastPastHigh = [...globalEvents].reverse().find((e) => {
      const imp = String(e.impact || '').toUpperCase();
      return (imp === 'HIGH' || imp === 'MEDIUM') && new Date(e.event_time) <= now;
    });

    if (lastPastHigh) {
      const isBeat = lastPastHigh.actual && lastPastHigh.forecast && parseFloat(lastPastHigh.actual) >= parseFloat(lastPastHigh.forecast);
      container.innerHTML = `
        <span class="c-timer" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">DATO PUBLICADO HOY</span>
        <h4 class="c-event" style="margin-top: 0.5rem;">${escapeHTML(lastPastHigh.country || '')} · ${escapeHTML(lastPastHigh.event_name || '')}</h4>
        <p class="c-desc" style="margin-bottom: 0.5rem;">
          Actual: <strong style="color: ${isBeat ? '#10b981' : '#f8fafc'}; font-size: 1rem;">${escapeHTML(lastPastHigh.actual || 'Publicado')}</strong> · Cons: <strong>${escapeHTML(lastPastHigh.forecast || '—')}</strong> · Prev: <strong style="color: var(--muted);">${escapeHTML(lastPastHigh.previous || '—')}</strong>
        </p>
        <p class="c-desc">Publicación procesada por el radar macro de AEON. Reacción absorbida por el mercado en la sesión activa.</p>
      `;
      return;
    }

    container.innerHTML = `<p class="c-desc" style="text-align:center; padding: 1rem 0;">No hay catalizadores pendientes esta semana.</p>`;
    return;
  }

  renderCatalystCard(container, nextEvent, now);
}

function renderCatalystCard(container, event, now) {
  const eventTime = new Date(event.event_time);
  const diffMs = eventTime - now;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let countdownText = '';
  if (diffHrs > 24) {
    const days = Math.floor(diffHrs / 24);
    const remainHrs = diffHrs % 24;
    countdownText = `FALTAN ${days}D ${remainHrs.toString().padStart(2, '0')}H`;
  } else if (diffHrs > 0 || diffMins > 0) {
    countdownText = `FALTAN ${diffHrs.toString().padStart(2, '0')}H ${diffMins.toString().padStart(2, '0')}M`;
  } else {
    countdownText = 'EN CURSO / EN VIVO';
  }

  container.innerHTML = `
    <span class="c-timer">${escapeHTML(countdownText)}</span>
    <h4 class="c-event">${escapeHTML(event.country)} · ${escapeHTML(event.event_name)}</h4>
    <p class="c-desc" style="margin-bottom: 0.75rem;">Consenso: <strong style="color: #fff;">${escapeHTML(event.forecast || '—')}</strong> · Previo: <strong style="color: var(--muted);">${escapeHTML(event.previous || '—')}</strong></p>
    <p class="c-desc">Evento de Alta Volatilidad. Alta probabilidad de expansión de spreads y desplazamiento de liquidez en apertura de sesión.</p>
  `;
}

function startLiveCountdowns() {
  setInterval(() => {
    updateNextCatalyst();
  }, 10000);
}

// Common acronym / alias map so users can type "NFP", "PMI", "PCE", etc.
const SEARCH_ALIASES = {
  'nfp':      'non-farm',
  'nonfarm':  'non-farm',
  'jobs':     'employment',
  'claims':   'jobless claims',
  'fomc':     'fomc',
  'fed':      'fed',
  'ecb':      'ecb',
  'boe':      'boe',
  'rba':      'rba',
  'boj':      'boj',
  'snb':      'snb',
  'rbnz':     'rbnz',
  'gdp':      'gdp',
  'pib':      'gdp',
  'cpi':      'cpi',
  'ppi':      'ppi',
  'pce':      'pce',
  'pmi':      'pmi',
  'ism':      'ism',
  'adp':      'adp',
  'jolts':    'jolts',
  'jolt':     'jolts',
  'retail':   'retail',
  'payroll':  'payroll',
  'pcpi':     'core',
  'tasa':     'rate',
};

function normaliseSearch(raw) {
  const s = raw.toLowerCase().trim();
  return SEARCH_ALIASES[s] ?? s;
}

function renderEvents() {
  const container = document.getElementById('calendar-feed');
  const currencyFilter = document.getElementById('calendar-filter')?.value || 'all';
  const dateFilter     = document.getElementById('calendar-date-filter')?.value || 'month';
  const impactFilter   = document.getElementById('calendar-impact-filter')?.value || 'medium-high';
  const rawSearch      = document.getElementById('calendar-search-input')?.value || '';
  const searchInput    = normaliseSearch(rawSearch);

  if (!container) return;

  let filtered = globalEvents;

  // 1. Filtro de Moneda
  if (currencyFilter !== 'all') {
    filtered = filtered.filter((e) => e.country === currencyFilter);
  }

  // 2. Filtro de Impacto
  if (impactFilter === 'HIGH') {
    filtered = filtered.filter((e) => String(e.impact || '').toUpperCase() === 'HIGH');
  } else if (impactFilter === 'MEDIUM') {
    filtered = filtered.filter((e) => String(e.impact || '').toUpperCase() === 'MEDIUM');
  } else if (impactFilter === 'medium-high') {
    // default: Medium + High, excluye Low
    filtered = filtered.filter((e) => {
      const imp = String(e.impact || '').toUpperCase();
      return imp === 'HIGH' || imp === 'MEDIUM' || imp === 'MED';
    });
  }
  // 'all' → sin filtro

  // 3. Búsqueda de Texto con alias expandido
  if (searchInput) {
    filtered = filtered.filter(
      (e) =>
        (e.event_name || '').toLowerCase().includes(searchInput) ||
        (e.country || '').toLowerCase().includes(searchInput)
    );
  }

  // 4. Filtro de Rango de Fechas
  if (dateFilter !== 'all') {
    filtered = filtered.filter((dbEvt) => {
      const localDate = new Date(dbEvt.event_time);
      if (dateFilter === 'today') return isToday(localDate);
      if (dateFilter === 'week') return isThisWeek(localDate);
      if (dateFilter === 'month') return isThisMonth(localDate);
      return true;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 280px; text-align: center; opacity: 0.75; padding: 2rem;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--accent-dim); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; border: 1px solid var(--accent-border);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h3 style="font-family: var(--font-head); font-size: 1rem; color: #f8fafc; margin-bottom: 0.35rem;">Cero Eventos en este Filtro</h3>
        <p style="font-size: 0.85rem; color: var(--muted); max-width: 320px;">No se encontraron publicaciones macroeconómicas para el rango o divisa seleccionada.</p>
      </div>
    `;
    return;
  }

  const mappedEvents = filtered.map((dbEvt) => {
    const timeInfo = formatLocalTime(dbEvt.event_time);
    return {
      date: timeInfo.date,
      time: timeInfo.time,
      event_time: dbEvt.event_time,
      country: dbEvt.country,
      assets: [dbEvt.country],
      impact: String(dbEvt.impact || '').toUpperCase(),
      event_name: dbEvt.event_name,
      actual: dbEvt.actual || 'Pendiente',
      forecast: dbEvt.forecast || '—',
      previous: dbEvt.previous || '—',
    };
  });

  const html = mappedEvents.map((evt, index) => calendarRow(evt, index)).join('');
  container.innerHTML = html;
}

async function fetchCalendar() {
  const container = document.getElementById('calendar-feed');
  if (!container) return;

  try {
    globalEvents = await fetchCalendarEvents();
  } catch (err) {
    console.warn('[AEON] Error al obtener calendario de Supabase, usando snapshot local:', err);
    globalEvents = fallbackCalendarData;
  }

  if (!globalEvents || globalEvents.length === 0) {
    globalEvents = fallbackCalendarData;
  }

  renderEvents();
  updateNextCatalyst();
  if (!liveCountdownStarted) {
    startLiveCountdowns();
    liveCountdownStarted = true;
  }
}

// Delegación de eventos para acordeón interactivo
const calFeed = document.getElementById('calendar-feed');
if (calFeed && !calFeed.dataset.hasListener) {
  calFeed.dataset.hasListener = 'true';
  calFeed.addEventListener('click', (e) => {
    const row = e.target.closest('.eco-row');
    if (!row) return;
    const index = row.dataset.index;
    if (index !== undefined) {
      const grp = document.getElementById(`eco-grp-${index}`);
      if (grp) {
        const isOpen = grp.classList.toggle('open');
        row.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }
  });
}

function initCalendarFilters() {
  const selCurr = document.getElementById('calendar-filter');
  const selDate = document.getElementById('calendar-date-filter');
  const selImpact = document.getElementById('calendar-impact-filter');
  const searchInp = document.getElementById('calendar-search-input');

  if (selCurr) selCurr.addEventListener('change', renderEvents);
  if (selDate) selDate.addEventListener('change', renderEvents);
  if (selImpact) selImpact.addEventListener('change', renderEvents);
  if (searchInp) searchInp.addEventListener('input', renderEvents);
}

function initTradingViewWidget() {
  const container = document.getElementById('tv-dxy-widget');
  if (!container || container.dataset.initialized) return;
  container.dataset.initialized = 'true';
  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
  script.async = true;
  script.innerHTML = JSON.stringify({
    symbol: 'CAPITALCOM:DXY',
    width: '100%',
    height: '100%',
    locale: 'es',
    dateRange: '1D',
    colorTheme: 'dark',
    isTransparent: true,
    autosize: true,
    largeChartUrl: '',
  });
  container.appendChild(script);
}

function subscribeCalendarRealtime() {
  const channel = supabase.channel('public:economic_calendar')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: DB_TABLES.ECONOMIC_CALENDAR },
      async () => {
        console.log('[AEON] Cambio detectado en economic_calendar. Actualizando feed en vivo...');
        await fetchCalendar();
      }
    )
    .subscribe();

  return channel;
}

async function initApp() {
  checkSession();
  initNavbar();
  initCalendarFilters();
  await fetchCalendar();
  initTradingViewWidget();
  subscribeCalendarRealtime();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
