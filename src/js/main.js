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
      console.debug('[AEON] Realtime reconectado. Resincronizando señales...');
      loadSignals();
    },
  });
}

let currentNewsFilter = 'live';

function applyNewsFilter(filterValue) {
  currentNewsFilter = (filterValue || 'live').toLowerCase();
  
  const filterBtns = document.querySelectorAll('#news-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter.toLowerCase() === currentNewsFilter);
  });

  const mobileSelect = document.getElementById('mobile-news-select');
  if (mobileSelect) {
    mobileSelect.value = currentNewsFilter;
  }

  if (currentNewsFilter === 'live' || currentNewsFilter === 'all') {
    // 1. Live Feed: Exactamente 4 noticias destacadas con #featured (o top 4 de mayor relevancia)
    let featured = allNewsCache.filter(item => {
      const link = String(item.link || '');
      return link.includes('#featured') || Boolean(item.is_featured);
    });

    if (featured.length < 4) {
      const seen = new Set(featured.map(f => f.id || f.title));
      for (const item of allNewsCache) {
        const itemKey = item.id || item.title;
        if (!seen.has(itemKey)) {
          featured.push(item);
          seen.add(itemKey);
          if (featured.length >= 4) break;
        }
      }
    }

    renderNews(featured.slice(0, 4));
  } else {
    // 2. Filtros por Categoría Temática
    const val = currentNewsFilter.toUpperCase();
    const filtered = allNewsCache.filter(item => {
      const tag = String(item.tag || '').toUpperCase();
      if (val === 'METALES' || val === 'ORO') {
        return tag === 'METALES' || tag === 'ORO';
      }
      if (val === 'INDICES' || val === 'ÍNDICES') {
        return tag === 'INDICES' || tag === 'ÍNDICES';
      }
      if (val === 'FOREX' || val === 'DIVISAS') {
        return tag === 'FOREX' || tag === 'DIVISAS';
      }
      if (val === 'ENERGIA' || val === 'ENERGÍA') {
        return tag === 'ENERGIA' || tag === 'ENERGÍA';
      }
      if (val === 'CENTRALES' || val === 'FED') {
        return tag === 'CENTRALES' || tag === 'FED';
      }
      if (val === 'CRIPTO') {
        return tag === 'CRIPTO';
      }
      return tag === val;
    });

    if (filtered.length === 0) {
      const container = document.getElementById('news-list');
      if (container) {
        container.innerHTML = `
          <div class="news-empty-state">
            <span class="news-empty-icon">🔍</span>
            No hay noticias activas en la categoría seleccionada en este momento.
          </div>
        `;
      }
    } else {
      renderNews(filtered);
    }
  }
}

async function loadDynamicNews() {
  try {
    allNewsCache = await fetchNews(data.news);
    applyNewsFilter(currentNewsFilter);
  } catch (err) {
    console.error('[AEON] Error cargando noticias:', err);
  }
}

function initNewsFilters() {
  const filterBtns = document.querySelectorAll('#news-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => applyNewsFilter(btn.dataset.filter));
  });

  const mobileSelect = document.getElementById('mobile-news-select');
  if (mobileSelect) {
    mobileSelect.addEventListener('change', (e) => applyNewsFilter(e.target.value));
  }
}

async function loadDynamicBriefing() {
  try {
    const briefing = await fetchLatestBriefing((updated) => {
      renderBriefing(updated);
    });
    renderBriefing(briefing);
  } catch (err) {
    console.error('[AEON] Error cargando briefing:', err);
  }
  
  // Suscripción a nuevos briefings publicados en tiempo real
  subscribeToBriefings((newBriefing) => {
    console.debug('[AEON] Nuevo Daily Macro Briefing recibido en tiempo real:', newBriefing);
    renderBriefing(newBriefing);
  });
}

function initEducationInteractions() {
  const container = document.getElementById('education-grid');
  if (!container) return;

  let fullEducationData = null;

  async function openModule(eduId) {
    try {
      if (!fullEducationData) {
        const { default: eduData } = await import('../data/education.json');
        fullEducationData = eduData;
      }
      const { openEducationModal } = await import('./components/educationModal.js');
      const selected = fullEducationData.find(m => m.id === eduId);
      if (selected) {
        openEducationModal(selected);
      }
    } catch (err) {
      console.error('[AEON Education] Error cargando módulo:', err);
    }
  }

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.edu-card');
    if (card && card.dataset.eduId) {
      openModule(card.dataset.eduId);
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.edu-card');
      if (card && card.dataset.eduId) {
        e.preventDefault();
        openModule(card.dataset.eduId);
      }
    }
  });
}

async function initApp() {
  // Render de elementos iniciales
  renderEducation(data.education);
  renderPremiumFeatures(data.premiumFeatures);
  renderTickerBar(data.ticker);

  initEducationInteractions();
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

      const proSection = document.getElementById('pro');
      if (proSection) {
        proSection.style.display = isPro ? 'none' : '';
      }
      const drawerProCard = document.querySelector('.drawer-pro-card');
      if (drawerProCard) {
        drawerProCard.style.display = isPro ? 'none' : '';
      }
    } else {
      const proSection = document.getElementById('pro');
      if (proSection) proSection.style.display = '';
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
