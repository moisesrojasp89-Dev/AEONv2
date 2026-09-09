/* ============================================================
   AEON · admin-pagos.js — Panel Admin de Pagos Cripto
   Gestión de órdenes pendientes desde cualquier dispositivo
   ============================================================ */

import { supabase } from './supabaseClient.js';

async function initAdminPanel() {
  const listEl = document.getElementById('admin-payments-list');
  const countEl = document.getElementById('admin-pending-count');
  const refreshBtn = document.getElementById('admin-refresh');
  const statusEl = document.getElementById('admin-status');
  const accessDenied = document.getElementById('admin-access-denied');
  const adminContent = document.getElementById('admin-content');

  // 1. Verificar autenticación
  const { data: authData } = await supabase.auth.getSession();
  if (!authData?.session) {
    window.location.href = '/login.html';
    return;
  }

  // 2. Verificar rol admin
  const userId = authData.session.user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tier')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || (profile.role !== 'admin' && profile.tier !== 'admin')) {
    if (accessDenied) accessDenied.style.display = 'block';
    if (adminContent) adminContent.style.display = 'none';
    return;
  }

  if (accessDenied) accessDenied.style.display = 'none';
  if (adminContent) adminContent.style.display = 'block';

  // 3. Cargar pagos pendientes
  async function loadPending() {
    if (statusEl) statusEl.textContent = 'Cargando...';
    if (listEl) listEl.innerHTML = '';

    try {
      const { data, error } = await supabase.rpc('admin_list_pending_payments');
      if (error) throw error;

      if (countEl) countEl.textContent = data.length;
      if (statusEl) statusEl.textContent = data.length ? '' : '✓ No hay pagos pendientes';

      if (!data.length) {
        if (listEl) listEl.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Sin órdenes pendientes. Todo al día ✓</p>';
        return;
      }

      data.forEach(p => {
        const card = document.createElement('div');
        card.className = 'admin-pay-card';
        const date = (p.created_at || '').slice(0, 16).replace('T', ' ');
        card.innerHTML = `
          <div class="admin-pay-header">
            <span class="admin-pay-order">${p.order_id}</span>
            <span class="admin-pay-badge">🟡 PENDIENTE</span>
          </div>
          <div class="admin-pay-body">
            <div class="admin-pay-row"><span>Usuario:</span><strong>${p.user_email || p.user_id}</strong></div>
            <div class="admin-pay-row"><span>Plan:</span><strong>${p.plan.toUpperCase()} (${p.plan_days}d)</strong></div>
            <div class="admin-pay-row"><span>Monto:</span><strong>$${p.amount} ${p.currency}</strong></div>
            <div class="admin-pay-row"><span>Método:</span><strong>${p.payment_method}</strong></div>
            <div class="admin-pay-row"><span>TxID / Ref:</span><strong style="word-break:break-all;">${p.tx_reference}</strong></div>
            <div class="admin-pay-row"><span>Fecha:</span><strong>${date} UTC</strong></div>
          </div>
          <div class="admin-pay-actions">
            <button class="admin-btn admin-btn-approve" data-id="${p.id}" data-order="${p.order_id}">✅ Aprobar y Activar PRO</button>
            <button class="admin-btn admin-btn-reject" data-id="${p.id}" data-order="${p.order_id}">❌ Rechazar</button>
          </div>
        `;
        listEl.appendChild(card);
      });

      // Event delegation
      listEl.querySelectorAll('.admin-btn-approve').forEach(btn => {
        btn.addEventListener('click', () => handleApprove(btn.dataset.id, btn.dataset.order, btn));
      });
      listEl.querySelectorAll('.admin-btn-reject').forEach(btn => {
        btn.addEventListener('click', () => handleReject(btn.dataset.id, btn.dataset.order, btn));
      });

    } catch (err) {
      console.error('[Admin]', err);
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
    }
  }

  // 4. Aprobar pago
  async function handleApprove(paymentId, orderId, btn) {
    if (!confirm(`¿Aprobar orden ${orderId} y activar PRO?`)) return;
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    try {
      const { data, error } = await supabase.rpc('approve_crypto_payment', { p_payment_id: paymentId });
      if (error) throw error;

      if (data?.success) {
        alert(`✅ ${orderId} aprobada. Usuario PRO hasta ${data.period_end}`);
        loadPending();
      } else {
        alert(`⚠ ${data?.message || 'Error desconocido'}`);
        btn.disabled = false;
        btn.textContent = '✅ Aprobar y Activar PRO';
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
      btn.disabled = false;
      btn.textContent = '✅ Aprobar y Activar PRO';
    }
  }

  // 5. Rechazar pago
  async function handleReject(paymentId, orderId, btn) {
    if (!confirm(`¿Rechazar orden ${orderId}?`)) return;
    btn.disabled = true;

    try {
      const { data, error } = await supabase.rpc('admin_reject_payment', { p_payment_id: paymentId });
      if (error) throw error;
      alert(`❌ ${orderId} rechazada.`);
      loadPending();
    } catch (err) {
      alert(`Error: ${err.message}`);
      btn.disabled = false;
    }
  }

  // 6. Refresh
  if (refreshBtn) refreshBtn.addEventListener('click', loadPending);

  // Carga inicial
  loadPending();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
  initAdminPanel();
}
