/* ============================================================
   AEON · calendar.js
   Lógica de renderizado del Calendario Económico
   ============================================================ */

import { initNavbar } from './navbar.js';
import data from '../data/markets.json';
import { calendarRow } from './templates/calendarItem.js';
import { supabase } from './supabaseClient.js';
import { checkSession } from './auth.js';


// Helper para convertir UTC a Hora Local en formato HH:MM
function formatLocalTime(utcDateStr) {
  const d = new Date(utcDateStr);
  // Get short weekday (ej: 'lun', 'mar') and time in local timezone
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 3);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${weekday.toUpperCase()} ${time}`; // Ej: LUN 14:30
}

async function renderCalendar() {
  const container = document.getElementById('calendar-feed');
  if (!container) return;

  try {
    // 1. Obtener datos reales de Supabase (Fase 6)
    const { data: events, error } = await supabase
      .from('economic_calendar')
      .select('*')
      .order('event_time', { ascending: true });

    if (error) throw error;
    
    if (!events || events.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay eventos macro de alto impacto esta semana.</div>';
      return;
    }

    // 2. Mapear datos al formato que espera el template
    const mappedEvents = events.map(dbEvt => ({
      time: formatLocalTime(dbEvt.event_time),
      assets: [dbEvt.country], // 'USD', 'EUR', etc
      impact: dbEvt.impact.toUpperCase(), // 'HIGH' o 'MEDIUM'
      event: dbEvt.event_name,
      actual: dbEvt.actual || 'Pendiente',
      forecast: dbEvt.forecast || '-',
      previous: dbEvt.previous || '-',
      description: `Impacto: ${dbEvt.impact}. Evento oficial para ${dbEvt.country}. Datos gestionados en tiempo real.`
    }));

    // 3. Renderizar
    const html = mappedEvents.map((evt, index) => calendarRow(evt, index)).join('');
    container.innerHTML = html;
  } catch (err) {
    console.error('[AEON] Error al renderizar calendario desde Supabase:', err);
    container.innerHTML = `<div class="empty-state" style="color: red;">Error crítico de renderizado DB: ${err.message}</div>`;
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

// checkSession local eliminado

async function initApp() {
  checkSession(); // No bloquear el renderizado
  initNavbar();
  renderCalendar();
  initTradingViewWidget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
