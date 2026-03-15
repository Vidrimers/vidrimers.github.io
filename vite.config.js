import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';

export default defineConfig({
  // Корневая папка для разработки
  root: 'src',
  
  // Папка со статическими файлами
  publicDir: '../public',
  
  // Плагины
  plugins: [
    handlebars({
      partialDirectory: resolve(__dirname, 'src/templates/parts'),
      helpers: {
        // Кастомные helpers можно добавить позже
      },
      context: (pagePath) => {
        // Загрузка данных из JSON файлов
        try {
          const siteData = require('./src/templates/data/data.json');
          return {
            ...siteData,
            page: {
              path: pagePath
            }
          };
        } catch (error) {
          console.warn('Could not load data.json, using empty context');
          return {
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
    preprocessorOptions: {
      scss: {
        // Добавляем глобальные импорты если нужно
        additionalData: `@import "./assets/sass/work/_colors.scss"; @import "./assets/sass/work/_mixins.scss";`
      }
    },
    postcss: {
      plugins: [
        autoprefixer({
          overrideBrowserslist: ['last 5 versions']
        })
      ]
    }
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