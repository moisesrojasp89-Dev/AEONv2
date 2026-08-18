import { supabase } from './supabaseClient.js';

export async function checkSession() {
  let session = null;
  let isPro = false;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session || null;

    if (session) {
      // Determinar estado PRO: plan='pro', status='active', y no expirado
      const { data: subData, error: subErr } = await supabase
        .from('subscriptions')
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

  if (session) {
    if (guestView) guestView.style.display = 'none';
    if (userView) userView.style.display = 'flex';
    
    if (btnLogout) {
      btnLogout.onclick = async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('Error al cerrar sesión', e);
        }
        window.location.reload();
      };
    }
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
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.textContent = 'Iniciando sesión...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showError(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
      btn.disabled = false;
      btn.textContent = 'Entrar al Sistema';
    } else {
      window.location.href = '/'; // Redirigir al dashboard/home
    }
  });
}

// Lógica de Registro
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    const btn = document.getElementById('btn-register');

    if (password !== passwordConfirm) {
      showError('Las contraseñas no coinciden.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      // Usamos options para que Supabase no envíe un email de confirmación
      // asumiendo que para desarrollo desactivaste el "Confirm Email" en Supabase.
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showError(error.message);
      btn.disabled = false;
      btn.textContent = 'Registrarse';
    } else {
      // Supabase por defecto (si no requiere verificación de correo) ya inicia la sesión
      window.location.href = '/'; 
    }
  });
}
