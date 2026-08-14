/* ============================================================
   AEON · chart.js — Lightweight Charts v5 for hero
   ============================================================ */

import { createChart, AreaSeries } from 'lightweight-charts';

// Sample XAU/USD area data
const SAMPLE_DATA = [
  { time: '2026-07-01', value: 3920 }, { time: '2026-07-03', value: 3945 },
  { time: '2026-07-07', value: 3910 }, { time: '2026-07-08', value: 3935 },
  { time: '2026-07-09', value: 3960 }, { time: '2026-07-10', value: 3980 },
  { time: '2026-07-11', value: 3955 }, { time: '2026-07-14', value: 3990 },
  { time: '2026-07-15', value: 4020 }, { time: '2026-07-16', value: 4005 },
  { time: '2026-07-17', value: 4045 }, { time: '2026-07-18', value: 4060 },
  { time: '2026-07-21', value: 4035 }, { time: '2026-07-22', value: 4080 },
  { time: '2026-07-23', value: 4070 }, { time: '2026-07-24', value: 4110 },
  { time: '2026-07-25', value: 4095 }, { time: '2026-07-28', value: 4130 },
  { time: '2026-07-29', value: 4150 }, { time: '2026-07-30', value: 4125 },
  { time: '2026-07-31', value: 4170 }, { time: '2026-08-01', value: 4200 },
  { time: '2026-08-04', value: 4185 }, { time: '2026-08-05', value: 4220 },
  { time: '2026-08-06', value: 4245 }, { time: '2026-08-07', value: 4210 },
  { time: '2026-08-08', value: 4260 }, { time: '2026-08-11', value: 4290 },
  { time: '2026-08-12', value: 4320 }, { time: '2026-08-13', value: 4366 },
];

export function initChart() {
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

  series.setData(SAMPLE_DATA);
  chart.timeScale().fitContent();
}
