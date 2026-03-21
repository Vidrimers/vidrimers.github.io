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
    copyPublicDir: true,
    // Оптимизация для лучшего Lighthouse score
    rollupOptions: {
      output: {
        // Разделение кода на chunks для лучшей загрузки
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            return 'vendor';
          }
        }
      }
    },
    // Настройки Terser для лучшей минификации
    terserOptions: {
      compress: {
        drop_console: true, // Удаляем console.log в production
        drop_debugger: true
      }
    }
  },
  
  // Dev server конфигурация
  server: {
    port: 3000,
    open: false, // Отключаем автоматическое открытие браузера для devtun
    host: true,
    allowedHosts: [
      'vidrimers.ru.tuna.am'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:1989',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message);
          });
        }
      },
      // Проксируем загруженные файлы на сервер
      '/uploads': {
        target: 'http://localhost:1989',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Preview server конфигурация (для npm run preview)
  preview: {
    port: 4173,
    open: true
  },
  
  // Настройки для GitHub Pages
  base: '/',

  // Конфигурация тестов
  test: {
    // Серверные тесты используют общую SQLite БД — запускаем файлы последовательно
    fileParallelism: false,
    // Один поток для всех тестов — предотвращает race condition в SQLite
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    sequence: {
      concurrent: false
    },
    environment: 'jsdom',
    globals: false,
    setupFiles: [],
    environmentMatchGlobs: [
      // Серверные тесты запускаем в node окружении
      ['server/tests/**', 'node'],
      // Frontend тесты в jsdom
      ['src/**/*.test.*', 'jsdom']
    ]
  }
});