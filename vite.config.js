import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      ignored: ['**/data/**', '**/scripts/**', '**/.git/**']
    }
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mercados: resolve(__dirname, 'mercados.html'),
        analisis: resolve(__dirname, 'analisis.html'),
        calendario: resolve(__dirname, 'calendario.html'),
        login: resolve(__dirname, 'login.html'),
        registro: resolve(__dirname, 'registro.html'),
        perfil: resolve(__dirname, 'perfil.html'),
        recuperar: resolve(__dirname, 'recuperar.html'),
        actualizarPassword: resolve(__dirname, 'actualizar-password.html'),
        avisoLegal: resolve(__dirname, 'aviso-legal.html'),
        privacidad: resolve(__dirname, 'privacidad.html'),
        cookies: resolve(__dirname, 'cookies.html'),
      },
    },
  },
});
