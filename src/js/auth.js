import { supabase } from './supabaseClient.js';
import { DB_TABLES } from './config/constants.js';

// Si el usuario llega con un token de recuperación de contraseña
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    if (!window.location.pathname.includes('actualizar-password.html')) {
      window.location.href = '/actualizar-password.html';
    }
  }
});

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
      window.location.href = '/index.html';
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
const recoverForm = document.getElementById('recover-form');
const updatePasswordForm = document.getElementById('update-password-form');
const errorDiv = document.getElementById('auth-error');
const successDiv = document.getElementById('auth-success');

function showError(msg) {
  if (errorDiv) {
    errorDiv.textContent = msg;
    errorDiv.hidden = false;
  }
  if (successDiv) {
    successDiv.hidden = true;
  }
}

function showSuccess(msg) {
  if (successDiv) {
    successDiv.textContent = msg;
    successDiv.hidden = false;
  }
  if (errorDiv) {
    errorDiv.hidden = true;
  }
}

function hideFeedback() {
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.hidden = true;
  }
  if (successDiv) {
    successDiv.textContent = '';
    successDiv.hidden = true;
  }
}

// Lógica de Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();
    
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
    hideFeedback();
    
    const fullName = document.getElementById('full-name')?.value.trim() || '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    const btn = document.getElementById('btn-register');

    if (!fullName || !email || !password || !passwordConfirm) {
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
        data: {
          full_name: fullName,
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Registrarse';
    } else {
      window.location.href = '/dashboard.html'; 
    }
  });
}

// Lógica de Recuperación de Contraseña (Envío de Enlace)
if (recoverForm) {
  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('btn-recover');

    if (!email) {
      showError('Ingresa tu correo electrónico.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando enlace...';

    const redirectUrl = `${window.location.origin}/actualizar-password.html`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Enviar Enlace';
    } else {
      showSuccess('¡Enlace enviado! Revisa tu bandeja de entrada o carpeta de spam para restablecer tu contraseña.');
      btn.disabled = false;
      btn.textContent = 'Reenviar Enlace';
    }
  });
}

// Lógica de Actualización de Nueva Contraseña
if (updatePasswordForm) {
  updatePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const btn = document.getElementById('btn-update-password');

    if (!newPassword || !confirmPassword) {
      showError('Por favor, ingresa tu nueva contraseña.');
      return;
    }

    if (newPassword.length < 8) {
      showError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando nueva contraseña...';

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Actualizar Contraseña';
    } else {
      showSuccess('¡Contraseña actualizada exitosamente! Redirigiendo al inicio...');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 2000);
    }
  });
}
