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
 * Renderiza la lista filtrada de tarjetas de mercado.
 */
function renderMarkets() {
  const container = document.getElementById('markets-grid');
  const countBadge = document.getElementById('markets-count-badge');
  if (!container) return;

  let filtered = allMarkets;

  // 1. Filtro por Categoría
  if (currentCategory !== 'ALL') {
    filtered = filtered.filter(m => {
      const cat = String(m.category || '').toUpperCase();
      if (currentCategory === 'METALS' && (cat === 'METALS' || cat === 'METALES')) return true;
      if (currentCategory === 'ENERGY' && (cat === 'ENERGY' || cat === 'ENERGIA' || cat === 'ENERGÍA')) return true;
      if (currentCategory === 'CRYPTO' && (cat === 'CRYPTO' || cat === 'CRIPTO')) return true;
      if (currentCategory === 'INDICES' && (cat === 'INDICES' || cat === 'ÍNDICES')) return true;
      if (currentCategory === 'FOREX' && (cat === 'FOREX' || cat === 'DIVISAS')) return true;
      return cat === currentCategory;
    });
  }

  // 2. Filtro por Búsqueda
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(m => 
      String(m.symbol).toLowerCase().includes(q) || 
      String(m.display_name).toLowerCase().includes(q) ||
      String(m.category).toLowerCase().includes(q)
    );
  }

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

  container.innerHTML = filtered.map(m => renderMarketCard(m)).join('');
  container.scrollTo({ left: 0, behavior: 'smooth' });
}

/**
 * Actualiza un activo en vivo en el estado local y en el DOM.
 * @param {Object} updatedAsset
 */
function handleLiveUpdate(updatedAsset) {
  const index = allMarkets.findIndex(m => m.symbol === updatedAsset.symbol);
  if (index !== -1) {
    allMarkets[index] = { ...allMarkets[index], ...updatedAsset };
  } else {
    allMarkets.push(updatedAsset);
  }
  renderMarkets();

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
  renderMarkets();

  // 2. Configurar pestañas de categorías
  const filterPills = document.querySelectorAll('.market-filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => p.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      currentCategory = target.dataset.category || 'ALL';
      renderMarkets();
    });
  });

  // 3. Configurar buscador en vivo
  const searchInput = document.getElementById('market-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMarkets();
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
