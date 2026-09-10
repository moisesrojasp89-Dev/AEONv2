/* ============================================================
   AEON · perfil.js — Institutional User Profile & Terminal Controller
   Trader Command Center: Accessible Tabs, Live AI Quota & Security Hub
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { DB_TABLES } from './config/constants.js';
import { initNavbar } from './navbar.js';
import { fetchUserAiQuota } from './services/chatService.js';

function computeInitials(name = '') {
  if (!name) return 'TR';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function computeTerminalId(userId = '') {
  if (!userId) return '#8942';
  const hex = userId.replace(/-/g, '');
  return '#' + hex.slice(0, 5).toUpperCase();
}

function showAlert(alertEl, message, type = 'success') {
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `dash-alert ${type}`;
  alertEl.style.display = 'block';

  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 4500);
}

function evaluatePasswordStrength(password = '') {
  if (!password) {
    return { score: 0, label: 'Introduce tu contraseña', className: '' };
  }

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  let passed = 0;
  if (hasLength) passed++;
  if (hasUpper) passed++;
  if (hasNumber) passed++;
  if (hasSymbol) passed++;

  if (passed < 2 || !hasLength) {
    return {
      score: 1,
      label: 'Débil (mínimo 8 caracteres)',
      className: 'weak',
    };
  }

  if (passed === 2 || passed === 3) {
    return {
      score: 2,
      label: 'Media (añade mayúscula, número y símbolo)',
      className: 'medium',
    };
  }

  return {
    score: 3,
    label: 'Robusta / Grado Institucional ✓',
    className: 'strong',
  };
}

function renderPasswordStrength(strength) {
  const bar1 = document.getElementById('str-bar-1');
  const bar2 = document.getElementById('str-bar-2');
  const bar3 = document.getElementById('str-bar-3');
  const textEl = document.getElementById('dash-pass-strength-text');

  if (!bar1 || !bar2 || !bar3 || !textEl) return;

  bar1.className = 'strength-bar';
  bar2.className = 'strength-bar';
  bar3.className = 'strength-bar';

  if (strength.score >= 1) bar1.classList.add(strength.className);
  if (strength.score >= 2) bar2.classList.add(strength.className);
  if (strength.score >= 3) bar3.classList.add(strength.className);

  textEl.textContent = strength.label;
  textEl.className = `strength-text ${strength.className}`;
}

// ============================================================
// Checkout Modal PRO & Blindaje Clickwrap ("Chulito")
// ============================================================
let currentUserId = null;
let currentUserEmail = '';
let userIsPro = false;
let proCelebrationShown = false;
let pollingTimer = null;

function showProFloatingToast() {
  if (document.getElementById('pro-activated-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'pro-activated-toast';
  toast.className = 'pro-activated-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.innerHTML = `
    <div class="pro-toast-icon">🎉</div>
    <div class="pro-toast-content">
      <h4>¡Membresía PRO Activada!</h4>
      <p>Tu pago ha sido verificado y aprobado. Ya dispones de acceso total a las señales élite y al Terminal institucional.</p>
      <a href="/mercados.html" class="pro-toast-btn">Ir al Terminal de Mercados →</a>
    </div>
    <button type="button" class="pro-toast-close" aria-label="Cerrar notificación" style="background:none;border:none;color:#94a3b8;font-size:1.3rem;cursor:pointer;line-height:1;padding:0 0 0 0.5rem;">&times;</button>
  `;

  const closeBtn = toast.querySelector('.pro-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => toast.remove());
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 500);
    }
  }, 15000);
}

function triggerProCelebration() {
  if (proCelebrationShown) return;
  proCelebrationShown = true;

  const checkoutModal = document.getElementById('modal-checkout-pro');
  const isModalOpen = checkoutModal && checkoutModal.classList.contains('open');

  if (isModalOpen) {
    const pendingView = document.getElementById('checkout-view-pending');
    const plansView = document.getElementById('checkout-view-plans');
    const detailsView = document.getElementById('checkout-view-details');

    if (plansView) plansView.classList.remove('active');
    if (detailsView) detailsView.classList.remove('active');
    if (pendingView) pendingView.classList.add('active');

    const spinnerIcon = document.getElementById('pending-spinner-icon');
    const title = document.getElementById('pending-title');
    const subtitle = document.getElementById('pending-subtitle');
    const badge = document.getElementById('pending-badge');
    const autoNote = document.getElementById('pending-auto-note');
    const finishBtn = document.getElementById('btn-finish-checkout');

    if (spinnerIcon) {
      spinnerIcon.textContent = '🎉';
      spinnerIcon.classList.add('approved');
    }
    if (title) {
      title.textContent = '¡Membresía PRO Activada!';
      title.style.color = '#38bdf8';
    }
    if (subtitle) {
      subtitle.textContent = 'Tu pago ha sido verificado con éxito por administración. Tu cuenta ya cuenta con todos los privilegios PRO.';
    }
    if (badge) {
      badge.textContent = '🟢 PAGO APROBADO & PRO ACTIVO';
      badge.classList.add('approved');
    }
    if (autoNote) {
      autoNote.innerHTML = `
        <p style="color: #4ade80; font-weight: 600; font-size: 0.95rem; margin-bottom: 0.4rem;">
          ✓ ¡Acceso Institucional Desbloqueado!
        </p>
        <p class="pending-time-estimate" style="color: #94a3b8;">
          Ya puedes acceder a todas las señales de trading, análisis Macro en vivo y Copiloto IA sin restricciones.
        </p>
      `;
    }
    if (finishBtn) {
      finishBtn.textContent = '🚀 Comenzar a Operar en Mercados →';
      finishBtn.className = 'btn btn-primary btn-block';
      finishBtn.onclick = () => {
        window.location.href = '/mercados.html';
      };
    }
  }

  showProFloatingToast();
}

function setupCheckoutModal() {
  const checkoutModal = document.getElementById('modal-checkout-pro');
  if (!checkoutModal) return;

  const btnCloseCheckout = document.getElementById('btn-close-checkout');
  const btnFinishCheckout = document.getElementById('btn-finish-checkout');
  const btnBackToPlans = document.getElementById('btn-back-to-plans');
  const btnProceedPayment = document.getElementById('btn-proceed-payment');
  const btnProceedText = document.getElementById('btn-proceed-text');
  const termsCheckbox = document.getElementById('checkout-terms-checkbox');
  const btnConfirmSent = document.getElementById('btn-confirm-sent');
  const btnConfirmText = document.getElementById('btn-confirm-text');
  const btnCopyAddress = document.getElementById('btn-copy-address');
  const copyHint = document.getElementById('copy-success-hint');
  const depositAddressInput = document.getElementById('deposit-address-input');
  const depositAmountDisplay = document.getElementById('deposit-amount-display');
  const depositNetworkDisplay = document.getElementById('deposit-network-display');
  const depositPlanDisplay = document.getElementById('deposit-plan-display');
  const depositTxInput = document.getElementById('deposit-tx-input');
  const depositTxError = document.getElementById('deposit-tx-error');
  const pendingOrderId = document.getElementById('pending-order-id');
  const pendingPlanName = document.getElementById('pending-plan-name');
  const pendingAmount = document.getElementById('pending-amount');
  const pendingTxRef = document.getElementById('pending-tx-ref');
  const pendingTerminalId = document.getElementById('pending-terminal-id');
  const btnWhatsappNotify = document.getElementById('btn-whatsapp-notify');
  const dashPlanCta = document.getElementById('dash-plan-cta');

  const viewPlans = document.getElementById('checkout-view-plans');
  const viewDetails = document.getElementById('checkout-view-details');
  const viewPending = document.getElementById('checkout-view-pending');

  const planCards = document.querySelectorAll('.checkout-plan-card');
  const methodItems = document.querySelectorAll('.checkout-method-item');

  let selectedPlan = 'monthly';
  let selectedPrice = 6.99;
  let selectedMethod = 'binance';

  const WALLET_DATA = {
    'binance': {
      network: 'Binance Pay (Cero Gas Fee)',
      address: '401032901',
      recipient: 'AEON INTELLIGENCE'
    },
    'usdt-trc20': {
      network: 'Red TRON (TRC-20)',
      address: 'PENDIENTE — Contactar soporte para dirección TRC-20'
    },
    'usdt-bep20': {
      network: 'Binance Smart Chain (BEP-20)',
      address: 'PENDIENTE — Contactar soporte para dirección BEP-20'
    }
  };

  // Mapeo de métodos frontend → valores de la columna CHECK en SQL
  const METHOD_DB_MAP = {
    'binance': 'binance_pay',
    'usdt-trc20': 'usdt_trc20',
    'usdt-bep20': 'usdt_bep20'
  };

  function openCheckoutModal() {
    switchCheckoutView('plans');
    if (termsCheckbox) {
      termsCheckbox.checked = false;
      updateProceedButtonState();
    }
    checkoutModal.classList.add('open');
    checkoutModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    checkoutModal.classList.remove('open');
    checkoutModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.openAeonCheckoutModal = openCheckoutModal;

  function switchCheckoutView(viewName) {
    if (viewPlans) viewPlans.classList.toggle('active', viewName === 'plans');
    if (viewDetails) viewDetails.classList.toggle('active', viewName === 'details');
    if (viewPending) viewPending.classList.toggle('active', viewName === 'pending');
  }

  function updateProceedButtonState() {
    if (!btnProceedPayment || !btnProceedText) return;
    const isAccepted = termsCheckbox && termsCheckbox.checked;
    btnProceedPayment.disabled = !isAccepted;

    const lockIcon = btnProceedPayment.querySelector('.btn-lock-icon');
    if (isAccepted) {
      btnProceedText.textContent = `Proceder al Pago Seguro ($${selectedPrice.toFixed(2)} USDT) →`;
      if (lockIcon) lockIcon.textContent = '⚡';
    } else {
      btnProceedText.textContent = 'Acepta los términos para continuar';
      if (lockIcon) lockIcon.textContent = '🔒';
    }
  }

  // Interacción de Selección de Plan
  planCards.forEach(card => {
    card.addEventListener('click', () => {
      planCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      selectedPlan = card.dataset.plan || 'monthly';
      selectedPrice = parseFloat(card.dataset.price) || 6.99;
      updateProceedButtonState();
    });
  });

  // Interacción de Selección de Método de Pago
  methodItems.forEach(item => {
    item.addEventListener('click', () => {
      methodItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      const radio = item.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      selectedMethod = item.dataset.method || 'binance';
    });
  });

  // Listener del "Chulito" Obligatorio (Clickwrap Legal)
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', updateProceedButtonState);
  }

  // Proceder al Paso 2: Detalles de Transferencia
  const PLAN_LABELS = {
    'weekly': 'Pase Semanal de Prueba (7 días)',
    'monthly': 'Membresía Mensual (30 días)',
    'quarterly': 'Pase Trimestral (90 días)'
  };

  if (btnProceedPayment) {
    btnProceedPayment.addEventListener('click', () => {
      if (!termsCheckbox || !termsCheckbox.checked) return;

      const walletInfo = WALLET_DATA[selectedMethod] || WALLET_DATA['binance'];
      if (depositAmountDisplay) depositAmountDisplay.textContent = `$${selectedPrice.toFixed(2)} USDT`;
      if (depositNetworkDisplay) depositNetworkDisplay.textContent = `${walletInfo.network} (ID: ${walletInfo.address})`;
      if (depositPlanDisplay) depositPlanDisplay.textContent = PLAN_LABELS[selectedPlan] || 'Membresía AEON Pro';
      if (depositAddressInput) depositAddressInput.value = walletInfo.address;
      if (copyHint) copyHint.classList.remove('visible');

      switchCheckoutView('details');
    });
  }

  if (btnBackToPlans) {
    btnBackToPlans.addEventListener('click', () => switchCheckoutView('plans'));
  }

  // Copiar ID con feedback visual (estrictamente solo números)
  if (btnCopyAddress && depositAddressInput) {
    btnCopyAddress.addEventListener('click', async () => {
      try {
        const idOnly = (depositAddressInput.value || '401032901').replace(/\D/g, '') || '401032901';
        await navigator.clipboard.writeText(idOnly);
        if (copyHint) {
          copyHint.textContent = `¡ID copiado al portapapeles! ✓ (${idOnly})`;
          copyHint.classList.add('visible');
          setTimeout(() => copyHint.classList.remove('visible'), 2500);
        }
      } catch (_) {
        depositAddressInput.select();
        document.execCommand('copy');
      }
    });
  }

  // Confirmar Envío -> Guardar en Supabase y Pasar a Paso 3
  if (btnConfirmSent) {
    btnConfirmSent.addEventListener('click', async () => {
      const txRef = depositTxInput ? depositTxInput.value.trim() : '';

      // Validación de TxID por método de pago
      const TX_MIN_LENGTHS = { 'binance': 6, 'usdt-trc20': 10, 'usdt-bep20': 10 };
      const minLen = TX_MIN_LENGTHS[selectedMethod] || 4;

      if (!txRef || txRef.length < minLen) {
        if (depositTxError) {
          depositTxError.textContent = `⚠ Ingresa un ID de transacción válido (mínimo ${minLen} caracteres).`;
          depositTxError.style.display = 'block';
        }
        if (depositTxInput) {
          depositTxInput.focus();
          depositTxInput.style.borderColor = '#ef4444';
        }
        return;
      }

      if (depositTxError) depositTxError.style.display = 'none';
      if (depositTxInput) depositTxInput.style.borderColor = '';

      // Estado de carga en el botón
      btnConfirmSent.disabled = true;
      if (btnConfirmText) btnConfirmText.textContent = 'Registrando orden en sistema...';

      // Generar Order ID criptográficamente seguro
      const bytes = new Uint8Array(5);
      crypto.getRandomValues(bytes);
      const randomSuffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const orderId = `AEON-PAY-${randomSuffix}`;

      const planDaysMap = { weekly: 7, monthly: 30, quarterly: 90 };
      const days = planDaysMap[selectedPlan] || 30;

      // Guardar en Supabase (tabla payments)
      let insertOk = false;
      try {
        if (!currentUserId) {
          throw new Error('Sesión no disponible. Recarga la página e intenta de nuevo.');
        }

        const { error: insertErr } = await supabase.from('payments').insert({
          order_id: orderId,
          user_id: currentUserId,
          user_email: currentUserEmail || '',
          plan: selectedPlan,
          plan_days: days,
          amount: selectedPrice,
          currency: 'USDT',
          payment_method: METHOD_DB_MAP[selectedMethod] || 'binance_pay',
          tx_reference: txRef,
          status: 'pending'
        });

        if (insertErr) {
          throw new Error(insertErr.message || 'Error registrando el pago.');
        }

        insertOk = true;
      } catch (err) {
        console.error('[AEON] Error en insert payments:', err);
        if (depositTxError) {
          depositTxError.textContent = `⚠ No se pudo registrar tu pago: ${err.message}. Contacta soporte con tu TxID.`;
          depositTxError.style.display = 'block';
        }
      } finally {
        btnConfirmSent.disabled = false;
        if (btnConfirmText) btnConfirmText.textContent = 'Validar y Registrar Pago ✓';
      }

      // SOLO avanzar a Paso 3 si el INSERT fue exitoso
      if (!insertOk) return;

      // Rellenar datos en Paso 3
      const terminalCode = computeTerminalId(currentUserId || '');
      if (pendingOrderId) pendingOrderId.textContent = orderId;
      if (pendingPlanName) pendingPlanName.textContent = PLAN_LABELS[selectedPlan] || 'Membresía AEON Pro';
      if (pendingAmount) pendingAmount.textContent = `$${selectedPrice.toFixed(2)} USDT`;
      if (pendingTxRef) pendingTxRef.textContent = txRef;
      if (pendingTerminalId) pendingTerminalId.textContent = `AEON-${terminalCode}`;

      // Resetear estado visual de Paso 3 por si fue reutilizado
      const spinnerIcon = document.getElementById('pending-spinner-icon');
      const title = document.getElementById('pending-title');
      const subtitle = document.getElementById('pending-subtitle');
      const badge = document.getElementById('pending-badge');
      const autoNote = document.getElementById('pending-auto-note');
      if (spinnerIcon) {
        spinnerIcon.textContent = '⚡';
        spinnerIcon.classList.remove('approved');
      }
      if (title) {
        title.textContent = '¡Orden Registrada con Éxito!';
        title.style.color = '';
      }
      if (subtitle) {
        subtitle.textContent = 'Hemos alertado automáticamente al equipo de soporte para su verificación prioritaria.';
      }
      if (badge) {
        badge.textContent = '🟡 EN REVISIÓN PRIORITARIA';
        badge.classList.remove('approved');
      }
      if (autoNote) {
        autoNote.innerHTML = `
          <p><strong>✓ No necesitas enviar ningún comprobante.</strong> Nuestro bot notificó a soporte con tus datos para activar tu acceso.</p>
          <p class="pending-time-estimate">Tiempo estimado de activación: <strong>5 a 15 minutos</strong>.</p>
        `;
      }
      if (btnFinishCheckout) {
        btnFinishCheckout.textContent = 'Volver al Dashboard';
        btnFinishCheckout.onclick = closeCheckoutModal;
      }

      switchCheckoutView('pending');

      // Activar sondeo activo para detectar aprobación de admin
      if (typeof window.startProSoftPolling === 'function') {
        window.startProSoftPolling();
      }
    });
  }

  // Cerrar Modal
  if (btnCloseCheckout) btnCloseCheckout.addEventListener('click', closeCheckoutModal);
  if (btnFinishCheckout) btnFinishCheckout.addEventListener('click', closeCheckoutModal);

  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) closeCheckoutModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal.classList.contains('open')) {
      closeCheckoutModal();
    }
  });

  // Conectar inmediatamente el botón de Upgrade en la tarjeta
  if (dashPlanCta) {
    dashPlanCta.addEventListener('click', (e) => {
      if (dashPlanCta.dataset.isPro === 'true') {
        window.location.href = '/mercados.html';
        return;
      }
      e.preventDefault();
      openCheckoutModal();
    });
  }
}

async function initDashboard() {
  initNavbar();

  const { data: authData } = await supabase.auth.getSession();
  const session = authData?.session;

  if (!session) {
    window.location.href = '/login.html';
    return;
  }

  // Validar si el usuario aún existe en el servidor Supabase
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
    return;
  }

  const user = userData.user;
  currentUserId = user.id;
  currentUserEmail = user.email || '';
  const meta = user.user_metadata || {};

  // ============================================================
  // Referencias al DOM
  // ============================================================
  // Header HUD
  const avatarInitialsEl = document.getElementById('dash-avatar-initials');
  const userDisplayNameEl = document.getElementById('dash-user-display-name');
  const userEmailMetaEl = document.getElementById('dash-user-email-meta');
  const terminalIdEl = document.getElementById('dash-terminal-id');
  const profileBadgeTop = document.getElementById('dash-profile-badge-top');

  // WAI-ARIA Tabs
  const tabButtons = [
    document.getElementById('tab-membership'),
    document.getElementById('tab-profile'),
    document.getElementById('tab-security'),
  ];
  const tabPanels = [
    document.getElementById('panel-membership'),
    document.getElementById('panel-profile'),
    document.getElementById('panel-security'),
  ];

  // Panel 1: Membresía & Cuotas
  const titaniumCard = document.getElementById('dash-titanium-card');
  const cardTierDisplay = document.getElementById('card-tier-display');
  const cardStatusPill = document.getElementById('card-status-pill');
  const cardHolderName = document.getElementById('card-holder-name');
  const cardRenewalLabel = document.getElementById('card-renewal-label');
  const cardRenewalDate = document.getElementById('card-renewal-date');
  const dashPlanCta = document.getElementById('dash-plan-cta');
  const cardPolicyNote = document.getElementById('dash-card-policy-note');

  const btnRefreshQuota = document.getElementById('dash-btn-refresh-quota');
  const quotaCounter = document.getElementById('dash-quota-counter');
  const quotaProgress = document.getElementById('dash-quota-progress');
  const quotaPct = document.getElementById('dash-quota-pct');

  // Panel 2: Perfil & Preferencias
  const formProfile = document.getElementById('form-profile');
  const inputName = document.getElementById('dash-input-name');
  const inputEmail = document.getElementById('dash-input-email');
  const inputBackupEmail = document.getElementById('dash-input-backup-email');
  const selectTimezone = document.getElementById('dash-select-timezone');
  const selectSession = document.getElementById('dash-select-session');
  const selectAsset = document.getElementById('dash-select-asset');
  const profileAlert = document.getElementById('dash-profile-alert');
  const btnSaveProfile = document.getElementById('btn-save-profile');

  // Panel 3: Seguridad & Contraseña
  const formPassword = document.getElementById('form-password');
  const inputCurrentPass = document.getElementById('dash-input-current-pass');
  const inputNewPass = document.getElementById('dash-input-new-pass');
  const inputConfirmPass = document.getElementById('dash-input-confirm-pass');
  const passwordAlert = document.getElementById('dash-password-alert');
  const btnUpdatePassword = document.getElementById('btn-update-password');
  const btnLogout = document.getElementById('btn-logout');

  // Quick Dock Copilot Button
  const btnQuickCopilot = document.getElementById('dash-quick-copilot');

  // ============================================================
  // Estado en Memoria
  // ============================================================
  let currentName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Trader');
  let currentBackupEmail = meta.backup_email || '';
  let currentTimezone = meta.timezone || 'America/Caracas';
  let currentSession = meta.trading_session || 'NEW_YORK';
  let currentAsset = meta.favorite_asset || 'XAUUSD';

  function renderUserInfo() {
    const initials = computeInitials(currentName);
    if (avatarInitialsEl) avatarInitialsEl.textContent = initials;
    if (userDisplayNameEl) userDisplayNameEl.textContent = currentName;
    if (userEmailMetaEl) userEmailMetaEl.textContent = user.email || '—';
    if (terminalIdEl) terminalIdEl.textContent = `AEON-ID: ${computeTerminalId(user.id)}`;
    if (cardHolderName) cardHolderName.textContent = currentName;

    if (inputName) inputName.value = currentName;
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputBackupEmail) inputBackupEmail.value = currentBackupEmail;
    if (selectTimezone) selectTimezone.value = currentTimezone;
    if (selectSession) selectSession.value = currentSession;
    if (selectAsset) selectAsset.value = currentAsset;
  }

  renderUserInfo();

  // ============================================================
  // 1. WAI-ARIA Accessible Tab System
  // ============================================================
  function switchTab(targetIndex) {
    if (targetIndex < 0 || targetIndex >= tabButtons.length) return;

    tabButtons.forEach((btn, idx) => {
      if (!btn) return;
      const isActive = idx === targetIndex;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tabPanels.forEach((panel, idx) => {
      if (!panel) return;
      panel.classList.toggle('active', idx === targetIndex);
    });

    // Foco en el botón seleccionado
    if (tabButtons[targetIndex]) {
      tabButtons[targetIndex].focus();
    }

    // Sincronizar cuota de IA si entra a la pestaña de Membresía (sin polling continuo)
    if (targetIndex === 0) {
      syncAiQuota(false);
    }
  }

  tabButtons.forEach((btn, index) => {
    if (!btn) return;

    btn.addEventListener('click', () => {
      switchTab(index);
    });

    btn.addEventListener('keydown', (e) => {
      let nextIndex = index;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (index + 1) % tabButtons.length;
        switchTab(nextIndex);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        switchTab(nextIndex);
      } else if (e.key === 'Home') {
        e.preventDefault();
        switchTab(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        switchTab(tabButtons.length - 1);
      }
    });
  });

  // ============================================================
  // 2. Sincronización Eficiente de Cuota de IA (On-Demand)
  // ============================================================
  async function syncAiQuota(forceSpin = false) {
    if (btnRefreshQuota && forceSpin) {
      btnRefreshQuota.classList.add('spinning');
    }

    try {
      const quota = await fetchUserAiQuota();
      const remaining = typeof quota.remaining === 'number' ? quota.remaining : 50;
      const total = typeof quota.total === 'number' ? quota.total : 50;
      const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));

      if (quotaCounter) {
        quotaCounter.textContent = `${remaining} / ${total} hoy`;
      }
      if (quotaProgress) {
        quotaProgress.style.width = `${pct}%`;
        quotaProgress.classList.remove('warning', 'danger');
        if (remaining <= 5) {
          quotaProgress.classList.add('danger');
        } else if (remaining <= 15) {
          quotaProgress.classList.add('warning');
        }
      }
      if (quotaPct) {
        quotaPct.textContent = `${pct}% libre`;
      }
    } catch (err) {
      console.warn('[AEON Perfil] Error consultando cuota:', err);
    } finally {
      if (btnRefreshQuota && forceSpin) {
        setTimeout(() => {
          btnRefreshQuota.classList.remove('spinning');
        }, 500);
      }
    }
  }

  if (btnRefreshQuota) {
    btnRefreshQuota.addEventListener('click', () => {
      syncAiQuota(true);
    });
  }

  // Carga inicial de cuota
  syncAiQuota(false);

  // ============================================================
  // 3. Verificación de Membresía & Sincronización en Tiempo Real
  // ============================================================
  let realtimeChannel = null;

  async function checkAndRenderMembership(options = { notifyCelebration: false }) {
    try {
      const { data: profData, error: profErr } = await supabase
        .from(DB_TABLES.PROFILES)
        .select('tier')
        .eq('id', user.id)
        .maybeSingle();

      if (profErr) {
        console.warn('[AEON Perfil] Error consultando perfil:', profErr.message);
      }

      const isProTier = profData && (profData.tier === 'pro' || profData.tier === 'institutional');

      const { data: subData, error: subErr } = await supabase
        .from(DB_TABLES.SUBSCRIPTIONS)
        .select('plan, status, current_period_end')
        .eq('user_id', user.id)
        .eq('plan', 'pro')
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .maybeSingle();

      if (subErr) {
        console.warn('[AEON Perfil] Error consultando suscripción:', subErr.message);
      }

      const isPro = isProTier || !!subData;

      if (isPro) {
        if (profileBadgeTop) {
          profileBadgeTop.className = 'plan-badge-display pro';
          profileBadgeTop.textContent = 'PRO Trader';
        }
        if (titaniumCard) {
          titaniumCard.classList.add('pro');
        }
        if (cardTierDisplay) {
          cardTierDisplay.textContent = profData?.tier === 'institutional' ? 'PLAN INSTITUCIONAL' : 'PLAN PRO ÉLITE';
        }
        if (cardStatusPill) {
          cardStatusPill.textContent = 'Activo';
        }

        // Copy preciso y sin ambigüedades sobre la renovación
        if (subData?.current_period_end) {
          const endDate = new Date(subData.current_period_end);
          const formattedDate = endDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          if (subData.status === 'active') {
            if (cardRenewalLabel) cardRenewalLabel.textContent = 'PRÓXIMA RENOVACIÓN';
            if (cardRenewalDate) cardRenewalDate.textContent = formattedDate;
          } else {
            if (cardRenewalLabel) cardRenewalLabel.textContent = 'ACCESO ACTIVO HASTA';
            if (cardRenewalDate) cardRenewalDate.textContent = formattedDate;
          }
        } else {
          if (cardRenewalLabel) cardRenewalLabel.textContent = 'MEMBRESÍA ACTIVA';
          if (cardRenewalDate) cardRenewalDate.textContent = 'Permanente';
        }

        if (dashPlanCta) {
          dashPlanCta.dataset.isPro = 'true';
          dashPlanCta.textContent = 'Ir al Terminal de Mercados →';
        }
        if (cardPolicyNote) {
          cardPolicyNote.textContent = 'Membresía activa vinculada a tu cuenta. Acceso total al Terminal y Copiloto IA.';
        }

        if (options.notifyCelebration) {
          triggerProCelebration();
        }
      } else {
        if (profileBadgeTop) {
          profileBadgeTop.className = 'plan-badge-display free';
          profileBadgeTop.textContent = 'Plan Gratuito';
        }
        if (titaniumCard) {
          titaniumCard.classList.remove('pro');
        }
        if (cardTierDisplay) {
          cardTierDisplay.textContent = 'PLAN GRATUITO';
        }
        if (cardStatusPill) {
          cardStatusPill.textContent = 'Estándar';
        }
        if (cardRenewalLabel) {
          cardRenewalLabel.textContent = 'ESTADO DE CUENTA';
        }
        if (cardRenewalDate) {
          cardRenewalDate.textContent = 'Acceso Básico';
        }
        if (dashPlanCta) {
          dashPlanCta.dataset.isPro = 'false';
          dashPlanCta.textContent = 'Mejorar a PRO →';
        }
        if (cardPolicyNote) {
          cardPolicyNote.textContent = 'Facturación segura cifrada. Cancelación con un clic en cualquier momento.';
        }
      }

      return { isPro, profData, subData };
    } catch (err) {
      console.warn('[AEON] Error verificando membresía:', err.message);
      return { isPro: false, profData: null, subData: null };
    }
  }

  // Verificación inicial
  const initialMembership = await checkAndRenderMembership({ notifyCelebration: false });
  userIsPro = initialMembership.isPro;
  if (userIsPro) {
    proCelebrationShown = true;
  }

  // Suscripción Realtime a cambios en perfiles y pagos
  realtimeChannel = supabase
    .channel(`user-membership-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: DB_TABLES.PROFILES,
        filter: `id=eq.${user.id}`
      },
      async (payload) => {
        if (payload?.new && (payload.new.tier === 'pro' || payload.new.tier === 'institutional')) {
          userIsPro = true;
          await checkAndRenderMembership({ notifyCelebration: true });
          stopPolling();
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: DB_TABLES.PAYMENTS,
        filter: `user_id=eq.${user.id}`
      },
      async (payload) => {
        if (payload?.new && payload.new.status === 'approved') {
          userIsPro = true;
          await checkAndRenderMembership({ notifyCelebration: true });
          stopPolling();
        }
      }
    )
    .subscribe();

  // Soft-polling de respaldo
  function startPolling() {
    if (pollingTimer || userIsPro) return;
    pollingTimer = setInterval(async () => {
      if (userIsPro) {
        stopPolling();
        return;
      }
      const res = await checkAndRenderMembership({ notifyCelebration: true });
      if (res.isPro) {
        userIsPro = true;
        stopPolling();
      }
    }, 5000);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  window.startProSoftPolling = startPolling;

  if (!userIsPro) {
    startPolling();
  }

  // Verificar al reenfocar la ventana
  window.addEventListener('focus', async () => {
    if (!userIsPro) {
      const res = await checkAndRenderMembership({ notifyCelebration: true });
      if (res.isPro) {
        userIsPro = true;
        stopPolling();
      }
    }
  });

  // Limpieza al cerrar o cambiar de página
  window.addEventListener('beforeunload', () => {
    stopPolling();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
  });

  // ============================================================
  // 4. Guardar Perfil & Preferencias Operativas en user_metadata
  // ============================================================
  if (formProfile) {
    formProfile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = inputName ? inputName.value.trim() : '';
      const newBackupEmail = inputBackupEmail ? inputBackupEmail.value.trim() : '';
      const newTimezone = selectTimezone ? selectTimezone.value : 'America/Caracas';
      const newSession = selectSession ? selectSession.value : 'NEW_YORK';
      const newAsset = selectAsset ? selectAsset.value : 'XAUUSD';

      if (!newName) {
        showAlert(profileAlert, 'El nombre completo es requerido.', 'error');
        return;
      }

      if (btnSaveProfile) {
        btnSaveProfile.disabled = true;
        btnSaveProfile.textContent = 'Guardando...';
      }

      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: newName,
            backup_email: newBackupEmail,
            timezone: newTimezone,
            trading_session: newSession,
            favorite_asset: newAsset,
          },
        });

        if (error) throw error;

        // Actualizar estado en memoria
        currentName = newName;
        currentBackupEmail = newBackupEmail;
        currentTimezone = newTimezone;
        currentSession = newSession;
        currentAsset = newAsset;

        renderUserInfo();
        showAlert(profileAlert, '✓ Preferencias operativas guardadas con éxito.', 'success');
      } catch (err) {
        console.error('[AEON] Error actualizando perfil:', err);
        showAlert(profileAlert, `Error: ${err.message}`, 'error');
      } finally {
        if (btnSaveProfile) {
          btnSaveProfile.disabled = false;
          btnSaveProfile.textContent = 'Guardar Preferencias';
        }
      }
    });
  }

  // ============================================================
  // 5. Medidor de Fortaleza de Contraseña en Tiempo Real
  // ============================================================
  if (inputNewPass) {
    inputNewPass.addEventListener('input', () => {
      const strength = evaluatePasswordStrength(inputNewPass.value);
      renderPasswordStrength(strength);
    });
  }

  // ============================================================
  // 6. Actualización de Contraseña con Revalidación de Credenciales
  // ============================================================
  if (formPassword) {
    formPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPass = inputCurrentPass ? inputCurrentPass.value : '';
      const newPass = inputNewPass ? inputNewPass.value : '';
      const confirmPass = inputConfirmPass ? inputConfirmPass.value : '';

      if (!currentPass) {
        showAlert(passwordAlert, 'Debes ingresar tu contraseña actual para revalidar tu identidad.', 'error');
        return;
      }

      // Validación estricta institucional
      const hasLength = newPass.length >= 8;
      const hasUpper = /[A-Z]/.test(newPass);
      const hasNumber = /[0-9]/.test(newPass);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass);

      if (!hasLength || !hasUpper || !hasNumber || !hasSymbol) {
        showAlert(
          passwordAlert,
          'La nueva contraseña debe tener mínimo 8 caracteres e incluir al menos una mayúscula, un número y un símbolo.',
          'error'
        );
        return;
      }

      if (newPass !== confirmPass) {
        showAlert(passwordAlert, 'Las contraseñas no coinciden.', 'error');
        return;
      }

      if (btnUpdatePassword) {
        btnUpdatePassword.disabled = true;
        btnUpdatePassword.textContent = 'Revalidando credenciales...';
      }

      try {
        // Paso 1: Revalidar contraseña actual con el proveedor Supabase
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPass,
        });

        if (verifyErr) {
          showAlert(passwordAlert, 'La contraseña actual no es correcta. Acceso denegado.', 'error');
          return;
        }

        // Paso 2: Actualizar a la nueva contraseña institucional
        if (btnUpdatePassword) {
          btnUpdatePassword.textContent = 'Actualizando contraseña...';
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPass,
        });

        if (updateErr) throw updateErr;

        if (inputCurrentPass) inputCurrentPass.value = '';
        if (inputNewPass) inputNewPass.value = '';
        if (inputConfirmPass) inputConfirmPass.value = '';
        renderPasswordStrength({ score: 0, label: 'Introduce tu contraseña', className: '' });

        showAlert(passwordAlert, '✓ Contraseña institucional actualizada correctamente.', 'success');
      } catch (err) {
        console.error('[AEON] Error actualizando contraseña:', err);
        showAlert(passwordAlert, `Error: ${err.message}`, 'error');
      } finally {
        if (btnUpdatePassword) {
          btnUpdatePassword.disabled = false;
          btnUpdatePassword.textContent = 'Actualizar Contraseña';
        }
      }
    });
  }

  // ============================================================
  // 7. Quick Dock: Disparador Directo del Copiloto IA
  // ============================================================
  if (btnQuickCopilot) {
    btnQuickCopilot.addEventListener('click', () => {
      const defaultPrompt = 'Hola Copiloto, ¿cuáles son los niveles institucionales clave de hoy?';
      if (typeof window.openAeonChatWithPrompt === 'function') {
        window.openAeonChatWithPrompt(defaultPrompt);
      } else {
        const fab = document.getElementById('aeon-chat-fab');
        if (fab) fab.click();
      }
    });
  }

  // ============================================================
  // 8. Cierre de Sesión Seguro
  // ============================================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  };

  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupCheckoutModal();
    initDashboard();
  });
} else {
  setupCheckoutModal();
  initDashboard();
}

