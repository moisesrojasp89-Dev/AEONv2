/* ============================================================
   AEON · chart.js — Lightweight Charts v5 for Hero Section
   ============================================================ */

import { createChart, AreaSeries } from 'lightweight-charts';
import { fetchHistoricalChartData } from './services/marketService.js';

/** Reads a CSS custom property value from :root at runtime */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Generates gradient colors from a base hex for area charts */
function areaColors(hex) {
  // Parse hex to RGB for rgba() generation
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    lineColor: hex,
    topColor: `rgba(${r},${g},${b},0.28)`,
    bottomColor: `rgba(${r},${g},${b},0.01)`,
  };
}

function getAssetConfig() {
  return {
    XAU_USD: {
      name: 'Oro (XAU/USD)',
      precision: 2,
      minMove: 0.01,
      ...areaColors(cssVar('--accent')),
    },
    EUR_USD: {
      name: 'EUR/USD (Euro)',
      precision: 4,
      minMove: 0.0001,
      ...areaColors(cssVar('--accent-hover')),
    },
    SPX500_USD: {
      name: 'S&P 500 (US500)',
      precision: 1,
      minMove: 0.1,
      ...areaColors(cssVar('--green')),
    },
    BTC: {
      name: 'Bitcoin (BTC/USD)',
      precision: 0,
      minMove: 1,
      ...areaColors(cssVar('--yellow')),
    },
  };
}

const SERIES_CACHE = {};
let currentChart = null;
let currentSeries = null;
let currentAsset = 'XAU_USD';

function updateHeaderBadge(instrument, seriesData) {
  const symbolEl = document.getElementById('hero-chart-symbol');
  const priceBadgeEl = document.getElementById('hero-chart-price');
  if (!symbolEl || !priceBadgeEl) return;

  const cfg = getAssetConfig()[instrument] || getAssetConfig().XAU_USD;
  symbolEl.textContent = cfg.name;

  if (seriesData && seriesData.length > 0) {
    const latest = seriesData[seriesData.length - 1].value;
    const first = seriesData[0].value;
    const diffPct = (((latest - first) / first) * 100).toFixed(2);
    const sign = diffPct >= 0 ? '+' : '';
    const arrow = diffPct >= 0 ? '▲' : '▼';

    const formattedPrice = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: cfg.precision,
      maximumFractionDigits: cfg.precision,
    }).format(latest);

    const isMobile = window.innerWidth <= 600;
    priceBadgeEl.textContent = isMobile 
      ? `${formattedPrice} ${arrow} ${sign}${diffPct}%` 
      : `${formattedPrice} ${arrow} ${sign}${diffPct}% (30d)`;
  }
}

function applyAssetSeries(instrument, seriesData) {
  const cfg = getAssetConfig()[instrument] || getAssetConfig().XAU_USD;
  if (!currentSeries || !currentChart || !seriesData || seriesData.length === 0) return;

  currentSeries.applyOptions({
    lineColor: cfg.lineColor,
    topColor: cfg.topColor,
    bottomColor: cfg.bottomColor,
    priceFormat: {
      type: 'price',
      precision: cfg.precision,
      minMove: cfg.minMove,
    },
  });

  currentSeries.setData(seriesData);
  currentChart.timeScale().fitContent();
  currentChart.priceScale('right').applyOptions({ autoScale: true });
  updateHeaderBadge(instrument, seriesData);
}

async function loadAssetData(instrument) {
  currentAsset = instrument;

  // 1. Si ya está en memoria caché, renderizado instantáneo en 0ms (cero lag)
  if (SERIES_CACHE[instrument] && SERIES_CACHE[instrument].length > 0) {
    applyAssetSeries(instrument, SERIES_CACHE[instrument]);
    return;
  }

  // 2. Si no, consultar y guardar en caché
  const seriesData = await fetchHistoricalChartData(instrument, 30);
  if (seriesData && seriesData.length > 0) {
    SERIES_CACHE[instrument] = seriesData;
    if (currentAsset === instrument) {
      applyAssetSeries(instrument, seriesData);
    }
  }
}

async function prefetchAllAssets() {
  const instruments = ['XAU_USD', 'EUR_USD', 'SPX500_USD', 'BTC'];
  await Promise.allSettled(
    instruments.map(async (inst) => {
      if (!SERIES_CACHE[inst]) {
        const data = await fetchHistoricalChartData(inst, 30);
        if (data && data.length > 0) {
          SERIES_CACHE[inst] = data;
        }
      }
    })
  );
}

export async function initChart() {
  const container = document.getElementById('hero-chart-canvas');
  if (!container) return;

  currentChart = createChart(container, {
    autoSize: true,
    layout: {
      background: { color: 'transparent' },
      textColor: 'rgba(228,228,231,0.45)',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.03)' },
      horzLines: { color: 'rgba(255,255,255,0.03)' },
    },
    rightPriceScale: {
      borderColor: 'rgba(255,255,255,0.06)',
      scaleMargins: {
        top: 0.12,
        bottom: 0.12,
      },
      alignLabels: true,
      borderVisible: false,
    },
    timeScale: {
      borderColor: 'rgba(255,255,255,0.06)',
      timeVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
      rightOffset: 0,
    },
    crosshair: {
      vertLine: { color: 'rgba(14,165,233,0.3)', labelBackgroundColor: '#0EA5E9' },
      horzLine: { color: 'rgba(14,165,233,0.3)', labelBackgroundColor: '#0EA5E9' },
    },
    handleScroll: false,
    handleScale: false,
  });

  const cfg = getAssetConfig().XAU_USD;
  currentSeries = currentChart.addSeries(AreaSeries, {
    topColor: cfg.topColor,
    bottomColor: cfg.bottomColor,
    lineColor: cfg.lineColor,
    lineWidth: 2,
    priceFormat: {
      type: 'price',
      precision: cfg.precision,
      minMove: cfg.minMove,
    },
  });

  // Escuchar clics en las pestañas del gráfico (Respuesta instantánea)
  const tabs = document.querySelectorAll('.hero-chart-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const asset = tab.dataset.asset;
      if (asset) loadAssetData(asset);
    });
  });

  // Cargar activo inicial de inmediato
  await loadAssetData('XAU_USD');

  // Pre-cargar el resto de activos en segundo plano para que los clics sean inmediatos
  prefetchAllAssets();

  // Observador de cambio de tamaño responsivo
  const resizeObserver = new ResizeObserver((entries) => {
    if (!entries || entries.length === 0 || !entries[0].contentRect) return;
    currentChart.applyOptions({
      width: entries[0].contentRect.width,
      height: entries[0].contentRect.height,
    });
  });

  resizeObserver.observe(container);
}
