import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        calendario: resolve(__dirname, 'calendario.html'),
        login: resolve(__dirname, 'login.html'),
        registro: resolve(__dirname, 'registro.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        recuperar: resolve(__dirname, 'recuperar.html'),
        actualizarPassword: resolve(__dirname, 'actualizar-password.html'),
        avisoLegal: resolve(__dirname, 'aviso-legal.html'),
        privacidad: resolve(__dirname, 'privacidad.html'),
        cookies: resolve(__dirname, 'cookies.html'),
      },
    },
  },
});
