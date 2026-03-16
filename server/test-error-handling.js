#!/usr/bin/env node

/**
 * Тестирование обработки ошибок API системы лайков
 * Этот скрипт проверяет различные сценарии ошибок
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

// Тестовые случаи для проверки обработки ошибок
const errorTests = [
  {
    name: 'Некорректный ID проекта (пустая строка)',
    method: 'GET',
    url: `${API_BASE}/likes/`,
    expectedStatus: 200, // Это валидный запрос для получения всех лайков
    expectedError: null, // Не ошибка, а валидный ответ
    checkSuccess: true // Проверяем success: true
  },
  {
    name: 'Некорректный формат ID проекта',
    method: 'GET', 
    url: `${API_BASE}/likes/invalid-format`,
    expectedStatus: 400,
    expectedError: 'Некорректный формат ID проекта'
  },
  {
    name: 'Несуществующий ID проекта',
    method: 'GET',
    url: `${API_BASE}/likes/pet-999`,
    expectedStatus: 404,
    expectedError: 'Проект не найден'
  },
  {
    name: 'POST без тела запроса',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: null,
    expectedStatus: 400,
    expectedError: 'Некорректный JSON'
  },
  {
    name: 'POST с некорректным action',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: { action: 'invalid' },
    expectedStatus: 400,
    expectedError: 'Некорректное действие'
  },
  {
    name: 'POST без поля action',
    method: 'POST',
    url: `${API_BASE}/likes/pet-1`,
    data: { someField: 'value' },
    expectedStatus: 400,
    expectedError: 'Некорректное действие'
  },
  {
    name: 'Несуществующий endpoint',
    method: 'GET',
    url: `${API_BASE}/nonexistent`,
    expectedStatus: 404,
    expectedError: 'Endpoint не найден'
  }
];

// Функция для выполнения HTTP запроса
async function makeRequest(test) {
  try {
    const config = {
      method: test.method,
      url: test.url,
      validateStatus: () => true, // Не бросать ошибку для статусов 4xx/5xx
    };
    
    if (test.data !== undefined) {
      config.data = test.data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    // Сетевые ошибки
    return {
      status: 0,
      data: { error: 'Network Error', message: error.message }
    };
  }
}

// Функция для проверки одного теста
async function runTest(test) {
  log('blue', `\n🧪 Тест: ${test.name}`);
  log('yellow', `   ${test.method} ${test.url}`);
  
  if (test.data !== undefined) {
    log('yellow', `   Данные: ${JSON.stringify(test.data)}`);
  }
  
  const response = await makeRequest(test);
  
  // Проверяем статус код
  if (response.status === test.expectedStatus) {
    log('green', `   ✅ Статус код: ${response.status} (ожидался ${test.expectedStatus})`);
  } else {
    log('red', `   ❌ Статус код: ${response.status} (ожидался ${test.expectedStatus})`);
    return false;
  }
  
  // Если это тест на успешный ответ
  if (test.checkSuccess) {
    if (response.data && response.data.success === true) {
      log('green', `   ✅ Успешный ответ получен`);
    } else {
      log('red', `   ❌ Ответ не содержит success: true`);
      return false;
    }
  } else if (test.expectedError) {
    // Проверяем сообщение об ошибке
    if (response.data && response.data.error) {
      if (response.data.error.includes(test.expectedError) || 
          response.data.message.includes(test.expectedError)) {
        log('green', `   ✅ Сообщение об ошибке содержит: "${test.expectedError}"`);
      } else {
        log('red', `   ❌ Сообщение об ошибке: "${response.data.error}" не содержит "${test.expectedError}"`);
        return false;
      }
    } else {
      log('red', `   ❌ Ответ не содержит поле error: ${JSON.stringify(response.data)}`);
      return false;
    }
  }
  
  log('green', `   ✅ Тест пройден`);
  return true;
}

// Функция для проверки позитивных случаев
async function runPositiveTests() {
  log('blue', '\n🧪 Позитивные тесты');
  
  // Тест healthcheck
  try {
    const healthResponse = await axios.get(`${API_BASE}/health`);
    if (healthResponse.status === 200 && healthResponse.data.status === 'OK') {
      log('green', '   ✅ Healthcheck работает');
    } else {
      log('red', '   ❌ Healthcheck не работает');
      return false;
    }
  } catch (error) {
    log('red', `   ❌ Ошибка healthcheck: ${error.message}`);
    return false;
  }
  
  // Тест получения лайков для валидного проекта
  try {
    const likesResponse = await axios.get(`${API_BASE}/likes/pet-1`);
    if (likesResponse.status === 200 && typeof likesResponse.data.likes === 'number') {
      log('green', `   ✅ Получение лайков работает: ${likesResponse.data.likes} лайков`);
    } else {
      log('red', '   ❌ Получение лайков не работает');
      return false;
    }
  } catch (error) {
    log('red', `   ❌ Ошибка получения лайков: ${error.message}`);
    return false;
  }
  
  return true;
}

// Основная функция
async function main() {
  log('blue', '🚀 Запуск тестирования обработки ошибок API');
  
  // Проверяем, что сервер запущен
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    log('green', '✅ Сервер доступен');
  } catch (error) {
    log('red', '❌ Сервер недоступен. Убедитесь, что сервер запущен на порту 1989');
    log('yellow', 'Запустите: npm run server или node server/server.js');
    process.exit(1);
  }
  
  let passedTests = 0;
  let totalTests = errorTests.length;
  
  // Запускаем позитивные тесты
  const positiveTestsPassed = await runPositiveTests();
  if (!positiveTestsPassed) {
    log('red', '❌ Позитивные тесты не прошли. Проверьте базовую функциональность API');
    process.exit(1);
  }
  
  // Запускаем тесты обработки ошибок
  for (const test of errorTests) {
    const passed = await runTest(test);
    if (passed) {
      passedTests++;
    }
  }
  
  // Результаты
  log('blue', '\n📊 Результаты тестирования:');
  log('green', `✅ Пройдено: ${passedTests}/${totalTests} тестов`);
  
  if (passedTests === totalTests) {
    log('green', '🎉 Все тесты обработки ошибок пройдены успешно!');
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

module.exports = { runTest, errorTests };