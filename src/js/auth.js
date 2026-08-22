/* ============================================================
   AEON · auth.js — Authentication & Session Manager
   ============================================================ */

import { supabase } from './supabaseClient.js';
import { DB_TABLES } from './config/constants.js';

export async function checkSession() {
  let session = null;
  let isPro = false;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session || null;

    if (session) {
      // Determinar estado PRO: plan='pro', status='active', y no expirado
      const { data: subData, error: subErr } = await supabase
        .from(DB_TABLES.SUBSCRIPTIONS)
        .select('plan, status, current_period_end')
        .eq('user_id', session.user.id)
        .eq('plan', 'pro')
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .maybeSingle();

      if (!subErr && subData) {
        isPro = true;
      }
    }
  } catch (err) {
    console.error('[AEON] Error verificando sesión:', err.message);
  }
  
  const guestView = document.getElementById('nav-guest-view');
  const userView = document.getElementById('nav-user-view');
  const btnLogout = document.getElementById('btn-logout');
  const btnLogoutMobile = document.getElementById('btn-logout-mobile');

  if (session) {
    if (guestView) guestView.style.display = 'none';
    if (userView) userView.style.display = 'flex';
    
    const guestMobile = document.getElementById('mobile-nav-guest');
    const userMobile = document.getElementById('mobile-nav-user');
    if (guestMobile) guestMobile.style.display = 'none';
    if (userMobile) userMobile.style.display = 'block';

    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error al cerrar sesión', e);
      }
      window.location.reload();
    };

    if (btnLogout) btnLogout.onclick = handleLogout;
    if (btnLogoutMobile) btnLogoutMobile.onclick = handleLogout;
  } else {
    if (guestView) guestView.style.display = 'flex';
    if (userView) userView.style.display = 'none';
  }

  return { session, isPro };
}

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorDiv = document.getElementById('auth-error');

function showError(msg) {
  if (errorDiv) {
    errorDiv.textContent = msg;
    errorDiv.hidden = false;
  }
}

function hideError() {
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.hidden = true;
  }
}

// Lógica de Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');

    if (!email || !password) {
      showError('Por favor, completa todos los campos.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Iniciando sesión...';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showError(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
      btn.disabled = false;
      btn.textContent = 'Entrar al Sistema';
    } else {
      window.location.href = '/index.html';
    }
  });
}

// Lógica de Registro
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    const btn = document.getElementById('btn-register');

    if (!email || !password || !passwordConfirm) {
      showError('Por favor, completa todos los campos.');
      return;
    }

    if (password.length < 8) {
      showError('La contraseña debe contener al menos 8 caracteres.');
      return;
    }

    if (password !== passwordConfirm) {
      showError('Las contraseñas no coinciden.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Registrarse';
    } else {
      window.location.href = '/index.html'; 
    }
  });
}
