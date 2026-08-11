/* ============================================================
   AEON · main.js — Entry point
   ============================================================ */

'use strict';

import { initNavbar } from './navbar.js';
import { initPrices } from './prices.js';
import {
  renderStats,
  renderTickers,
  renderNews,
  renderMarketCards,
  renderSignals,
  renderEducation,
  renderPartners,
  renderPremiumFeatures,
  renderTickerBar,
} from './render.js';
import data from '../data/markets.json';

renderStats(data.stats);
renderTickers(data.markets);
renderNews(data.news);
renderMarketCards(data.markets);
renderSignals(data.signals);
renderEducation(data.education);
renderPartners(data.partners);
renderPremiumFeatures(data.premiumFeatures);
renderTickerBar(data.ticker);

initNavbar();
initPrices();
