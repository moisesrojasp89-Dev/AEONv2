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
        registro: resolve(__dirname, 'registro.html')
      }
    }
  },
});
