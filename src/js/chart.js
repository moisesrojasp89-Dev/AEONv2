/* ============================================================
   AEON · chart.js — Lightweight Charts v5 for Hero Section
   ============================================================ */

import { createChart, AreaSeries } from 'lightweight-charts';
import { fetchHistoricalChartData } from './services/marketService.js';

// Baseline fallback data for instant rendering before API arrives
const DEFAULT_SERIES = [
  { time: '2026-07-21', value: 4035 }, { time: '2026-07-22', value: 4080 },
  { time: '2026-07-23', value: 4070 }, { time: '2026-07-24', value: 4110 },
  { time: '2026-07-25', value: 4095 }, { time: '2026-07-28', value: 4130 },
  { time: '2026-07-29', value: 4150 }, { time: '2026-07-30', value: 4125 },
  { time: '2026-07-31', value: 4170 }, { time: '2026-08-01', value: 4200 },
  { time: '2026-08-04', value: 4185 }, { time: '2026-08-05', value: 4220 },
  { time: '2026-08-06', value: 4245 }, { time: '2026-08-07', value: 4210 },
  { time: '2026-08-08', value: 4260 }, { time: '2026-08-11', value: 4290 },
  { time: '2026-08-12', value: 4320 }, { time: '2026-08-13', value: 4366 },
  { time: '2026-08-14', value: 4420 }, { time: '2026-08-17', value: 4490 },
  { time: '2026-08-18', value: 4520 }, { time: '2026-08-19', value: 4580 },
  { time: '2026-08-20', value: 4604 },
];

export async function initChart() {
  const container = document.getElementById('hero-chart');
  if (!container) return;

  const chart = createChart(container, {
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

  const series = chart.addSeries(AreaSeries, {
    topColor: 'rgba(14,165,233,0.28)',
    bottomColor: 'rgba(14,165,233,0.01)',
    lineColor: '#0EA5E9',
    lineWidth: 2,
    priceFormat: { type: 'custom', formatter: (p) => p.toFixed(0) },
  });

  // 1. Cargar datos base de inmediato
  series.setData(DEFAULT_SERIES);
  chart.timeScale().fitContent();

  // 2. Consultar velas históricas reales de OANDA
  try {
    const realSeries = await fetchHistoricalChartData('XAU_USD', 30);
    if (realSeries && realSeries.length > 0) {
      series.setData(realSeries);
      chart.timeScale().fitContent();
    }
  } catch (err) {
    console.warn('[AEON] Error sincronizando histórico del gráfico:', err.message);
  }

  // 3. Responsive Resize Observer
  const resizeObserver = new ResizeObserver((entries) => {
    if (!entries || entries.length === 0 || !entries[0].contentRect) return;
    chart.applyOptions({
      width: entries[0].contentRect.width,
      height: entries[0].contentRect.height,
    });
  });

  resizeObserver.observe(container);
}
