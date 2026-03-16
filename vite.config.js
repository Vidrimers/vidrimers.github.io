import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // Плагины
  plugins: [
    react() // React plugin для JSX поддержки
  ],
  
  // CSS конфигурация
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        // Sass конфигурация - импорты уже есть в style.scss
      }
    }
    // PostCSS конфигурация теперь в postcss.config.js
  },
  
  // Production build конфигурация
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    cssMinify: true,
    // Настройки для assets
    assetsDir: 'assets',
    copyPublicDir: true
  },
  
  // Dev server конфигурация
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  // Preview server конфигурация (для npm run preview)
  preview: {
    port: 4173,
    open: true
  },
  
  // Настройки для GitHub Pages
  base: '/'
});