/* ============================================================
   AEON · analysis.js — Master Controller for /analisis.html
   Native Hero-style Lightweight Charts with Clean Minimal ZAPs
   ============================================================ */

import { createChart, LineStyle, AreaSeries } from 'lightweight-charts';
import { initNavbar } from './navbar.js';
import { analysisService } from './services/analysisService.js';
import { renderTerminalCard } from './templates/analysisCard.js';
import { fetchHistoricalChartData } from './services/marketService.js';

let currentSymbol = 'XAUUSD';
let currentData = null;
let realtimeChannel = null;
let currentActiveTab = 'zonas';

let chartInstance = null;
let chartSeries = null;
let activePriceLines = [];

const TV_EXTERNAL_LINKS = {
  XAUUSD: 'https://es.tradingview.com/chart/?symbol=OANDA%3AXAUUSD',
  BTCUSDT: 'https://es.tradingview.com/chart/?symbol=BINANCE%3ABTCUSDT',
  EURUSD: 'https://es.tradingview.com/chart/?symbol=OANDA%3AEURUSD',
  NAS100: 'https://es.tradingview.com/chart/?symbol=OANDA%3ANAS100USD',
};

/**
 * Limpia las líneas de precio anteriores.
 */
function clearPriceLines() {
  if (!chartSeries) return;
  activePriceLines.forEach((line) => {
    try {
      chartSeries.removePriceLine(line);
    } catch (_) {}
  });
  activePriceLines = [];
}

/**
 * Dibuja EXCLUSIVAMENTE las zonas ZAP esenciales (Compra y Venta) y la EMA 50.
 * Cero saturación visual.
 */
function drawMinimalZAPOverlays() {
  if (!chartSeries || !currentData) return;
  clearPriceLines();

  const isForex = currentSymbol === 'EURUSD';
  const fmt = (p) => (isForex ? Number(p).toFixed(4) : Number(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const curPrice = Number(currentData.current_price) || 0;

  // 1. ZAP Venta (Oferta) - 1 Sola Línea Clave
  const pois = Array.isArray(currentData.structural_poi) ? currentData.structural_poi : [];
  const sellPoi = pois.find((p) => String(p.type || '').toUpperCase().includes('SELL'));
  let sellTarget = sellPoi ? (sellPoi.mean_threshold || sellPoi.range_high) : null;
  if (curPrice > 0 && (!sellTarget || Math.abs(sellTarget - curPrice) / curPrice > 0.2)) {
    sellTarget = curPrice * 1.012;
  }
  if (sellTarget) {
    activePriceLines.push(
      chartSeries.createPriceLine({
        price: Number(sellTarget),
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `🔴 ZAP VENTA ($${fmt(sellTarget)})`,
      })
    );
  }

  // 2. EMA 50 (1H) - Nivel Dinámico
  let emaVal = currentData.session_levels ? currentData.session_levels.ema_50_1h : null;
  if (curPrice > 0 && (!emaVal || Math.abs(emaVal - curPrice) / curPrice > 0.2)) {
    emaVal = curPrice * 1.003;
  }
  if (emaVal) {
    activePriceLines.push(
      chartSeries.createPriceLine({
        price: Number(emaVal),
        color: '#F97316',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `⚡ EMA 50 ($${fmt(emaVal)})`,
      })
    );
  }

  // 3. ZAP Compra (Demanda) - 1 Sola Línea Clave
  const buyPoi = pois.find((p) => String(p.type || '').toUpperCase().includes('BUY'));
  let buyTarget = buyPoi ? (buyPoi.mean_threshold || buyPoi.range_low) : null;
  if (curPrice > 0 && (!buyTarget || Math.abs(buyTarget - curPrice) / curPrice > 0.2)) {
    buyTarget = curPrice * 0.988;
  }
  if (buyTarget) {
    activePriceLines.push(
      chartSeries.createPriceLine({
        price: Number(buyTarget),
        color: '#22C55E',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `🟢 ZAP COMPRA ($${fmt(buyTarget)})`,
      })
    );
  }
}

/**
 * Renderiza el gráfico estilo Hero (fluido, limpio, adaptado a móviles).
 */
async function renderHeroStyleChart(symbol = 'XAUUSD') {
  const chartViewport = document.getElementById('chart-viewport');
  if (!chartViewport) return;

  const tvLink = TV_EXTERNAL_LINKS[symbol] || TV_EXTERNAL_LINKS.XAUUSD;
  const extBtn = document.getElementById('btn-open-tv-ext');
  if (extBtn) extBtn.href = tvLink;

  // Contenedor canvas nativo limpio
  chartViewport.innerHTML = `
    <div class="chart-header-bar" style="position: absolute; top: 0.75rem; left: 0.85rem; right: 0.85rem; display: flex; justify-content: space-between; align-items: center; pointer-events: none; z-index: 10;">
      <span class="chart-header-tag" style="pointer-events: auto; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-bright); background: rgba(11, 13, 17, 0.85); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
        ⚡ Curva Institucional · ZAPs Activas
      </span>
      <a href="${tvLink}" target="_blank" rel="noopener noreferrer" class="chart-ext-btn" style="pointer-events: auto; font-family: var(--font-head); font-size: 0.72rem; font-weight: 600; color: var(--muted); background: rgba(11, 13, 17, 0.85); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); text-decoration: none;">
        TradingView ↗
      </a>
    </div>
    <div id="hero-chart-canvas-root" style="width: 100%; height: 100%;"></div>
  `;

  const canvasRoot = document.getElementById('hero-chart-canvas-root');
  if (!canvasRoot) return;

  if (chartInstance) {
    try {
      chartInstance.remove();
    } catch (_) {}
    chartInstance = null;
  }

  // Gráfico fluido idéntico al Hero de AEON
  chartInstance = createChart(canvasRoot, {
    width: canvasRoot.clientWidth || 400,
    height: canvasRoot.clientHeight || 460,
    layout: {
      background: { color: 'transparent' },
      textColor: 'rgba(228, 228, 231, 0.55)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: 'rgba(255, 255, 255, 0.025)' },
      horzLines: { color: 'rgba(255, 255, 255, 0.025)' },
    },
    rightPriceScale: {
      borderColor: 'rgba(255, 255, 255, 0.06)',
      scaleMargins: { top: 0.15, bottom: 0.15 },
      alignLabels: true,
      borderVisible: false,
    },
    timeScale: {
      borderColor: 'rgba(255, 255, 255, 0.06)',
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
    },
    crosshair: {
      vertLine: { color: 'rgba(14, 165, 233, 0.4)', labelBackgroundColor: '#0EA5E9' },
      horzLine: { color: 'rgba(14, 165, 233, 0.4)', labelBackgroundColor: '#0EA5E9' },
    },
    handleScroll: true,
    handleScale: true,
  });

  // Serie de área neón elegante
  const isForex = symbol === 'EURUSD';
  chartSeries = chartInstance.addSeries(AreaSeries, {
    lineColor: '#0EA5E9',
    topColor: 'rgba(14, 165, 233, 0.28)',
    bottomColor: 'rgba(14, 165, 233, 0.01)',
    lineWidth: 2,
    priceFormat: {
      type: 'price',
      precision: isForex ? 4 : 2,
      minMove: isForex ? 0.0001 : 0.01,
    },
  });

  // Cargar datos históricos
  const historicalData = await fetchHistoricalChartData(symbol, 45);
  if (historicalData && historicalData.length > 0) {
    if (currentData && currentData.current_price) {
      const lastIndex = historicalData.length - 1;
      historicalData[lastIndex] = {
        ...historicalData[lastIndex],
        value: Number(currentData.current_price),
      };
    }
    chartSeries.setData(historicalData);
    chartInstance.timeScale().fitContent();
  }

  // Dibujar las 2 ZAPs limpias y la EMA 50
  drawMinimalZAPOverlays();

  // ResizeObserver para fluidez táctil y responsive
  const ro = new ResizeObserver((entries) => {
    if (!entries || !entries.length || !chartInstance) return;
    const { width, height } = entries[0].contentRect;
    chartInstance.applyOptions({ width, height });
  });
  ro.observe(chartViewport);
}

/**
 * Inicializa pestañas de la terminal escrita conservando la pestaña activa.
 */
function bindTerminalTabs() {
  const tabButtons = document.querySelectorAll('.segmented-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      if (!targetTab) return;

      currentActiveTab = targetTab;

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
 * Carga el activo seleccionado en la terminal y el gráfico Hero.
 */
async function loadAssetAnalysis(symbol = 'XAUUSD') {
  currentSymbol = symbol;
  const terminalViewport = document.getElementById('terminal-viewport');

  // Actualizar pastillas activas
  const assetButtons = document.querySelectorAll('.asset-pill-btn');
  assetButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.symbol === symbol);
  });

  // Cargar datos
  try {
    currentData = await analysisService.getAnalysisBySymbol(symbol);
  } catch (err) {
    console.error('[AEON Analysis] Error cargando datos:', err);
  }

  // Renderizar terminal con la pestaña activa persistida
  if (terminalViewport && currentData) {
    terminalViewport.innerHTML = renderTerminalCard(currentData, currentActiveTab);
    bindTerminalTabs();
  }

  // Renderizar gráfico Hero limpio
  await renderHeroStyleChart(symbol);

  // Realtime conservando la pestaña seleccionada por el usuario
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }
  realtimeChannel = analysisService.subscribeToLiveUpdates(symbol, (updatedRecord) => {
    if (terminalViewport && updatedRecord) {
      currentData = { ...currentData, ...updatedRecord };
      terminalViewport.innerHTML = renderTerminalCard(currentData, currentActiveTab);
      bindTerminalTabs();
      drawMinimalZAPOverlays();
    }
  });
}

/**
 * Inicialización de la página.
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

  const urlParams = new URLSearchParams(window.location.search);
  const requestedSymbol = (urlParams.get('symbol') || '').toUpperCase();
  const validSymbols = ['XAUUSD', 'BTCUSDT', 'EURUSD', 'NAS100'];
  const initialSymbol = validSymbols.includes(requestedSymbol) ? requestedSymbol : 'XAUUSD';

  loadAssetAnalysis(initialSymbol);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalysisPage);
} else {
  initAnalysisPage();
}
