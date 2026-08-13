import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2020',
  },
});
