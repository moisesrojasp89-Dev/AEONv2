/* ============================================================
   AUREUM · navbar.js — Mobile menu
   ============================================================ */

export function initNavbar() {
  const toggle = document.getElementById('menu-toggle');
  const menu   = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const open = () => {
    menu.classList.add('active');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
  };

  const close = () => {
    menu.classList.remove('active');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
  };

  toggle.addEventListener('click', () =>
    menu.classList.contains('active') ? close() : open()
  );

  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => e.key === 'Escape' && close());
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) close();
  });
}
