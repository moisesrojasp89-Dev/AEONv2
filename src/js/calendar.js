/* ============================================================
   AEON — calendar.js
   Lógica de renderizado del Calendario Económico
   ============================================================ */

import { initNavbar } from './navbar.js';
import { calendarRow } from './templates/calendarItem.js';
import { supabase } from './supabaseClient.js';
import { checkSession } from './auth.js';

let globalEvents = [];

function formatLocalTime(utcDateStr) {
  const d = new Date(utcDateStr);
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 3);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${weekday.toUpperCase()} ${time}`;
}

function renderEvents(filterVal = 'all') {
  const container = document.getElementById('calendar-feed');
  if (!container) return;

  // Filter
  let filtered = globalEvents;
  if (filterVal === 'majors') {
    const majors = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
    filtered = globalEvents.filter(e => majors.includes(e.country));
  } else if (filterVal !== 'all') {
    filtered = globalEvents.filter(e => e.country === filterVal);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay eventos macro programados para esta selección.</div>';
    return;
  }

  const mappedEvents = filtered.map(dbEvt => ({
    time: formatLocalTime(dbEvt.event_time),
    assets: [dbEvt.country],
    impact: dbEvt.impact.toUpperCase(),
    event: dbEvt.event_name,
    actual: dbEvt.actual || 'Pendiente',
    forecast: dbEvt.forecast || '-',
    previous: dbEvt.previous || '-',
    description: `Impacto: ${dbEvt.impact}. Evento oficial para ${dbEvt.country}. Datos gestionados en tiempo real.`
  }));

  const html = mappedEvents.map((evt, index) => calendarRow(evt, index)).join('');
  container.innerHTML = html;
}

async function fetchCalendar() {
  const container = document.getElementById('calendar-feed');
  if (!container) return;

  try {
    const { data: events, error } = await supabase
      .from('economic_calendar')
      .select('*')
      .order('event_time', { ascending: true });

    if (error) throw error;
    globalEvents = events || [];
    renderEvents(document.getElementById('calendar-filter')?.value || 'all');
  } catch (err) {
    console.error('[AEON] Error al obtener calendario desde Supabase:', err);
    container.innerHTML = `<div class="empty-state" style="color: red;">Error crítico de DB: ${err.message}</div>`;
  }
}

// Delegación de eventos (una sola vez)
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
        grp.classList.toggle('open');
      }
    }
  });
}

function initCalendarFilter() {
  const sel = document.getElementById('calendar-filter');
  if (sel) {
    sel.addEventListener('change', (e) => {
      renderEvents(e.target.value);
    });
  }
}

function initTradingViewWidget() {
  const container = document.getElementById('tv-dxy-widget');
  if (!container) return;
  const script = document.createElement('script');
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    "symbol": "CAPITALCOM:DXY",
    "width": "100%",
    "height": "100%",
    "locale": "es",
    "dateRange": "1D",
    "colorTheme": "dark",
    "isTransparent": true,
    "autosize": true,
    "largeChartUrl": ""
  });
  container.appendChild(script);
}

async function initApp() {
  checkSession();
  initNavbar();
  initCalendarFilter();
  await fetchCalendar();
  initTradingViewWidget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
