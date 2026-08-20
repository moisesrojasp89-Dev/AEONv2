export function parseEcoValue(str) {
  if (typeof str !== 'string') return null;
  const s = str.toUpperCase().trim();
  if (!s || s === 'N/A' || s === 'PENDIENTE') return null;

  let multiplier = 1;
  if (s.includes('K')) multiplier = 1e3;
  else if (s.includes('M')) multiplier = 1e6;
  else if (s.includes('B')) multiplier = 1e9;

  const match = s.match(/-?[\d,.]+/);
  if (!match) return null;

  const numStr = match[0].replace(/,/g, '');
  const val = parseFloat(numStr);

  if (isNaN(val)) return null;

  return val * multiplier;
}

export const calendarRow = (evt, index) => {
  const impactClass = evt.impact === 'HIGH' ? 'high' : 'med';
  
  let actualClass = '';
  if (evt.actual === 'Pendiente') {
    actualClass = 'pending';
  } else {
    const actVal = parseEcoValue(evt.actual);
    const forVal = parseEcoValue(evt.forecast);
    
    if (actVal !== null && forVal !== null && evt.evaluation) {
      if (evt.evaluation === 'higherIsBetter') {
        actualClass = actVal > forVal ? 'better' : (actVal < forVal ? 'worse' : '');
      } else if (evt.evaluation === 'lowerIsBetter') {
        actualClass = actVal < forVal ? 'better' : (actVal > forVal ? 'worse' : '');
      }
    }
  }

  // Extraer la primera moneda (ej: USD) para el badge
  const currency = evt.assets && evt.assets[0] ? evt.assets[0].split('/')[0] : 'USD';

  return `
    <div class="eco-row-group" id="eco-grp-${index}">
      <div class="eco-row" data-index="${index}">
        <div class="eco-cell eco-time">${evt.time}</div>
        <div class="eco-cell eco-asset">${currency}</div>
        <div class="eco-cell impact"><span class="impact-dot ${impactClass}" title="Impacto ${evt.impact}"></span></div>
        <div class="eco-cell eco-event">
          <span class="mobile-asset-badge desktop-hidden" style="display: none; font-size: 0.65rem; font-family: var(--font-mono); padding: 0.15rem 0.35rem; background: rgba(255,255,255,0.1); border-radius: 4px; margin-right: 0.4rem; color: #fff;">${currency}</span>
          ${evt.event}
        </div>
        <div class="eco-cell eco-data actual ${actualClass}" style="color: ${evt.actual === 'Pendiente' ? '#94a3b8' : '#fff'};">${evt.actual}</div>
        <div class="eco-cell eco-data forecast" style="color: #cbd5e1;">${evt.forecast}</div>
        <div class="eco-cell eco-data previous" style="color: #cbd5e1;">${evt.previous}</div>
        <div class="eco-cell eco-expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="eco-details">
        <div class="mobile-stats desktop-hidden" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px; width: 100%; box-sizing: border-box;">
           <div style="text-align: center;">
             <div style="font-size: 0.7rem; color: var(--muted); margin-bottom: 0.2rem;">ACTUAL</div>
             <div class="eco-data actual ${actualClass}" style="color: ${evt.actual === 'Pendiente' ? '#94a3b8' : '#fff'};">${evt.actual}</div>
           </div>
           <div style="text-align: center;">
             <div style="font-size: 0.7rem; color: var(--muted); margin-bottom: 0.2rem;">CONS</div>
             <div class="eco-data forecast" style="color: #cbd5e1;">${evt.forecast}</div>
           </div>
           <div style="text-align: center;">
             <div style="font-size: 0.7rem; color: var(--muted); margin-bottom: 0.2rem;">PREV</div>
             <div class="eco-data previous" style="color: #cbd5e1;">${evt.previous}</div>
           </div>
        </div>
        ${evt.description}
      </div>
    </div>
  `;
};
