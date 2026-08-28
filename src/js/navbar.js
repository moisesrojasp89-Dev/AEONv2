/* ============================================================
   AEON · navbar.js — Robust Mobile Drawer Controller
   Minimalist Nexora Architecture • 100% Cross-Page Compatibility
   ============================================================ */

export function toggleMobileMenu(forceClose = false) {
  const overlay = document.querySelector('.mobile-overlay');
  const drawer = document.querySelector('.mobile-drawer') || document.getElementById('mobile-menu');
  const toggle = document.querySelector('.menu-toggle') || document.getElementById('menu-toggle');

  if (!overlay || !drawer) return;

  const shouldOpen = forceClose ? false : !drawer.classList.contains('active');

  if (shouldOpen) {
    overlay.classList.add('active');
    drawer.classList.add('active');
    document.body.classList.add('no-scroll');
    if (toggle) {
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  } else {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    document.body.classList.remove('no-scroll');
    if (toggle) {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }
}

// Expose globally so inline onclick="toggleMobileMenu()" never fails
if (typeof window !== 'undefined') {
  window.toggleMobileMenu = (forceClose) => toggleMobileMenu(forceClose);
}

export function initNavbar() {
  const toggleButtons = document.querySelectorAll('.menu-toggle, #menu-toggle');
  const overlay = document.querySelector('.mobile-overlay');
  const closeButtons = document.querySelectorAll('.drawer-close');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  // 1. Vincular botones de hamburguesa
  toggleButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileMenu();
    };
  });

  // 2. Vincular overlay de fondo
  if (overlay) {
    overlay.onclick = () => toggleMobileMenu(true);
  }

  // 3. Vincular botones de cerrar
  closeButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      toggleMobileMenu(true);
    };
  });

  // 4. Vincular enlaces del menú
  mobileLinks.forEach(link => {
    link.onclick = () => toggleMobileMenu(true);
  });

  // 5. Cerrar con tecla Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleMobileMenu(true);
  });

  // 6. Activar estrictamente una sola píldora según la URL y hash
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash || '#briefing';

  mobileLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href') || '';
    
    if (currentPath.includes('mercados.html') && href.includes('mercados.html')) {
      link.classList.add('active');
    } else if (currentPath.includes('calendario.html') && href.includes('calendario.html')) {
      link.classList.add('active');
    } else if (currentPath.includes('perfil.html') && href.includes('perfil.html')) {
      link.classList.add('active');
    } else if (currentPath === '/' || currentPath.endsWith('index.html') || currentPath === '') {
      if (href.includes(currentHash)) {
        link.classList.add('active');
      }
    }
  });
}

// Auto-inicializar al cargar el DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
}
