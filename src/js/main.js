import { supabase } from './supabaseClient.js';
import { initNavbar } from './navbar.js';
import { initPrices } from './prices.js';
import { initChart }  from './chart.js';
import { checkSession } from './auth.js';
import { fetchActiveSignals, subscribeSignalEvents } from './services/signalService.js';
import { fetchNews } from './services/newsService.js';
import {
  renderNews,
  renderMarketCards,
  renderSignals,
  renderEducation,
  renderPremiumFeatures,
  renderTickerBar,
} from './render.js';
import data from '../data/markets.json';

// Detectar si el usuario llega con enlace de recuperación de contraseña
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    window.location.href = '/actualizar-password.html';
  }
});

let currentUser = null;
let isPro = false;
let activeSignals = [];
let allNewsCache = [];

let currentSignalFilter = 'all';

function getFilteredSignals() {
  if (currentSignalFilter === 'all') return activeSignals;
  return activeSignals.filter(s => String(s.asset || '').toUpperCase().includes(currentSignalFilter.toUpperCase()));
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
    renderSignals(getFilteredSignals(), currentUser, isPro);
  });
}

async function loadSignals() {
  try {
    activeSignals = await fetchActiveSignals(isPro);
    renderSignals(getFilteredSignals(), currentUser, isPro);
  } catch (err) {
    console.error('[AEON] Error cargando signals:', err);
    renderSignals([], currentUser, isPro);
  }
}

function initRealtime() {
  subscribeSignalEvents({
    isPro,
    onPublicInsert: newSignal => {
      activeSignals.unshift(newSignal);
      renderSignals(getFilteredSignals(), currentUser, isPro);
    },
    onPublicUpdate: updatedSignal => {
      const index = activeSignals.findIndex(s => s.id === updatedSignal.id);
      if (index > -1) {
        Object.assign(activeSignals[index], updatedSignal);
      } else {
        activeSignals.unshift(updatedSignal);
      }
      renderSignals(getFilteredSignals(), currentUser, isPro);
    },
    onProInsert: proPayload => {
      const target = activeSignals.find(s => s.id === proPayload.signal_id);
      if (target) {
        Object.assign(target, proPayload);
        renderSignals(getFilteredSignals(), currentUser, isPro);
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
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  function applyFilter(filterValue) {
    filterBtns.forEach(b => {
      if (b.dataset.filter === filterValue) {
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      }
    });
    
    const mobileSelect = document.getElementById('mobile-news-select');
    if (mobileSelect && mobileSelect.value !== filterValue) {
      mobileSelect.value = filterValue;
    }

    if (filterValue === 'all') {
      renderNews(allNewsCache);
    } else {
      const filtered = allNewsCache.filter(item => String(item.tag || '').toUpperCase() === filterValue.toUpperCase());
      renderNews(filtered);
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

async function initApp() {
  // Render de elementos iniciales
  renderMarketCards(data.markets);
  renderEducation(data.education);
  renderPremiumFeatures(data.premiumFeatures);
  renderTickerBar(data.ticker);

  loadDynamicNews();
  initNewsFilters();
  initSignalFilters();
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
