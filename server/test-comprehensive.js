// Комплексный тест API лайков
const http = require('http');

const API_BASE = 'http://localhost:1989/api';

// Функция для выполнения HTTP запроса
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Комплексный тест
async function runComprehensiveTest() {
  console.log('🧪 Запуск комплексного тестирования API лайков...\n');

  let passedTests = 0;
  let totalTests = 0;

  function testResult(testName, condition, details = '') {
    totalTests++;
    if (condition) {
      console.log(`   ✅ ${testName}`);
      passedTests++;
    } else {
      console.log(`   ❌ ${testName}`);
      if (details) console.log(`      ${details}`);
    }
  }

  try {
    // 1. Проверка доступности сервера
    console.log('🏥 1. Проверка доступности сервера');
    const health = await makeRequest('/api/health');
    testResult('Healthcheck доступен', health.statusCode === 200);
    testResult('Healthcheck возвращает корректные данные', 
      health.body.status === 'OK' && health.body.port === '1989');
    console.log();

    // 2. Тестирование GET запросов
    console.log('📖 2. Тестирование GET запросов');
    
    // Валидные проекты
    const validProjects = ['pet-1', 'pet-2', 'pet-3', 'layout-1', 'layout-2'];
    for (const projectId of validProjects) {
      const response = await makeRequest(`/api/likes/${projectId}`);
      testResult(`GET /api/likes/${projectId}`, 
        response.statusCode === 200 && response.body.success === true);
    }
    
    // Получение всех лайков
    const allLikes = await makeRequest('/api/likes');
    testResult('GET /api/likes (все лайки)', 
      allLikes.statusCode === 200 && allLikes.body.success === true);
    console.log();

    // 3. Тестирование валидации
    console.log('🔍 3. Тестирование валидации');
    
    // Некорректные форматы ID
    const invalidIds = ['invalid', '123', 'pet-', 'layout-abc', 'other-1'];
    for (const invalidId of invalidIds) {
      const response = await makeRequest(`/api/likes/${invalidId}`);
      testResult(`Валидация ${invalidId}`, response.statusCode === 400);
    }
    
    // Несуществующие проекты (валидный формат)
    const nonExistentIds = ['pet-0', 'pet-999', 'layout-999'];
    for (const nonExistentId of nonExistentIds) {
      const response = await makeRequest(`/api/likes/${nonExistentId}`);
      testResult(`Несуществующий проект ${nonExistentId}`, response.statusCode === 404);
    }
    console.log();

    // 4. Тестирование POST запросов
    console.log('📝 4. Тестирование POST запросов');
    
    // Получаем текущее количество лайков для pet-3
    const initialLikes = await makeRequest('/api/likes/pet-3');
    const initialCount = initialLikes.body.likes;
    
    // Добавляем лайк
    const addResponse = await makeRequest('/api/likes/pet-3', 'POST', { action: 'add' });
    testResult('POST добавить лайк', 
      addResponse.statusCode === 200 && addResponse.body.likes === initialCount + 1);
    
    // Убираем лайк
    const removeResponse = await makeRequest('/api/likes/pet-3', 'POST', { action: 'remove' });
    testResult('POST убрать лайк', 
      removeResponse.statusCode === 200 && removeResponse.body.likes === initialCount);
    
    // Проверяем, что лайки не могут быть отрицательными
    const removeAgain = await makeRequest('/api/likes/layout-2', 'POST', { action: 'remove' });
    testResult('Лайки не становятся отрицательными', 
      removeAgain.statusCode === 200 && removeAgain.body.likes >= 0);
    console.log();

    // 5. Тестирование обработки ошибок POST
    console.log('⚠️ 5. Тестирование обработки ошибок POST');
    
    // Некорректные данные
    const errorTests = [
      { data: null, name: 'Пустое тело запроса' },
      { data: {}, name: 'Отсутствует action' },
      { data: { action: 'invalid' }, name: 'Некорректное action' },
      { data: { action: 123 }, name: 'action не строка' },
      { data: { action: '' }, name: 'Пустое action' }
    ];
    
    for (const test of errorTests) {
      const response = await makeRequest('/api/likes/pet-1', 'POST', test.data);
      testResult(test.name, response.statusCode === 400);
    }
    console.log();

    // 6. Тестирование производительности
    console.log('⚡ 6. Тестирование производительности');
    
    const startTime = Date.now();
    const promises = [];
    
    // Выполняем 10 параллельных запросов
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest('/api/likes/pet-1'));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    testResult('10 параллельных запросов < 1000ms', duration < 1000, `Время: ${duration}ms`);
    console.log();

    // 7. Тестирование консистентности данных
    console.log('🔄 7. Тестирование консистентности данных');
    
    // Получаем лайки до операций
    const beforeAll = await makeRequest('/api/likes');
    const beforePet1 = await makeRequest('/api/likes/pet-1');
    
    // Добавляем лайк
    await makeRequest('/api/likes/pet-1', 'POST', { action: 'add' });
    
    // Проверяем консистентность
    const afterAll = await makeRequest('/api/likes');
    const afterPet1 = await makeRequest('/api/likes/pet-1');
    
    testResult('Консистентность данных после добавления лайка',
      afterPet1.body.likes === beforePet1.body.likes + 1);
    
    // Возвращаем обратно
    await makeRequest('/api/likes/pet-1', 'POST', { action: 'remove' });
    console.log();

    // Итоговые результаты
    console.log('📊 Результаты тестирования:');
    console.log(`✅ Пройдено: ${passedTests}/${totalTests} тестов`);
    console.log(`📈 Успешность: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 Все тесты прошли успешно! API готов к использованию.');
    } else {
      console.log(`\n⚠️ ${totalTests - passedTests} тестов провалились. Требуется доработка.`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error.message);
    console.log('\n💡 Убедитесь, что сервер запущен: node server/server.js');
  }
}

// Запуск тестов
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = { runComprehensiveTest };