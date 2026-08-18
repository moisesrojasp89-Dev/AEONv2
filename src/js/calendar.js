/* ============================================================
   AEON · calendar.js
   Lógica de renderizado del Calendario Económico
   ============================================================ */

import { initNavbar } from './navbar.js';
import data from '../data/markets.json';
import { calendarRow } from './templates/calendarItem.js';
import { supabase } from './supabaseClient.js';
import { checkSession } from './auth.js';

function renderCalendar() {
  const container = document.getElementById('calendar-feed');
  if (!container) return;

  const events = data.calendar || [];
  
  if (events.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay eventos macro de alto impacto esta semana.</div>';
    return;
  }

  try {
    const html = events.map((evt, index) => calendarRow(evt, index)).join('');
    container.innerHTML = html;
  } catch (err) {
    console.error('[AEON] Error al renderizar filas del calendario:', err);
    container.innerHTML = `<div class="empty-state" style="color: red;">Error crítico de renderizado: ${err.message}</div>`;
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
