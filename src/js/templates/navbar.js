/* ============================================================
   AEON · templates/navbar.js — Centralized Navbar & Drawer
   Single Source of Truth for all navigation across the MPA.
   Eliminates ~100 lines of duplicated HTML per page.
   ============================================================ */

/**
 * Navigation link definitions.
 * To add a new page (e.g., "Análisis"), add an entry here — all pages update automatically.
 */
const NAV_LINKS = [
  { id: 'briefing',    label: 'Briefing',    href: '/index.html#briefing',   icon: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>' },
  { id: 'mercados',    label: 'Mercados',    href: '/mercados.html',         icon: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' },
  { id: 'calendario',  label: 'Calendario',  href: '/calendario.html',       icon: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>' },
  { id: 'educacion',   label: 'Educación',   href: '/index.html#educacion',  icon: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>' },
];

/**
 * Detects which page is currently active based on URL pathname and hash.
 * @returns {string} The id of the active nav link
 */
function detectActivePage() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  if (path.includes('mercados.html'))    return 'mercados';
  if (path.includes('calendario.html'))  return 'calendario';
  if (path.includes('analisis.html'))    return 'analisis';
  if (path.includes('perfil.html'))      return 'perfil';

  // index.html or root — use hash to determine section
  if (hash === '#educacion') return 'educacion';
  return 'briefing';
}

/**
 * Generates the desktop nav links HTML.
 * @param {string} activeId
 * @returns {string}
 */
function renderDesktopLinks(activeId) {
  return NAV_LINKS.map(link => {
    const isActive = link.id === activeId;
    const activeClass = isActive ? ' active' : '';
    const activeStyle = isActive ? ' style="color: var(--accent); font-weight: 700;"' : '';
    return `<li><a href="${link.href}" class="nav-link${activeClass}"${activeStyle}>${link.label}</a></li>`;
  }).join('\n          ');
}

/**
 * Generates a single mobile drawer link.
 * @param {Object} link
 * @param {string} activeId
 * @returns {string}
 */
function renderDrawerLink(link, activeId) {
  const isActive = link.id === activeId;
  const activeClass = isActive ? ' active' : '';
  return `<a href="${link.href}" class="mobile-link${activeClass}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${link.icon}</svg>
            <span>${link.label}</span>
          </a>`;
}

/**
 * Renders the complete navbar + mobile overlay + mobile drawer into #navbar-root.
 * Handles both guest and authenticated user states.
 */
export function renderNavbar() {
  const root = document.getElementById('navbar-root');
  if (!root) return;

  const activeId = detectActivePage();
  const isPerfilPage = window.location.pathname.includes('perfil.html');

  // Logo href: "/" on index, "/index.html" on subpages
  const logoHref = (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))
    ? '/' : '/index.html';

  const drawerLinks = NAV_LINKS.map(link => renderDrawerLink(link, activeId)).join('\n          ');

  // Desktop nav actions differ on perfil page (always shows logout)
  const desktopActions = isPerfilPage
    ? `<div class="nav-auth-group">
          <a href="/index.html" class="nav-btn btn-nav-ghost">Ir a Inicio</a>
          <button id="btn-logout" class="btn-primary nav-btn nav-btn-logout">Cerrar Sesión</button>
        </div>`
    : `<!-- Guest view -->
        <div id="nav-guest-view" class="nav-auth-group">
          <a href="/login.html" class="nav-btn btn-nav-ghost">Iniciar Sesión</a>
          <a href="/registro.html" class="btn-primary nav-btn nav-btn-pro">Acceso Pro</a>
        </div>
        <!-- User view -->
        <div id="nav-user-view" class="nav-auth-group" style="display: none;">
          <a href="/perfil.html" class="nav-btn btn-nav-ghost">Mi Perfil</a>
          <button id="btn-logout" class="btn-primary nav-btn nav-btn-logout">Cerrar Sesión</button>
        </div>`;

  // Mobile drawer guest/user sections
  const drawerAuthSection = isPerfilPage
    ? `<div class="drawer-section">
          <p class="drawer-label">MI CUENTA</p>
          <a href="/perfil.html" class="mobile-link active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Mi Perfil</span>
          </a>
          <button id="btn-logout-mobile" class="mobile-link" style="text-align: left; width: 100%; border: none; background: transparent; cursor: pointer; font-family: inherit;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>`
    : `<div class="drawer-section" id="mobile-nav-guest">
          <p class="drawer-label">CUENTA</p>
          <a href="/login.html" class="mobile-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
            <span>Iniciar Sesión</span>
          </a>
        </div>
        <div class="drawer-section" id="mobile-nav-user" style="display: none;">
          <p class="drawer-label">MI CUENTA</p>
          <a href="/perfil.html" class="mobile-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Mi Perfil</span>
          </a>
          <button id="btn-logout-mobile" class="mobile-link" style="text-align: left; width: 100%; border: none; background: transparent; cursor: pointer; font-family: inherit;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>`;

  root.innerHTML = `
  <header class="header" role="banner">
    <nav class="navbar container" aria-label="Navegación principal">
      <a href="${logoHref}" class="logo" aria-label="AEON inicio">
        <img src="/AEON.png" alt="AEON" class="logo-img" />
      </a>
      <ul class="nav-links" role="list">
          ${renderDesktopLinks(activeId)}
      </ul>
      <div class="nav-actions">
        ${desktopActions}
      </div>
      <button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobile-drawer">
        <span></span><span></span><span></span>
      </button>
    </nav>
  </header>`;

  // Drawer and overlay are injected at the end of <body> to avoid stacking context issues
  const drawerFragment = document.createElement('div');
  drawerFragment.innerHTML = `
  <div class="mobile-overlay"></div>
  <aside class="mobile-drawer" id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menú de navegación móvil">
    <div class="drawer-header">
      <img src="/AEON.png" alt="AEON" class="logo-img" style="height: 26px;" />
      <button class="drawer-close" aria-label="Cerrar menú">✕</button>
    </div>
    <div class="drawer-content">
      <div class="drawer-section">
        <p class="drawer-label">PLATAFORMA</p>
          ${drawerLinks}
      </div>

      ${drawerAuthSection}

      <!-- Tarjeta Pro Estilo Nexora -->
      <div class="drawer-pro-card">
        <div class="drawer-pro-icon">✦</div>
        <div class="drawer-pro-title">AEON Pro Terminal</div>
        <div class="drawer-pro-desc">Análisis macro institucional, niveles clave y contexto de IA.</div>
        <a href="/registro.html" class="drawer-pro-btn">Desbloquear Acceso Pro →</a>
      </div>
    </div>
  </aside>`;

  // Append overlay + drawer to body
  while (drawerFragment.firstChild) {
    document.body.appendChild(drawerFragment.firstChild);
  }
}
