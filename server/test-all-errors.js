#!/usr/bin/env node

/**
 * Полный набор тестов обработки ошибок API системы лайков
 * Запускает все категории тестов и выдает итоговый отчет
 */

const { spawn } = require('child_process');
const path = require('path');

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Функция для запуска теста
function runTest(testFile) {
  return new Promise((resolve) => {
    const testProcess = spawn('node', [testFile], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      resolve({
        code,
        output: output + errorOutput,
        success: code === 0
      });
    });
  });
}

// Основная функция
async function main() {
  log('magenta', '🚀 ПОЛНОЕ ТЕСТИРОВАНИЕ ОБРАБОТКИ ОШИБОК API');
  log('magenta', '='.repeat(60));
  
  const tests = [
    {
      name: 'Базовые ошибки API',
      file: 'server/test-error-handling.js',
      description: 'Тестирование основных сценариев ошибок'
    },
    {
      name: 'Граничные случаи',
      file: 'server/test-edge-cases.js', 
      description: 'Тестирование граничных случаев и нестандартных входных данных'
    },
    {
      name: 'Ошибки базы данных',
      file: 'server/test-database-errors.js',
      description: 'Тестирование обработки ошибок базы данных и производительности'
    }
  ];
  
  let totalPassed = 0;
  let totalTests = tests.length;
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    
    log('cyan', `\n📋 [${i + 1}/${tests.length}] ${test.name}`);
    log('blue', `📝 ${test.description}`);
    log('yellow', `🔄 Запуск: ${test.file}`);
    
    const startTime = Date.now();
    const result = await runTest(test.file);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      log('green', `✅ ПРОЙДЕН за ${duration}ms`);
      totalPassed++;
    } else {
      log('red', `❌ НЕ ПРОЙДЕН за ${duration}ms`);
      log('red', '📄 Вывод теста:');
      console.log(result.output);
    }
    
    results.push({
      ...test,
      success: result.success,
      duration,
      output: result.output
    });
  }
  
  // Итоговый отчет
  log('magenta', '\n' + '='.repeat(60));
  log('magenta', '📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  log('magenta', '='.repeat(60));
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН';
    const color = result.success ? 'green' : 'red';
    log(color, `${index + 1}. ${result.name}: ${status} (${result.duration}ms)`);
  });
  
  log('blue', `\n📈 Статистика:`);
  log('green', `✅ Пройдено: ${totalPassed}/${totalTests} категорий`);
  
  if (totalPassed < totalTests) {
    log('red', `❌ Не пройдено: ${totalTests - totalPassed} категорий`);
  }
  
  const successRate = Math.round((totalPassed / totalTests) * 100);
  log('blue', `📊 Процент успеха: ${successRate}%`);
  
  if (totalPassed === totalTests) {
    log('green', '\n🎉 ВСЕ ТЕСТЫ ОБРАБОТКИ ОШИБОК ПРОЙДЕНЫ УСПЕШНО!');
    log('green', '✨ Система обработки ошибок работает корректно');
    log('green', '🔒 API готов к production использованию');
    process.exit(0);
  } else {
    log('red', '\n💥 НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
    log('red', '⚠️  Необходимо исправить ошибки перед деплоем');
    process.exit(1);
  }
}

// Запускаем тесты
if (require.main === module) {
  main().catch(error => {
    log('red', `💥 Критическая ошибка: ${error.message}`);
    process.exit(1);
  });
}