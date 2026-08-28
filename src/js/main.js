import { supabase } from './supabaseClient.js';
import { initNavbar } from './navbar.js';
import { initPrices } from './prices.js';
import { initChart }  from './chart.js';
import { checkSession } from './auth.js';
import {
  fetchActiveSignals,
  fetchSignalHistory,
  fetchTrackRecordMetrics,
  calculateTrackRecordMetrics,
  subscribeSignalEvents,
} from './services/signalService.js';
import { fetchNews } from './services/newsService.js';
import { fetchLatestBriefing, subscribeToBriefings } from './services/briefingService.js';
import {
  renderBriefing,
  renderNews,
  renderMarketCards,
  renderSignals,
  renderSignalHistory,
  renderKPIBar,
  renderEducation,
  renderPremiumFeatures,
  renderTickerBar,
} from './render.js';
import data from '../data/markets.json';

// Redirección de ancla #mercados a la página dedicada /mercados.html
if (window.location.hash === '#mercados') {
  window.location.href = '/mercados.html';
}
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#mercados') {
    window.location.href = '/mercados.html';
  }
});

// Detectar si el usuario llega con enlace de recuperación de contraseña
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    window.location.href = '/actualizar-password.html';
  }
});

let currentUser = null;
let isPro = false;
let activeSignals = [];
let historySignalsCache = [];
let allNewsCache = [];

let currentViewMode = 'live'; // 'live' | 'history'
let currentSignalFilter = 'all';

function getFilteredLiveSignals() {
  if (currentSignalFilter === 'all') return activeSignals;
  return activeSignals.filter(s => String(s.asset || '').toUpperCase().includes(currentSignalFilter.toUpperCase()));
}

function getFilteredHistorySignals() {
  if (currentSignalFilter === 'all') return historySignalsCache;
  return historySignalsCache.filter(s => String(s.asset || '').toUpperCase().includes(currentSignalFilter.toUpperCase()));
}

async function updateSignalsDisplay() {
  if (currentViewMode === 'live') {
    renderKPIBar('live');
    renderSignals(getFilteredLiveSignals(), currentUser, isPro);
  } else {
    const filteredHistory = getFilteredHistorySignals();
    const localMetrics = calculateTrackRecordMetrics(filteredHistory);
    renderKPIBar('history', localMetrics);
    renderSignalHistory(filteredHistory);

    // Si el filtro es 'all', consultar métricas globales agregadas en PostgreSQL vía RPC (0ms lag, muestra total)
    if (currentSignalFilter === 'all') {
      try {
        const serverMetrics = await fetchTrackRecordMetrics(filteredHistory);
        if (serverMetrics && currentViewMode === 'history' && currentSignalFilter === 'all') {
          renderKPIBar('history', serverMetrics);
        }
      } catch (_) {}
    }
  }
}

function initViewSwitch() {
  const container = document.getElementById('signals-view-switch');
  if (!container) return;

  container.addEventListener('click', async e => {
    const btn = e.target.closest('.view-switch-btn');
    if (!btn) return;

    container.querySelectorAll('.view-switch-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    currentViewMode = btn.dataset.view || 'live';

    if (currentViewMode === 'history' && historySignalsCache.length === 0) {
      try {
        historySignalsCache = await fetchSignalHistory(50);
      } catch (err) {
        console.error('[AEON] Error cargando historial de señales:', err);
      }
    }

    updateSignalsDisplay();
  });
}

function initSignalFilters() {
  const container = document.getElementById('signals-filter-tabs');
  if (!container) return;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab-btn');
    if (!btn) return;

    container.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentSignalFilter = btn.dataset.filter || 'all';
    updateSignalsDisplay();
  });
}

async function loadSignals() {
  try {
    activeSignals = await fetchActiveSignals(isPro);
    updateSignalsDisplay();
  } catch (err) {
    console.error('[AEON] Error cargando signals:', err);
    updateSignalsDisplay();
  }
}

function initRealtime() {
  subscribeSignalEvents({
    isPro,
    onPublicInsert: newSignal => {
      if (['active', 'hit_tp1'].includes(newSignal.status)) {
        activeSignals.unshift(newSignal);
      } else {
        historySignalsCache.unshift(newSignal);
      }
      updateSignalsDisplay();
    },
    onPublicUpdate: updatedSignal => {
      if (['closed_tp', 'closed_be', 'closed_sl', 'won', 'lost'].includes(updatedSignal.status)) {
        // Remover de activas y mover a historial
        activeSignals = activeSignals.filter(s => s.id !== updatedSignal.id);
        const hIdx = historySignalsCache.findIndex(s => s.id === updatedSignal.id);
        if (hIdx > -1) {
          Object.assign(historySignalsCache[hIdx], updatedSignal);
        } else {
          historySignalsCache.unshift(updatedSignal);
        }
      } else {
        const index = activeSignals.findIndex(s => s.id === updatedSignal.id);
        if (index > -1) {
          Object.assign(activeSignals[index], updatedSignal);
        } else {
          activeSignals.unshift(updatedSignal);
        }
      }
      updateSignalsDisplay();
    },
    onProInsert: proPayload => {
      const target = activeSignals.find(s => s.id === proPayload.signal_id);
      if (target) {
        Object.assign(target, proPayload);
        updateSignalsDisplay();
      }
    },
    onReconnect: () => {
      console.log('[AEON] Realtime reconectado. Resincronizando señales...');
      loadSignals();
    },
  });
}

async function loadDynamicNews() {
  allNewsCache = await fetchNews(data.news);
  renderNews(allNewsCache);
}

function initNewsFilters() {
  const filterBtns = document.querySelectorAll('#news-filters .filter-btn');

  function applyFilter(filterValue) {
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filterValue);
    });

    if (!filterValue || filterValue === 'all') {
      renderNews(allNewsCache);
    } else {
      const val = filterValue.toUpperCase();
      const filtered = allNewsCache.filter(item => {
        const tag = String(item.tag || '').toUpperCase();
        const title = String(item.title || '').toUpperCase();
        
        if (val === 'ORO' || val === 'METALES') {
          return tag.includes('ORO') || tag.includes('METALES') || tag.includes('GOLD') || title.includes('ORO') || title.includes('METALES') || title.includes('XAU');
        }
        if (val === 'FOREX') {
          return tag.includes('FOREX') || tag.includes('EUR') || tag.includes('GBP') || tag.includes('USD') || title.includes('EURUSD') || title.includes('DÓLAR');
        }
        if (val === 'ÍNDICES' || val === 'INDICES') {
          return tag.includes('ÍNDICES') || tag.includes('INDICES') || tag.includes('SPX') || title.includes('S&P') || title.includes('ÍNDICE');
        }
        if (val === 'FED' || val === 'CENTRALES') {
          return tag.includes('FED') || tag.includes('CENTRAL') || tag.includes('POLICY') || tag.includes('INFLACIÓN') || title.includes('FED');
        }
        return tag.includes(val) || title.includes(val);
      });
      if (filtered.length === 0) {
        const container = document.getElementById('news-list');
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--muted); font-size: 0.9rem;">
              <span style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;">🔍</span>
              No hay noticias activas en la categoría seleccionada en este momento.
            </div>
          `;
        }
      } else {
        renderNews(filtered);
      }
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  const mobileSelect = document.getElementById('mobile-news-select');
  if (mobileSelect) {
    mobileSelect.addEventListener('change', (e) => applyFilter(e.target.value));
  }
}

async function loadDynamicBriefing() {
  const briefing = await fetchLatestBriefing();
  renderBriefing(briefing);
  
  // Suscripción a nuevos briefings publicados en tiempo real
  subscribeToBriefings((newBriefing) => {
    console.log('[AEON] Nuevo Daily Macro Briefing recibido en tiempo real:', newBriefing);
    renderBriefing(newBriefing);
  });
}

async function initApp() {
  // Render de elementos iniciales
  renderEducation(data.education);
  renderPremiumFeatures(data.premiumFeatures);
  renderTickerBar(data.ticker);

  loadDynamicBriefing();
  loadDynamicNews();
  initNewsFilters();
  initSignalFilters();
  initViewSwitch();
  initNavbar();
  initPrices();
  initChart();

  // Resolución de Sesión
  try {
    const sessionInfo = await checkSession();
    if (sessionInfo && sessionInfo.session) {
      currentUser = sessionInfo.session.user;
      isPro = sessionInfo.isPro;
      
      const userEmail = document.getElementById('nav-user-email');
      if (userEmail) userEmail.textContent = currentUser.email;
    }
  } catch (err) {
    console.error('[AEON] Falla en resolución de sesión:', err);
  }

  // Carga de Señales y suscripción Realtime
  await loadSignals();
  initRealtime();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
