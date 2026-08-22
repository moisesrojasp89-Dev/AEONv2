/* ============================================================
   AEON · dashboard.js — User Dashboard Controller
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { DB_TABLES } from './config/constants.js';
import { initNavbar } from './navbar.js';
import { escapeHTML } from './utils/sanitize.js';

async function initDashboard() {
  initNavbar();

  const { data: authData } = await supabase.auth.getSession();
  const session = authData?.session;

  if (!session) {
    // Si no está logueado, redirigir a login
    window.location.href = '/login.html';
    return;
  }

  const user = session.user;
  const emailEl = document.getElementById('dash-user-email');
  const emailValEl = document.getElementById('dash-info-email');
  const planBadge = document.getElementById('dash-plan-badge');
  const statusVal = document.getElementById('dash-info-status');
  const periodVal = document.getElementById('dash-info-period');
  const ctaBtn = document.getElementById('dash-plan-cta');
  const logoutBtn = document.getElementById('dash-logout-btn');

  if (emailEl) emailEl.textContent = user.email || 'Trader';
  if (emailValEl) emailValEl.textContent = user.email || '—';

  // Consultar suscripción activa
  try {
    const { data: subData } = await supabase
      .from(DB_TABLES.SUBSCRIPTIONS)
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .eq('plan', 'pro')
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .maybeSingle();

    if (subData) {
      if (planBadge) {
        planBadge.className = 'plan-badge-display pro';
        planBadge.textContent = '★ Rango PRO Activo';
      }
      if (statusVal) statusVal.textContent = 'Activo';
      if (periodVal && subData.current_period_end) {
        const d = new Date(subData.current_period_end);
        periodVal.textContent = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Acceder a Señales PRO →';
        ctaBtn.href = '/index.html#senales';
      }
    } else {
      if (planBadge) {
        planBadge.className = 'plan-badge-display free';
        planBadge.textContent = 'Plan Gratuito';
      }
      if (statusVal) statusVal.textContent = 'Limitado';
      if (periodVal) periodVal.textContent = 'Ilimitado';
      if (ctaBtn) {
        ctaBtn.textContent = 'Mejorar a PRO →';
        ctaBtn.href = '/index.html#pro';
      }
    }
  } catch (err) {
    console.error('[AEON] Error cargando datos de suscripción:', err);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = '/index.html';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
