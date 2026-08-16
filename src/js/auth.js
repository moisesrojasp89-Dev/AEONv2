import { supabase } from './supabaseClient.js';

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
