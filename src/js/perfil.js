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
  // 3. Verificación de Membresía & Copy Institucional Preciso
  // ============================================================
  try {
    const { data: profData } = await supabase
      .from(DB_TABLES.PROFILES)
      .select('tier')
      .eq('id', user.id)
      .maybeSingle();

    const isProTier = profData && (profData.tier === 'pro' || profData.tier === 'institutional');

    const { data: subData } = await supabase
      .from(DB_TABLES.SUBSCRIPTIONS)
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .eq('plan', 'pro')
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .maybeSingle();

    if (isProTier || subData) {
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
        dashPlanCta.textContent = 'Acceder a Señales PRO →';
        dashPlanCta.href = '/index.html#senales';
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
        dashPlanCta.textContent = 'Mejorar a PRO →';
        dashPlanCta.href = '/index.html#pro';
      }
    }
  } catch (err) {
    console.warn('[AEON] Error verificando membresía:', err.message);
  }

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
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
