/* ============================================================
   AEON · main.js — Entry point
   ============================================================ */

import { initNavbar } from './navbar.js';
import { initPrices } from './prices.js';
import { initChart }  from './chart.js';
import { supabase } from './supabaseClient.js';
import { checkSession } from './auth.js';
import {
  renderNews,
  renderMarketCards,
  renderSignals,
  renderEducation,
  renderPartners,
  renderPremiumFeatures,
  renderTickerBar,
} from './render.js';
import data from '../data/markets.json';

let currentUser = null;
let isPro = false;
let activeSignals = [];
let allNewsCache = [];

async function loadSignals() {
  try {
    const { data: publicSignals, error: pErr } = await supabase
      .from('signals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    // Guardamos la base pública
    activeSignals = publicSignals || [];

    // Si es pro, intentamos traer la data privada
    if (isPro && activeSignals.length > 0) {
      const signalIds = activeSignals.map(s => s.id);
      const { data: proData, error: proErr } = await supabase
        .from('signals_pro_data')
        .select('*')
        .in('signal_id', signalIds);

      if (!proErr && proData) {
        // Hacemos el merge
        proData.forEach(proInfo => {
          const target = activeSignals.find(s => s.id === proInfo.signal_id);
          if (target) {
            Object.assign(target, proInfo);
          }
        });
      }
    }

    renderSignals(activeSignals, currentUser, isPro);
  } catch (err) {
    console.error('[AEON] Error cargando signals:', err);
  }
}

function initRealtime() {
  // Listener Público
  supabase.channel('public:signals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (payload) => {
      // Agregamos al top de la lista
      activeSignals.unshift(payload.new);
      renderSignals(activeSignals, currentUser, isPro);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signals' }, (payload) => {
      // Si el status cambia a won/lost/cancelled, lo quitamos de activas
      if (payload.new.status !== 'active') {
        activeSignals = activeSignals.filter(s => s.id !== payload.new.id);
      } else {
        // Actualización normal
        const index = activeSignals.findIndex(s => s.id === payload.new.id);
        if (index > -1) {
          Object.assign(activeSignals[index], payload.new);
        }
      }
      renderSignals(activeSignals, currentUser, isPro);
    })
    .on('system', { event: 'EXTENSION' }, () => {
        // reconexión
        console.log('[AEON] Realtime reconectado. Resincronizando...');
        loadSignals();
    })
    .subscribe();

  // Listener Privado (Solo PRO)
  if (isPro) {
    supabase.channel('public:signals_pro_data')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals_pro_data' }, (payload) => {
        const target = activeSignals.find(s => s.id === payload.new.signal_id);
        if (target) {
          Object.assign(target, payload.new);
          renderSignals(activeSignals, currentUser, isPro);
        }
      })
      .subscribe();
  }
}

async function loadDynamicNews() {
  try {
    const { data: newsItems, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (newsItems && newsItems.length > 0) {
      allNewsCache = newsItems;
    } else {
      allNewsCache = data.news;
    }
    renderNews(allNewsCache);
  } catch (err) {
    console.error('[AEON] Error cargando noticias:', err);
    allNewsCache = data.news;
    renderNews(allNewsCache);
  }
}

function initNewsFilters() {
  // Desktop buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  function applyFilter(filterValue) {
    // Update active state on desktop buttons
    filterBtns.forEach(b => {
      if (b.dataset.filter === filterValue) {
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
      } else {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      }
    });
    
    // Sync mobile select if exists
    const mobileSelect = document.getElementById('mobile-news-select');
    if (mobileSelect && mobileSelect.value !== filterValue) {
      mobileSelect.value = filterValue;
    }

    // Apply the filter logic
    if (filterValue === 'all') {
      renderNews(allNewsCache);
    } else {
      const filtered = allNewsCache.filter(item => item.tag.toUpperCase() === filterValue.toUpperCase());
      renderNews(filtered);
    }
  }

  // Bind desktop clicks
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  // Bind mobile select change
  const mobileSelect = document.getElementById('mobile-news-select');
  if (mobileSelect) {
    mobileSelect.addEventListener('change', (e) => applyFilter(e.target.value));
  }
}

async function initApp() {
  // Render de elementos estáticos
  renderMarketCards(data.markets);
  renderEducation(data.education);
  renderPartners(data.partners);
  renderPremiumFeatures(data.premiumFeatures);
  renderTickerBar(data.ticker);

  loadDynamicNews();
  initNewsFilters();
  initNavbar();
  initPrices();
  initChart();

  // Auth y Señales
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

  // Cargar señales desde Supabase en vez de mocks
  await loadSignals();
  initRealtime();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
