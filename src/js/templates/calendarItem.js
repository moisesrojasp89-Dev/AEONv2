export const calendarRow = (evt, index) => {
  const impactClass = evt.impact === 'HIGH' ? 'high' : 'med';
  const actualClass = evt.actual === 'Pendiente' ? 'pending' : (evt.actual > evt.forecast ? 'better' : 'worse');
  
  // Extraer la primera moneda (ej: USD) para el badge
  const currency = evt.assets[0] ? evt.assets[0].split('/')[0] : 'USD';

  return `
    <div class="eco-row-group" id="eco-grp-${index}">
      <div class="eco-row" onclick="toggleDetails(${index})">
        <div class="eco-cell eco-time">${evt.time}</div>
        <div class="eco-cell eco-asset">${currency}</div>
        <div class="eco-cell impact"><span class="impact-dot ${impactClass}" title="Impacto ${evt.impact}"></span></div>
        <div class="eco-cell eco-event">${evt.event}</div>
        <div class="eco-cell eco-data actual ${actualClass}">${evt.actual}</div>
        <div class="eco-cell eco-data forecast">${evt.forecast}</div>
        <div class="eco-cell eco-data previous">${evt.previous}</div>
        <div class="eco-cell eco-expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="eco-details">
        ${evt.description}
      </div>
    </div>
  `;
};
