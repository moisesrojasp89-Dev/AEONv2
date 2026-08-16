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
      renderNews(newsItems);
    } else {
      renderNews(data.news); // Fallback a local
    }
  } catch (err) {
    console.error('[AEON] Error cargando noticias de Supabase:', err.message);
    renderNews(data.news); // Fallback a local si hay error de conexión
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  
  renderMarketCards(data.markets);
  renderSignals(data.signals, currentUser);
  renderEducation(data.education);
  renderPartners(data.partners);
  renderPremiumFeatures(data.premiumFeatures);
  renderTickerBar(data.ticker);

  loadDynamicNews();
  initNavbar();
  initPrices();
  initChart();
});
