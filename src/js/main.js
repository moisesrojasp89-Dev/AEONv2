/* ============================================================
   AUREUM · main.js — Entry point
   ============================================================ */

'use strict';

import { initNavbar }            from './navbar.js';
import { initPrices }            from './prices.js';
import { renderStats, renderTickers, renderMarketCards, renderSignals, renderPremiumFeatures } from './render.js';
import data                      from '../data/markets.json';

// 1. Render static content from JSON
renderStats(data.stats);
renderTickers(data.markets);
renderMarketCards(data.markets);
renderSignals(data.signals);
renderPremiumFeatures(data.premiumFeatures);

// 2. Init modules
initNavbar();
initPrices();
