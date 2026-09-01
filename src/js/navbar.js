/* ============================================================
   AEON · navbar.js — Robust Mobile Drawer Controller
   Centralized Architecture • 100% Cross-Page Compatibility
   ============================================================ */

import { renderNavbar } from './templates/navbar.js';

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

/**
 * Binds all event handlers for the navbar and mobile drawer.
 * Must be called AFTER renderNavbar() has injected the HTML.
 */
function bindNavbarEvents() {
  const toggleButtons = document.querySelectorAll('.menu-toggle, #menu-toggle');
  const overlay = document.querySelector('.mobile-overlay');
  const closeButtons = document.querySelectorAll('.drawer-close');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  // 1. Bind hamburger buttons
  toggleButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileMenu();
    };
  });

  // 2. Bind background overlay
  if (overlay) {
    overlay.onclick = () => toggleMobileMenu(true);
  }

  // 3. Bind close buttons
  closeButtons.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      toggleMobileMenu(true);
    };
  });

  // 4. Bind drawer links (auto-close on navigation)
  mobileLinks.forEach(link => {
    link.onclick = () => toggleMobileMenu(true);
  });

  // 5. Close with Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleMobileMenu(true);
  });
}

export function initNavbar() {
  // 1. Render the navbar from the centralized template (if #navbar-root exists)
  renderNavbar();

  // 2. Bind all interactive events
  bindNavbarEvents();
}

// Auto-initialize on DOM load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
}
