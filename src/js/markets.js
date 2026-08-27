/* ============================================================
   AEON · markets.js — Controller de la Terminal de Mercados (14 Activos)
   Gobernanza: Multi-Página, Supabase Realtime & UX Cero Scroll Infinito
   ============================================================ */

import { marketsService } from './services/marketsService.js';
import { renderMarketCard } from './templates/marketCard.js';
import { checkSession } from './auth.js';

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
    filtered = filtered.filter(m => String(m.category).toUpperCase() === currentCategory);
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
        <p>Cargando inteligencia de 14 mercados globales...</p>
      </div>
    `;
  }

  // 1. Resolver sesión de usuario en navbar
  try {
    await checkSession();
  } catch (err) {
    console.error('[AEON Markets] Error al resolver sesión:', err);
  }

  // 2. Cargar datos iniciales
  allMarkets = await marketsService.getMarketIntelligence();
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

  // 4. Suscribirse a Supabase Realtime
  marketsService.subscribeToLiveUpdates(handleLiveUpdate);
}

document.addEventListener('DOMContentLoaded', initMarketsPage);
