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

renderMarketCards(data.markets);
renderSignals(data.signals);
renderEducation(data.education);
renderPartners(data.partners);
renderPremiumFeatures(data.premiumFeatures);
renderTickerBar(data.ticker);

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

loadDynamicNews();

initNavbar();
initPrices();
initChart();
