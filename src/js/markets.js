/* ============================================================
   AEON · markets.js — Controller de la Terminal de Mercados (14 Activos)
   Gobernanza: Multi-Página, Supabase Realtime & UX Cero Scroll Infinito
   ============================================================ */

import { marketsService } from './services/marketsService.js';
import { macroLiquidityService } from './services/macroLiquidityService.js';
import { renderMarketCard } from './templates/marketCard.js';
import { createMacroLiquidityHUD, createMacroDetailModal } from './templates/macroLiquidityHUD.js';
import { checkSession } from './auth.js';
import { initNavbar } from './navbar.js';
import fallbackData from '../data/market_intelligence_snapshot.json';

let allMarkets = [];
let currentCategory = 'ALL';
let searchQuery = '';

/**
 * Comprueba si un activo coincide con la categoría y búsqueda activas.
 * @param {Object} m
 * @returns {boolean}
 */
function matchesFilters(m) {
  // 1. Filtro por Categoría
  if (currentCategory !== 'ALL') {
    const cat = String(m.category || '').toUpperCase();
    if (currentCategory === 'METALS' && (cat === 'METALS' || cat === 'METALES')) {
      // Coincide
    } else if (currentCategory === 'ENERGY' && (cat === 'ENERGY' || cat === 'ENERGIA' || cat === 'ENERGÍA')) {
      // Coincide
    } else if (currentCategory === 'CRYPTO' && (cat === 'CRYPTO' || cat === 'CRIPTO')) {
      // Coincide
    } else if (currentCategory === 'INDICES' && (cat === 'INDICES' || cat === 'ÍNDICES')) {
      // Coincide
    } else if (currentCategory === 'FOREX' && (cat === 'FOREX' || cat === 'DIVISAS')) {
      // Coincide
    } else if (cat !== currentCategory) {
      return false;
    }
  }

  // 2. Filtro por Búsqueda
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      String(m.symbol || '').toLowerCase().includes(q) || 
      String(m.display_name || '').toLowerCase().includes(q) ||
      String(m.category || '').toLowerCase().includes(q);
    if (!matchesQuery) return false;
  }

  return true;
}

/**
 * Renderiza la lista filtrada de tarjetas de mercado.
 * @param {Object} [options]
 * @param {boolean} [options.resetScroll=false] Resetea el scroll al inicio solo si es explícito (ej: al filtrar)
 */
function renderMarkets({ resetScroll = false } = {}) {
  const container = document.getElementById('markets-grid');
  const countBadge = document.getElementById('markets-count-badge');
  if (!container) return;

  const filtered = allMarkets.filter(matchesFilters);

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Activo${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="markets-empty-state glass-panel">
        <span class="empty-icon">🔍</span>
        <h3>No se encontraron activos</h3>
        <p>Intenta con otra categoría o término de búsqueda.</p>
      </div>
    `;
    return;
  }

  const prevScrollLeft = container.scrollLeft;
  container.innerHTML = filtered.map(m => renderMarketCard(m)).join('');

  if (resetScroll) {
    container.scrollTo({ left: 0, behavior: 'smooth' });
  } else {
    container.scrollLeft = prevScrollLeft;
  }
}

/**
 * Actualiza un activo en vivo en el estado local y en el DOM sin resetear la posición del carrusel.
 * @param {Object} updatedAsset
 */
function handleLiveUpdate(updatedAsset) {
  if (!updatedAsset || !updatedAsset.symbol) return;

  const index = allMarkets.findIndex(m => m.symbol === updatedAsset.symbol);
  if (index !== -1) {
    allMarkets[index] = { ...allMarkets[index], ...updatedAsset };
  } else {
    allMarkets.push(updatedAsset);
  }

  const assetData = index !== -1 ? allMarkets[index] : updatedAsset;
  const container = document.getElementById('markets-grid');
  if (!container) return;

  const existingCard = container.querySelector(`.market-card[data-symbol="${updatedAsset.symbol}"]`);
  const isMatch = matchesFilters(assetData);

  if (existingCard) {
    if (isMatch) {
      // Reemplazo atómico in-place de la tarjeta en el DOM sin alterar scroll
      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = renderMarketCard(assetData).trim();
      const newCard = tempWrapper.firstElementChild;
      if (newCard) {
        newCard.classList.add('card-live-pulse');
        existingCard.replaceWith(newCard);
        setTimeout(() => newCard.classList.remove('card-live-pulse'), 1400);
      }
    } else {
      // Si con el nuevo valor ya no coincide con los filtros, remover suavemente
      existingCard.remove();
    }
  } else if (isMatch) {
    // Si no existía en pantalla pero ahora cumple el filtro, re-renderizar preservando scroll
    renderMarkets({ resetScroll: false });
  }

  // Actualizar contador visible
  const countBadge = document.getElementById('markets-count-badge');
  if (countBadge) {
    const visibleCards = container.querySelectorAll('.market-card').length;
    countBadge.textContent = `${visibleCards} Activo${visibleCards === 1 ? '' : 's'}`;
  }

  // Mostrar notificación sutil de actualización
  const toast = document.getElementById('market-live-toast');
  if (toast) {
    toast.textContent = `⚡ Actualización en vivo: ${updatedAsset.display_name || updatedAsset.symbol}`;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }
}

/**
 * Inicialización de eventos y datos.
 */
async function initMarketsPage() {
  const container = document.getElementById('markets-grid');
  if (container) {
    container.innerHTML = `
      <div class="markets-loading-state font-mono">
        <div class="spinner"></div>
        <p>Cargando inteligencia de 17 mercados globales...</p>
      </div>
    `;
  }

  // 1. Inicializar navegación y sesión
  initNavbar();
  try {
    await checkSession();
  } catch (err) {
    console.error('[AEON Markets] Error al resolver sesión:', err);
  }

  // 2. Cargar datos iniciales
  try {
    allMarkets = await marketsService.getMarketIntelligence();
  } catch (e) {
    allMarkets = fallbackData;
  }
  if (!allMarkets || allMarkets.length === 0) {
    allMarkets = fallbackData;
  }
  renderMarkets({ resetScroll: true });

  // 2. Configurar pestañas de categorías
  const filterPills = document.querySelectorAll('.market-filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => p.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      currentCategory = target.dataset.category || 'ALL';
      renderMarkets({ resetScroll: true });
    });
  });

  // 3. Configurar buscador en vivo
  const searchInput = document.getElementById('market-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMarkets({ resetScroll: true });
    });
  }

  // 4. Delegación de eventos para botón "Auditar con IA"
  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-market-copilot');
      if (!btn) return;
      const symbol = btn.dataset.symbol || '';
      const name = btn.dataset.name || symbol;

      const chatPanel = document.getElementById('aeon-chat-panel');
      const chatFab = document.getElementById('chat-fab-toggle');
      const chatTextarea = document.getElementById('chat-textarea-input');

      // Si el panel de chat no está abierto, abrirlo
      if (chatPanel && !chatPanel.classList.contains('active')) {
        chatFab?.click();
      }

      if (chatTextarea) {
        chatTextarea.value = `Audita los niveles clave, sesgo institucional y liquidez para ${name} (${symbol}).`;
        chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => chatTextarea.focus(), 160);
      }
    });
  }

  // 5. Suscribirse a Supabase Realtime
  marketsService.subscribeToLiveUpdates(handleLiveUpdate);

  // 6. Inicializar Macro HUD de Liquidez Fed
  await initMacroHUD();
}

/**
 * Inicializa el HUD de Liquidez Macroeconómica Fed.
 */
async function initMacroHUD() {
  const root = document.getElementById('macro-hud-root');
  if (!root) return;

  const items = await macroLiquidityService.getMacroLiquidity();
  root.innerHTML = createMacroLiquidityHUD(items);

  // Suscripción a cambios en vivo
  macroLiquidityService.subscribeToLiveUpdates((updatedList) => {
    root.innerHTML = createMacroLiquidityHUD(updatedList);
  });

  // Delegación de eventos para el botón modal ℹ️
  document.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.js-macro-info');
    if (infoBtn) {
      const sym = infoBtn.dataset.symbol;
      const item = macroLiquidityService.getItem(sym);
      if (item) {
        document.getElementById('macro-detail-modal')?.remove();
        document.body.insertAdjacentHTML('beforeend', createMacroDetailModal(item));
      }
    }

    if (e.target.closest('.js-macro-modal-close') || e.target.classList.contains('macro-modal-backdrop')) {
      document.getElementById('macro-detail-modal')?.remove();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('macro-detail-modal')?.remove();
    }
  });
}

document.addEventListener('DOMContentLoaded', initMarketsPage);
