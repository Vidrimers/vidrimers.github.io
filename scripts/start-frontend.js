#!/usr/bin/env node

// Скрипт для запуска frontend с задержкой
// Ждем 3 секунды, чтобы backend успел запуститься

console.log('⏳ Ждем запуска backend сервера...');

setTimeout(() => {
  console.log('🚀 Запускаем frontend сервер...');
  
  const { spawn } = require('child_process');
  const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
  });
  
  vite.on('close', (code) => {
    process.exit(code);
  });
  
}, 3000);