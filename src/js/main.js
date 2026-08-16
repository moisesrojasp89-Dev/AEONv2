/* ============================================================
   AEON · main.js — Entry point
   ============================================================ */

import { initNavbar } from './navbar.js';
import { initPrices } from './prices.js';
import { initChart }  from './chart.js';
import { supabase } from './supabaseClient.js';
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
let allNewsCache = [];

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  const guestView = document.getElementById('nav-guest-view');
  const userView = document.getElementById('nav-user-view');
  const userEmail = document.getElementById('nav-user-email');
  const btnLogout = document.getElementById('btn-logout');

  if (session) {
    currentUser = session.user;
    if (guestView) guestView.style.display = 'none';
    if (userView) userView.style.display = 'flex';
    if (userEmail) userEmail.textContent = currentUser.email;
    
    if (btnLogout) {
      btnLogout.onclick = async () => {
        await supabase.auth.signOut();
        window.location.reload();
      };
    }
  } else {
    currentUser = null;
    if (guestView) guestView.style.display = 'flex';
    if (userView) userView.style.display = 'none';
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
      allNewsCache = data.news; // Fallback a local
    }
    renderNews(allNewsCache);
  } catch (err) {
    console.error('[AEON] Error cargando noticias de Supabase:', err.message);
    allNewsCache = data.news;
    renderNews(allNewsCache); // Fallback a local si hay error de conexión
  }
}

function initNewsFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover clase active de todos
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      // Añadir clase active al clickeado
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      const filterValue = btn.dataset.filter;
      
      if (filterValue === 'all') {
        renderNews(allNewsCache);
      } else {
        const filtered = allNewsCache.filter(item => item.tag.toUpperCase() === filterValue.toUpperCase());
        renderNews(filtered);
      }
    });
  });
}

async function initApp() {
  await checkSession();
  
  renderMarketCards(data.markets);
  renderSignals(data.signals, currentUser);
  renderEducation(data.education);
  renderPartners(data.partners);
  renderPremiumFeatures(data.premiumFeatures);
  renderTickerBar(data.ticker);

  loadDynamicNews();
  initNewsFilters();
  initNavbar();
  initPrices();
  initChart();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
