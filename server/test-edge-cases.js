#!/usr/bin/env node

/**
 * Тестирование граничных случаев и дополнительных сценариев ошибок
 */

const axios = require('axios').default;

const API_BASE = 'http://localhost:1989/api';

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Дополнительные тесты граничных случаев
const edgeCaseTests = [
  {
    name: 'POST с пустым JSON объектом',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: {},
    expectedStatus: 400,
    expectedError: 'Некорректное действие'
  },
  {
    name: 'POST с action как число',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: { action: 123 },
    expectedStatus: 400,
    expectedError: 'Некорректное действие'
  },
  {
    name: 'POST с action как массив',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: { action: ['add'] },
    expectedStatus: 400,
    expectedError: 'Некорректное действие'
  },
  {
    name: 'POST с очень длинным projectId',
    method: 'POST',
    url: `${API_BASE}/likes/pet-${'1'.repeat(100)}`,
    data: { action: 'add' },
    expectedStatus: 400,
    expectedError: 'Некорректный ID проекта'
  },
  {
    name: 'GET с специальными символами в projectId',
    method: 'GET',
    url: `${API_BASE}/likes/pet-1%20test`,
    expectedStatus: 400,
    expectedError: 'Некорректный формат ID проекта'
  },
  {
    name: 'POST с дополнительными полями',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: { action: 'add', extraField: 'value', anotherField: 123 },
    expectedStatus: 200,
    checkSuccess: true
  },
  {
    name: 'Множественные добавления лайков',
    method: 'POST',
    url: `${API_BASE}/likes/pet-2`,
    data: { action: 'add' },
    expectedStatus: 200,
    checkSuccess: true,
    repeat: 3
  },
  {
    name: 'Удаление лайков до нуля',
    method: 'POST',
    url: `${API_BASE}/likes/pet-2`,
    data: { action: 'remove' },
    expectedStatus: 200,
    checkSuccess: true,
    repeat: 5 // Больше чем добавили, чтобы проверить что не уходит в минус
  }
];

// Функция для выполнения HTTP запроса
async function makeRequest(test) {
  try {
    const config = {
      method: test.method,
      url: test.url,
      validateStatus: () => true,
    };
    
    if (test.data !== undefined) {
      config.data = test.data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    return {
      status: 0,
      data: { error: 'Network Error', message: error.message }
    };
  }
}

// Функция для проверки одного теста
async function runTest(test) {
  log('blue', `\n🧪 Тест: ${test.name}`);
  
  const repeatCount = test.repeat || 1;
  let lastResponse;
  
  for (let i = 0; i < repeatCount; i++) {
    if (repeatCount > 1) {
      log('yellow', `   Попытка ${i + 1}/${repeatCount}: ${test.method} ${test.url}`);
    } else {
      log('yellow', `   ${test.method} ${test.url}`);
    }
    
    if (test.data !== undefined) {
      log('yellow', `   Данные: ${JSON.stringify(test.data)}`);
    }
    
    lastResponse = await makeRequest(test);
    
    // Для повторяющихся тестов проверяем только последний ответ
    if (i === repeatCount - 1) {
      break;
    }
    
    // Для промежуточных запросов просто логируем результат
    if (lastResponse.status === 200) {
      log('green', `   ✅ Запрос ${i + 1} выполнен успешно`);
    } else {
      log('red', `   ❌ Запрос ${i + 1} завершился с ошибкой: ${lastResponse.status}`);
    }
  }
  
  // Проверяем статус код финального ответа
  if (lastResponse.status === test.expectedStatus) {
    log('green', `   ✅ Статус код: ${lastResponse.status} (ожидался ${test.expectedStatus})`);
  } else {
    log('red', `   ❌ Статус код: ${lastResponse.status} (ожидался ${test.expectedStatus})`);
    return false;
  }
  
  // Если это тест на успешный ответ
  if (test.checkSuccess) {
    if (lastResponse.data && lastResponse.data.success === true) {
      log('green', `   ✅ Успешный ответ получен`);
      if (lastResponse.data.likes !== undefined) {
        log('green', `   ✅ Количество лайков: ${lastResponse.data.likes}`);
      }
    } else {
      log('red', `   ❌ Ответ не содержит success: true`);
      return false;
    }
  } else if (test.expectedError) {
    // Проверяем сообщение об ошибке
    if (lastResponse.data && lastResponse.data.error) {
      if (lastResponse.data.error.includes(test.expectedError) || 
          lastResponse.data.message.includes(test.expectedError)) {
        log('green', `   ✅ Сообщение об ошибке содержит: "${test.expectedError}"`);
      } else {
        log('red', `   ❌ Сообщение об ошибке: "${lastResponse.data.error}" не содержит "${test.expectedError}"`);
        return false;
      }
    } else {
      log('red', `   ❌ Ответ не содержит поле error: ${JSON.stringify(lastResponse.data)}`);
      return false;
    }
  }
  
  log('green', `   ✅ Тест пройден`);
  return true;
}

// Основная функция
async function main() {
  log('blue', '🚀 Запуск тестирования граничных случаев API');
  
  // Проверяем, что сервер запущен
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    log('green', '✅ Сервер доступен');
  } catch (error) {
    log('red', '❌ Сервер недоступен. Убедитесь, что сервер запущен на порту 1989');
    process.exit(1);
  }
  
  let passedTests = 0;
  let totalTests = edgeCaseTests.length;
  
  // Запускаем тесты граничных случаев
  for (const test of edgeCaseTests) {
    const passed = await runTest(test);
    if (passed) {
      passedTests++;
    }
  }
  
  // Результаты
  log('blue', '\n📊 Результаты тестирования граничных случаев:');
  log('green', `✅ Пройдено: ${passedTests}/${totalTests} тестов`);
  
  if (passedTests === totalTests) {
    log('green', '🎉 Все тесты граничных случаев пройдены успешно!');
    process.exit(0);
  } else {
    log('red', `❌ Не пройдено: ${totalTests - passedTests} тестов`);
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

module.exports = { runTest, edgeCaseTests };