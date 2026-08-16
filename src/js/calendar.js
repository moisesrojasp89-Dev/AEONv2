/* ============================================================
   AEON · calendar.js
   Lógica de renderizado del Calendario Económico
   ============================================================ */

import { initNavbar } from './navbar.js';
import data from '../data/markets.json';
import { calendarRow } from './templates/calendarItem.js';

function renderCalendar() {
  const container = document.getElementById('calendar-feed');
  if (!container) return;

  const events = data.calendar || [];
  
  if (events.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay eventos macro de alto impacto esta semana.</div>';
    return;
  }

  container.innerHTML = events.map((evt, index) => calendarRow(evt, index)).join('');
}

// Global function for the onclick attribute
window.toggleDetails = function(index) {
  const grp = document.getElementById(`eco-grp-${index}`);
  if (grp) {
    grp.classList.toggle('open');
  }
};

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

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  renderCalendar();
  initTradingViewWidget();
});
