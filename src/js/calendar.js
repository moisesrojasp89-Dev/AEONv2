/* ============================================================
   AEON — calendar.js
   Lógica de renderizado del Calendario Económico
   ============================================================ */

import { initNavbar } from './navbar.js';
import { calendarRow } from './templates/calendarItem.js';
import { supabase } from './supabaseClient.js';
import { checkSession } from './auth.js';
import { escapeHTML } from './utils/sanitize.js';

let globalEvents = [];
let liveCountdownStarted = false;

function formatLocalTime(utcDateStr) {
  const d = new Date(utcDateStr);
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 3);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  return `<div style="display:flex; flex-direction:column; line-height:1.2;"><span style="font-size:0.75rem; color:var(--muted);">${escapeHTML(weekday.toUpperCase())} ${escapeHTML(dayNum)}/${escapeHTML(monthNum)}</span><span style="font-weight:600;">${escapeHTML(time)}</span></div>`;
}

// Helpers para fechas en zona local
function isToday(dateObj) {
  const today = new Date();
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

function isThisWeek(dateObj) {
  const today = new Date();
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))); // Lunes
  firstDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(firstDay);
  lastDay.setDate(lastDay.getDate() + 6);
  lastDay.setHours(23, 59, 59, 999);
  return dateObj >= firstDay && dateObj <= lastDay;
}

function isThisMonth(dateObj) {
  const today = new Date();
  return dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

function updateNextCatalyst() {
  const container = document.querySelector('.catalyst-box');
  if (!container || !globalEvents || globalEvents.length === 0) return;

  const now = new Date();
  // Buscar el próximo evento de Alto Impacto
  const nextEvent = globalEvents.find(e => {
    return String(e.impact || '').toUpperCase() === 'HIGH' && new Date(e.event_time) > now;
  });

  if (!nextEvent) {
    container.innerHTML = `<p class="event-desc" style="text-align:center; padding: 1rem 0;">No hay catalizadores mayores programados.</p>`;
    return;
  }

  const eventTime = new Date(nextEvent.event_time);
  const diffMs = eventTime - now;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  // Formato: FALTAN 02H 45M o FALTAN 3D 02H
  let countdownText = '';
  if (diffHrs > 24) {
    const days = Math.floor(diffHrs / 24);
    const remainHrs = diffHrs % 24;
    countdownText = `FALTAN ${days}D ${remainHrs.toString().padStart(2, '0')}H`;
  } else {
    countdownText = `FALTAN ${diffHrs.toString().padStart(2, '0')}H ${diffMins.toString().padStart(2, '0')}M`;
  }

  container.innerHTML = `
    <div class="event-countdown">
      <span class="live-dot"></span> ${escapeHTML(countdownText)}
    </div>
    <h4 class="event-title" style="margin-top: 0.5rem; font-size: 0.95rem; font-weight: 600;">${escapeHTML(nextEvent.country)} - ${escapeHTML(nextEvent.event_name)}</h4>
    <p class="event-desc" style="margin-top: 0.25rem;">Evento de Alta Volatilidad. Riesgo de inyección de liquidez y barrido de stops.</p>
  `;
}

function startLiveCountdowns() {
  setInterval(() => {
    const now = new Date();
    const rows = document.querySelectorAll('.eco-row');
    
    rows.forEach(row => {
      const timeEl = row.querySelector('.time');
      if (!timeEl) return;
      
      const eventTimeStr = row.getAttribute('data-time');
      if (!eventTimeStr) return;
      
      const eventTime = new Date(eventTimeStr);
      const diffMs = eventTime - now;
      
      // If event is in exactly 5 minutes or less, show countdown
      if (diffMs > 0 && diffMs <= 5 * 60 * 1000) {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        const text = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (!timeEl.hasAttribute('data-original-html')) {
          timeEl.setAttribute('data-original-html', timeEl.innerHTML);
        }
        
        timeEl.innerHTML = `<span style="color: #ef4444; font-weight: bold; font-family: var(--font-mono); animation: pulse 1s infinite;">${escapeHTML(text)}</span>`;
      } 
      // Reset if passed
      else if (diffMs < 0 && timeEl.hasAttribute('data-original-html')) {
         timeEl.innerHTML = timeEl.getAttribute('data-original-html');
         timeEl.removeAttribute('data-original-html');
      }
    });
  }, 1000);
}

function renderEvents() {
  const container = document.getElementById('calendar-feed');
  const currencyFilter = document.getElementById('calendar-filter')?.value || 'all';
  const dateFilter = document.getElementById('calendar-date-filter')?.value || 'week';
  
  if (!container) return;

  // 1. Filtro de Monedas
  let filtered = globalEvents;
  if (currencyFilter !== 'all') {
    filtered = globalEvents.filter(e => e.country === currencyFilter);
  }

  // 2. Filtro de Rango de Fechas (Calculado en Local Time)
  filtered = filtered.filter(dbEvt => {
    const localDate = new Date(dbEvt.event_time);
    if (dateFilter === 'today') return isToday(localDate);
    if (dateFilter === 'week') return isThisWeek(localDate);
    if (dateFilter === 'month') return isThisMonth(localDate);
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; opacity: 0.7;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(14, 165, 233, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; border: 1px solid rgba(14, 165, 233, 0.2);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <path d="M9 16l2 2 4-4"></path>
          </svg>
        </div>
        <h3 style="font-family: var(--font-mono); font-size: 1.1rem; color: #f8fafc; margin-bottom: 0.5rem; letter-spacing: 0.05em;">CERO EVENTOS CATALIZADORES</h3>
        <p style="font-size: 0.9rem; color: #94a3b8; max-width: 300px;">No se encontraron noticias macroeconómicas de alto o mediano impacto para esta divisa en el rango seleccionado.</p>
      </div>
    `;
    return;
  }

  const mappedEvents = filtered.map(dbEvt => ({
    time: formatLocalTime(dbEvt.event_time),
    event_time: dbEvt.event_time,
    assets: [dbEvt.country],
    impact: String(dbEvt.impact || '').toUpperCase(),
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
    renderEvents();
    updateNextCatalyst();
    if (!liveCountdownStarted) {
      startLiveCountdowns();
      liveCountdownStarted = true;
    }
  } catch (err) {
    console.error('[AEON] Error al obtener calendario desde Supabase:', err);
    container.innerHTML = `<div class="empty-state" style="color: var(--red); padding: 2rem; text-align: center;">No se pudo sincronizar el calendario en este momento.</div>`;
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

function initCalendarFilters() {
  const selCurr = document.getElementById('calendar-filter');
  const selDate = document.getElementById('calendar-date-filter');
  
  if (selCurr) selCurr.addEventListener('change', renderEvents);
  if (selDate) selDate.addEventListener('change', renderEvents);
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
  initCalendarFilters();
  await fetchCalendar();
  initTradingViewWidget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
