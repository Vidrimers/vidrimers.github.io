import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';

export default defineConfig({
  // Корневая папка для разработки
  root: 'src',
  
  // Папка со статическими файлами
  publicDir: '../public',
  
  // Плагины
  plugins: [
    react(), // React plugin для JSX поддержки
    handlebars({
      partialDirectory: [
        resolve(__dirname, 'src/templates/parts')
      ],
      helpers: {
        // Кастомные helpers можно добавить позже
      },
      context: (pagePath) => {
        // Загрузка данных из JSON файлов
        try {
          const siteData = require('./src/templates/data/data.json');
          return {
            title: 'Yaroslav Shiryakov',
            ...siteData,
            page: {
              path: pagePath
            }
          };
        } catch (error) {
          console.warn('Could not load data.json, using empty context');
          return {
            title: 'Yaroslav Shiryakov',
            page: {
              path: pagePath
            }
          };
        }
      }
    })
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
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        en: resolve(__dirname, 'src/index-en.html')
      }
    },
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