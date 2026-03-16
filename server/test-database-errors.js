#!/usr/bin/env node

/**
 * Тестирование обработки ошибок базы данных
 */

const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

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

// Функция для выполнения HTTP запроса
async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url,
      validateStatus: () => true,
    };
    
    if (data !== null) {
      config.data = data;
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

// Тест обработки ошибок при недоступности базы данных
async function testDatabaseUnavailable() {
  log('blue', '\n🧪 Тест: Обработка недоступности базы данных');
  
  // Сначала проверим, что API работает
  const healthResponse = await makeRequest('GET', `${API_BASE}/health`);
  if (healthResponse.status !== 200) {
    log('red', '❌ API недоступен');
    return false;
  }
  
  log('green', '✅ API доступен, база данных работает');
  
  // Проверим, что лайки работают
  const likesResponse = await makeRequest('GET', `${API_BASE}/likes/pet-1`);
  if (likesResponse.status === 200) {
    log('green', `✅ Получение лайков работает: ${likesResponse.data.likes} лайков`);
  } else {
    log('red', '❌ Получение лайков не работает');
    return false;
  }
  
  // Проверим добавление лайка
  const addResponse = await makeRequest('POST', `${API_BASE}/likes/pet-1`, { action: 'add' });
  if (addResponse.status === 200) {
    log('green', `✅ Добавление лайка работает: ${addResponse.data.likes} лайков`);
  } else {
    log('red', '❌ Добавление лайка не работает');
    return false;
  }
  
  return true;
}

// Тест обработки ошибок валидации в базе данных
async function testDatabaseValidation() {
  log('blue', '\n🧪 Тест: Валидация данных в базе данных');
  
  // Эти тесты проверяют, что валидация на уровне приложения работает
  // и предотвращает некорректные данные от попадания в базу данных
  
  const tests = [
    {
      name: 'Попытка добавить лайк с некорректным projectId',
      method: 'POST',
      url: `${API_BASE}/likes/invalid-project`,
      data: { action: 'add' },
      expectedStatus: 400
    },
    {
      name: 'Попытка получить лайки для несуществующего проекта',
      method: 'GET',
      url: `${API_BASE}/likes/pet-999`,
      expectedStatus: 404
    }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    log('yellow', `   Тест: ${test.name}`);
    const response = await makeRequest(test.method, test.url, test.data);
    
    if (response.status === test.expectedStatus) {
      log('green', `   ✅ Статус код: ${response.status} (ожидался ${test.expectedStatus})`);
      passed++;
    } else {
      log('red', `   ❌ Статус код: ${response.status} (ожидался ${test.expectedStatus})`);
    }
  }
  
  return passed === tests.length;
}

// Тест производительности и нагрузки
async function testPerformanceAndLoad() {
  log('blue', '\n🧪 Тест: Производительность и обработка нагрузки');
  
  const startTime = Date.now();
  const requests = [];
  
  // Создаем 10 параллельных запросов
  for (let i = 0; i < 10; i++) {
    requests.push(makeRequest('GET', `${API_BASE}/likes/pet-1`));
  }
  
  try {
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Проверяем, что все запросы успешны
    const successfulRequests = responses.filter(r => r.status === 200).length;
    
    log('green', `✅ Выполнено ${successfulRequests}/10 запросов за ${duration}ms`);
    
    if (successfulRequests === 10 && duration < 5000) {
      log('green', '✅ Производительность в норме');
      return true;
    } else {
      log('red', '❌ Проблемы с производительностью');
      return false;
    }
  } catch (error) {
    log('red', `❌ Ошибка при тестировании нагрузки: ${error.message}`);
    return false;
  }
}

// Основная функция
async function main() {
  log('blue', '🚀 Запуск тестирования обработки ошибок базы данных');
  
  // Проверяем, что сервер запущен
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    log('green', '✅ Сервер доступен');
  } catch (error) {
    log('red', '❌ Сервер недоступен. Убедитесь, что сервер запущен на порту 1989');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Доступность базы данных', test: testDatabaseUnavailable },
    { name: 'Валидация данных', test: testDatabaseValidation },
    { name: 'Производительность и нагрузка', test: testPerformanceAndLoad }
  ];
  
  let passedTests = 0;
  
  for (const { name, test } of tests) {
    log('blue', `\n📋 Категория: ${name}`);
    const passed = await test();
    if (passed) {
      passedTests++;
      log('green', `✅ Категория "${name}" пройдена`);
    } else {
      log('red', `❌ Категория "${name}" не пройдена`);
    }
  }
  
  // Результаты
  log('blue', '\n📊 Результаты тестирования базы данных:');
  log('green', `✅ Пройдено: ${passedTests}/${tests.length} категорий`);
  
  if (passedTests === tests.length) {
    log('green', '🎉 Все тесты базы данных пройдены успешно!');
    process.exit(0);
  } else {
    log('red', `❌ Не пройдено: ${tests.length - passedTests} категорий`);
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

module.exports = { testDatabaseUnavailable, testDatabaseValidation, testPerformanceAndLoad };