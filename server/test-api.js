// Простой тест для проверки API лайков
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

// Тесты
async function runTests() {
  console.log('🧪 Запуск тестов API лайков...\n');

  try {
    // Тест 1: Healthcheck
    console.log('1. Тест healthcheck...');
    const healthResponse = await makeRequest('/api/health');
    console.log(`   Статус: ${healthResponse.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(healthResponse.body)}`);
    
    if (healthResponse.statusCode === 200 && healthResponse.body.status === 'OK') {
      console.log('   ✅ Healthcheck прошел успешно\n');
    } else {
      console.log('   ❌ Healthcheck не прошел\n');
      return;
    }

    // Тест 2: GET лайки для проекта 1
    console.log('2. Тест GET /api/likes/1...');
    const getLikes1 = await makeRequest('/api/likes/1');
    console.log(`   Статус: ${getLikes1.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getLikes1.body)}`);
    
    if (getLikes1.statusCode === 200 && getLikes1.body.success) {
      console.log('   ✅ GET лайки для проекта 1 работает\n');
    } else {
      console.log('   ❌ GET лайки для проекта 1 не работает\n');
    }

    // Тест 3: GET лайки для несуществующего проекта
    console.log('3. Тест GET /api/likes/999...');
    const getLikes999 = await makeRequest('/api/likes/999');
    console.log(`   Статус: ${getLikes999.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getLikes999.body)}`);
    
    if (getLikes999.statusCode === 200 && getLikes999.body.likes === 0) {
      console.log('   ✅ GET лайки для несуществующего проекта работает\n');
    } else {
      console.log('   ❌ GET лайки для несуществующего проекта не работает\n');
    }

    // Тест 4: GET лайки с некорректным ID
    console.log('4. Тест GET /api/likes/invalid...');
    const getInvalidLikes = await makeRequest('/api/likes/invalid');
    console.log(`   Статус: ${getInvalidLikes.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getInvalidLikes.body)}`);
    
    if (getInvalidLikes.statusCode === 400 && getInvalidLikes.body.error) {
      console.log('   ✅ Валидация некорректного ID работает\n');
    } else {
      console.log('   ❌ Валидация некорректного ID не работает\n');
    }

    // Тест 5: GET все лайки
    console.log('5. Тест GET /api/likes...');
    const getAllLikes = await makeRequest('/api/likes');
    console.log(`   Статус: ${getAllLikes.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getAllLikes.body)}`);
    
    if (getAllLikes.statusCode === 200 && getAllLikes.body.success) {
      console.log('   ✅ GET все лайки работает\n');
    } else {
      console.log('   ❌ GET все лайки не работает\n');
    }

    console.log('🎉 Все тесты завершены!');

  } catch (error) {
    console.error('❌ Ошибка при выполнении тестов:', error.message);
    console.log('\n💡 Убедитесь, что сервер запущен: node server/server.js');
  }
}

// Запуск тестов
if (require.main === module) {
  runTests();
}

module.exports = { makeRequest, runTests };