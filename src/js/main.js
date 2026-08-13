/* ============================================================
   AEON · main.js — Entry point
   ============================================================ */

import { initNavbar } from './navbar.js';
import { initPrices } from './prices.js';
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

renderNews(data.news);
renderMarketCards(data.markets);
renderSignals(data.signals);
renderEducation(data.education);
renderPartners(data.partners);
renderPremiumFeatures(data.premiumFeatures);
renderTickerBar(data.ticker);

initNavbar();
initPrices();
