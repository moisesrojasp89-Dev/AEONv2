/* ============================================================
   AEON · chart.js — Lightweight Charts v5 for Hero Section
   ============================================================ */

import { createChart, AreaSeries } from 'lightweight-charts';
import { fetchHistoricalChartData, getStoredPricesCache } from './services/marketService.js';

const ASSET_CONFIG = {
  XAU_USD: {
    name: 'Oro · Spot Gold',
    precision: 2,
    lineColor: '#0EA5E9',
    topColor: 'rgba(14,165,233,0.28)',
    bottomColor: 'rgba(14,165,233,0.01)',
  },
  EUR_USD: {
    name: 'EUR/USD · Euro',
    precision: 4,
    lineColor: '#38BDF8',
    topColor: 'rgba(56,189,248,0.28)',
    bottomColor: 'rgba(56,189,248,0.01)',
  },
  SPX500_USD: {
    name: 'S&P 500 · US Index',
    precision: 1,
    lineColor: '#22C55E',
    topColor: 'rgba(34,197,94,0.28)',
    bottomColor: 'rgba(34,197,94,0.01)',
  },
  BTC: {
    name: 'BTC/USD · Bitcoin',
    precision: 0,
    lineColor: '#F59E0B',
    topColor: 'rgba(245,158,11,0.28)',
    bottomColor: 'rgba(245,158,11,0.01)',
  },
};

let currentChart = null;
let currentSeries = null;
let currentAsset = 'XAU_USD';

function updateHeaderBadge(instrument, seriesData) {
  const symbolEl = document.getElementById('hero-chart-symbol');
  const priceBadgeEl = document.getElementById('hero-chart-price');
  if (!symbolEl || !priceBadgeEl) return;

  const cfg = ASSET_CONFIG[instrument] || ASSET_CONFIG.XAU_USD;
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

    priceBadgeEl.textContent = `${formattedPrice} ${arrow} ${sign}${diffPct}% (30d)`;
  }
}

async function loadAssetData(instrument) {
  currentAsset = instrument;
  const cfg = ASSET_CONFIG[instrument] || ASSET_CONFIG.XAU_USD;

  if (currentSeries) {
    currentSeries.applyOptions({
      lineColor: cfg.lineColor,
      topColor: cfg.topColor,
      bottomColor: cfg.bottomColor,
      priceFormat: {
        type: 'custom',
        formatter: (p) => p.toFixed(cfg.precision),
      },
    });
  }

  const seriesData = await fetchHistoricalChartData(instrument, 30);
  if (seriesData && seriesData.length > 0 && currentSeries && currentChart) {
    currentSeries.setData(seriesData);
    currentChart.timeScale().fitContent();
    updateHeaderBadge(instrument, seriesData);
  }
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
    },
    timeScale: {
      borderColor: 'rgba(255,255,255,0.06)',
      timeVisible: false,
    },
    crosshair: {
      vertLine: { color: 'rgba(14,165,233,0.3)', labelBackgroundColor: '#0EA5E9' },
      horzLine: { color: 'rgba(14,165,233,0.3)', labelBackgroundColor: '#0EA5E9' },
    },
    handleScroll: false,
    handleScale: false,
  });

  const cfg = ASSET_CONFIG.XAU_USD;
  currentSeries = currentChart.addSeries(AreaSeries, {
    topColor: cfg.topColor,
    bottomColor: cfg.bottomColor,
    lineColor: cfg.lineColor,
    lineWidth: 2,
    priceFormat: { type: 'custom', formatter: (p) => p.toFixed(cfg.precision) },
  });

  // Escuchar clics en las pestañas del gráfico
  const tabs = document.querySelectorAll('.hero-chart-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const asset = tab.dataset.asset;
      if (asset) loadAssetData(asset);
    });
  });

  // Cargar activo inicial (XAU_USD)
  await loadAssetData('XAU_USD');

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
