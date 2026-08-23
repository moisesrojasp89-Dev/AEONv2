/* ============================================================
   AEON · perfil.js — Institutional User Profile & Terminal Controller
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { DB_TABLES } from './config/constants.js';
import { initNavbar } from './navbar.js';

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
  }, 4000);
}

async function initDashboard() {
  initNavbar();

  const { data: authData } = await supabase.auth.getSession();
  const session = authData?.session;

  if (!session) {
    window.location.href = '/login.html';
    return;
  }

  const user = session.user;
  const meta = user.user_metadata || {};

  // Elementos DOM
  const avatarInitialsEl = document.getElementById('dash-avatar-initials');
  const userDisplayNameEl = document.getElementById('dash-user-display-name');
  const userEmailMetaEl = document.getElementById('dash-user-email-meta');
  const terminalIdEl = document.getElementById('dash-terminal-id');
  const profileBadgeTop = document.getElementById('dash-profile-badge-top');

  const inputName = document.getElementById('dash-input-name');
  const inputEmail = document.getElementById('dash-input-email');
  const inputBackupEmail = document.getElementById('dash-input-backup-email');
  const selectTimezone = document.getElementById('dash-select-timezone');
  const selectLanguage = document.getElementById('dash-select-language');
  const profileAlert = document.getElementById('dash-profile-alert');
  const formProfile = document.getElementById('form-profile');

  const inputNewPass = document.getElementById('dash-input-new-pass');
  const inputConfirmPass = document.getElementById('dash-input-confirm-pass');
  const passwordAlert = document.getElementById('dash-password-alert');
  const formPassword = document.getElementById('form-password');

  const planBadge = document.getElementById('dash-plan-badge');
  const statusVal = document.getElementById('dash-info-status');
  const periodVal = document.getElementById('dash-info-period');
  const ctaBtn = document.getElementById('dash-plan-cta');
  const logoutBtn = document.getElementById('dash-logout-btn');

  // Inicializar Datos del Usuario
  let currentName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Trader');
  let currentBackupEmail = meta.backup_email || '';
  let currentTimezone = meta.timezone || 'America/Caracas';
  let currentLanguage = meta.language || 'es';

  function renderUserInfo() {
    const initials = computeInitials(currentName);
    if (avatarInitialsEl) avatarInitialsEl.textContent = initials;
    if (userDisplayNameEl) userDisplayNameEl.textContent = currentName;
    if (userEmailMetaEl) userEmailMetaEl.textContent = user.email || '—';
    if (terminalIdEl) terminalIdEl.textContent = `AEON-ID: ${computeTerminalId(user.id)}`;

    if (inputName) inputName.value = currentName;
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputBackupEmail) inputBackupEmail.value = currentBackupEmail;
    if (selectTimezone) selectTimezone.value = currentTimezone;
    if (selectLanguage) selectLanguage.value = currentLanguage;
  }

  renderUserInfo();

  // 1. Guardar Datos de Perfil
  if (formProfile) {
    formProfile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = inputName.value.trim();
      const newBackupEmail = inputBackupEmail.value.trim();
      const newTimezone = selectTimezone.value;
      const newLanguage = selectLanguage ? selectLanguage.value : 'es';
      const saveBtn = document.getElementById('btn-save-profile');

      if (!newName) {
        showAlert(profileAlert, 'El nombre completo es requerido.', 'error');
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
      }

      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: newName,
            backup_email: newBackupEmail,
            timezone: newTimezone,
            language: newLanguage,
          },
        });

        if (error) throw error;

        // Sincronizar en memoria
        currentName = newName;
        currentBackupEmail = newBackupEmail;
        currentTimezone = newTimezone;
        currentLanguage = newLanguage;
        renderUserInfo();

        showAlert(profileAlert, '✓ Perfil actualizado con éxito.', 'success');
      } catch (err) {
        console.error('[AEON] Error actualizando perfil:', err);
        showAlert(profileAlert, `Error: ${err.message}`, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Guardar Cambios';
        }
      }
    });
  }

  // 2. Actualizar Contraseña
  if (formPassword) {
    formPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = inputNewPass.value;
      const confirmPass = inputConfirmPass.value;
      const updateBtn = document.getElementById('btn-update-password');

      if (newPass.length < 8) {
        showAlert(passwordAlert, 'La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
      }

      if (newPass !== confirmPass) {
        showAlert(passwordAlert, 'Las contraseñas no coinciden.', 'error');
        return;
      }

      if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Actualizando...';
      }

      try {
        const { error } = await supabase.auth.updateUser({
          password: newPass,
        });

        if (error) throw error;

        inputNewPass.value = '';
        inputConfirmPass.value = '';
        showAlert(passwordAlert, '✓ Contraseña actualizada correctamente.', 'success');
      } catch (err) {
        console.error('[AEON] Error actualizando contraseña:', err);
        showAlert(passwordAlert, `Error: ${err.message}`, 'error');
      } finally {
        if (updateBtn) {
          updateBtn.disabled = false;
          updateBtn.textContent = 'Actualizar Contraseña';
        }
      }
    });
  }

  // 3. Consultar Suscripción
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
      const proText = '★ Rango PRO Activo';
      if (planBadge) {
        planBadge.className = 'plan-badge-display pro';
        planBadge.textContent = proText;
      }
      if (profileBadgeTop) {
        profileBadgeTop.className = 'plan-badge-display pro';
        profileBadgeTop.textContent = 'PRO Trader';
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
      const freeText = 'Plan Gratuito';
      if (planBadge) {
        planBadge.className = 'plan-badge-display free';
        planBadge.textContent = freeText;
      }
      if (profileBadgeTop) {
        profileBadgeTop.className = 'plan-badge-display free';
        profileBadgeTop.textContent = freeText;
      }
      if (statusVal) statusVal.textContent = 'Limitado';
      if (periodVal) periodVal.textContent = 'Ilimitado';
      if (ctaBtn) {
        ctaBtn.textContent = 'Mejorar a PRO →';
        ctaBtn.href = '/index.html#pro';
      }
    }
  } catch (err) {
    console.warn('[AEON] Error verificando suscripción:', err.message);
  }

  // 4. Cerrar Sesión
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
