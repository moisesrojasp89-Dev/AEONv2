/* ============================================================
   AEON · analysis.js — Master Controller for /analisis.html
   Official TradingView Advanced Chart with Pre-configured Studies
   ============================================================ */

import { initNavbar } from './navbar.js';
import { analysisService } from './services/analysisService.js';
import { renderTerminalCard } from './templates/analysisCard.js';

let currentSymbol = 'XAUUSD';
let currentData = null;
let realtimeChannel = null;
let tvScriptPromise = null;

/**
 * Mapeo de proveedores oficiales de TradingView para el Core 4.
 */
const TV_SYMBOLS = {
  XAUUSD: 'OANDA:XAUUSD',
  BTCUSDT: 'BINANCE:BTCUSDT',
  EURUSD: 'OANDA:EURUSD',
  NAS100: 'OANDA:NAS100USD',
};

const TV_EXTERNAL_LINKS = {
  XAUUSD: 'https://es.tradingview.com/chart/?symbol=OANDA%3AXAUUSD',
  BTCUSDT: 'https://es.tradingview.com/chart/?symbol=BINANCE%3ABTCUSDT',
  EURUSD: 'https://es.tradingview.com/chart/?symbol=OANDA%3AEURUSD',
  NAS100: 'https://es.tradingview.com/chart/?symbol=OANDA%3ANAS100USD',
};

/**
 * Carga el script oficial tv.js de TradingView de forma asíncrona una sola vez.
 */
function ensureTradingViewScript() {
  if (window.TradingView) return Promise.resolve(window.TradingView);
  if (tvScriptPromise) return tvScriptPromise;

  tvScriptPromise = new Promise((resolve) => {
    const existing = document.getElementById('tv-script-tag');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.TradingView));
      return;
    }
    const script = document.createElement('script');
    script.id = 'tv-script-tag';
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve(window.TradingView);
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

/**
 * Monta el widget oficial de TradingView con los indicadores institucionales pre-cargados.
 * @param {string} symbol - Símbolo activo (ej. 'XAUUSD')
 */
async function renderTradingViewWidget(symbol = 'XAUUSD') {
  const chartViewport = document.getElementById('chart-viewport');
  if (!chartViewport) return;

  const tvSymbol = TV_SYMBOLS[symbol] || TV_SYMBOLS.XAUUSD;
  const tvLink = TV_EXTERNAL_LINKS[symbol] || TV_EXTERNAL_LINKS.XAUUSD;

  // Actualizar enlace externo en el header
  const extLinkBtn = document.getElementById('btn-open-tv-ext');
  if (extLinkBtn) extLinkBtn.href = tvLink;

  // Gráfico a pantalla completa limpia sin barras flotantes que tapen la barra de herramientas nativa
  chartViewport.innerHTML = '<div id="tv-chart-root" style="width: 100%; height: 100%;"></div>';

  await ensureTradingViewScript();

  if (!window.TradingView) {
    console.error('[AEON Analysis] No se pudo cargar TradingView SDK');
    return;
  }

  // Instanciar widget avanzado con fondo negro puro y sin cuadrículas
  new window.TradingView.widget({
    autosize: true,
    symbol: tvSymbol,
    interval: '60',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'es',
    toolbar_bg: '#000000',
    enable_publishing: false,
    withdateranges: true,
    hide_side_toolbar: false, // Barra de herramientas activa para trazar rectángulos y líneas
    allow_symbol_change: false,
    save_image: false,
    container_id: 'tv-chart-root',
    overrides: {
      'paneProperties.background': '#000000',
      'paneProperties.backgroundType': 'solid',
      'paneProperties.vertGridProperties.color': '#000000',
      'paneProperties.horzGridProperties.color': '#000000',
      'paneProperties.vertGridProperties.style': 0,
      'paneProperties.horzGridProperties.style': 0,
      'scalesProperties.backgroundColor': '#000000',
      'scalesProperties.lineColor': '#1e293b',
      'scalesProperties.textColor': '#94A3B8',
    },
    studies: [
      'MAExp@tv-basicstudies',
      'VWAP@tv-basicstudies',
      'RSI@tv-basicstudies',
    ],
    studies_overrides: {
      'moving average exponential.length': 50,
      'moving average exponential.plot.color': '#F97316',
      'moving average exponential.plot.linewidth': 2,
      'volume weighted average price.plot.color': '#0EA5E9',
      'volume weighted average price.plot.linewidth': 2,
      'relative strength index.plot.color': '#8B5CF6',
    },
  });
}

/**
 * Inicializa la lógica de pestañas de la terminal (Zonas / Escenarios / Detalle).
 */
function bindTerminalTabs() {
  const tabButtons = document.querySelectorAll('.terminal-tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      if (!targetTab) return;

      tabButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      e.currentTarget.classList.add('active');
      e.currentTarget.setAttribute('aria-selected', 'true');

      const allPanels = document.querySelectorAll('.tab-content-panel');
      allPanels.forEach((p) => p.classList.remove('active'));

      const activePanel = document.getElementById(`tab-panel-${targetTab}`);
      if (activePanel) activePanel.classList.add('active');
    });
  });
}

/**
 * Carga y renderiza el activo seleccionado en la terminal y el gráfico.
 * @param {string} symbol - Activo a cargar (ej. 'XAUUSD')
 */
async function loadAssetAnalysis(symbol = 'XAUUSD') {
  currentSymbol = symbol;
  const terminalViewport = document.getElementById('terminal-viewport');

  // 1. Actualizar estado activo en los botones de navegación de activos
  const assetButtons = document.querySelectorAll('.asset-pill-btn');
  assetButtons.forEach((btn) => {
    if (btn.dataset.symbol === symbol) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Obtener datos con failover garantizado
  try {
    currentData = await analysisService.getAnalysisBySymbol(symbol);
  } catch (err) {
    console.error('[AEON Analysis] Error cargando datos de análisis:', err);
  }

  // 3. Renderizar la ficha técnica en el terminal viewport
  if (terminalViewport && currentData) {
    terminalViewport.innerHTML = renderTerminalCard(currentData);
    bindTerminalTabs();
  }

  // 4. Montar el gráfico oficial de TradingView con los estudios pre-cargados
  await renderTradingViewWidget(symbol);

  // 5. Reconectar canal de Realtime para este activo
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }
  realtimeChannel = analysisService.subscribeToLiveUpdates(symbol, (updatedRecord) => {
    if (terminalViewport && updatedRecord) {
      currentData = { ...currentData, ...updatedRecord };
      terminalViewport.innerHTML = renderTerminalCard(currentData);
      bindTerminalTabs();
    }
  });
}

/**
 * Inicialización de eventos principales de la página.
 */
export function initAnalysisPage() {
  initNavbar();

  const assetButtons = document.querySelectorAll('.asset-pill-btn');
  assetButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const sym = e.currentTarget.dataset.symbol;
      if (sym && sym !== currentSymbol) {
        loadAssetAnalysis(sym);
      }
    });
  });

  loadAssetAnalysis('XAUUSD');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalysisPage);
} else {
  initAnalysisPage();
}
