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

    // Тест 2: GET лайки для валидного проекта pet-1
    console.log('2. Тест GET /api/likes/pet-1...');
    const getLikesPet1 = await makeRequest('/api/likes/pet-1');
    console.log(`   Статус: ${getLikesPet1.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getLikesPet1.body)}`);
    
    if (getLikesPet1.statusCode === 200 && getLikesPet1.body.success) {
      console.log('   ✅ GET лайки для проекта pet-1 работает\n');
    } else {
      console.log('   ❌ GET лайки для проекта pet-1 не работает\n');
    }

    // Тест 3: GET лайки для валидного проекта layout-1
    console.log('3. Тест GET /api/likes/layout-1...');
    const getLikesLayout1 = await makeRequest('/api/likes/layout-1');
    console.log(`   Статус: ${getLikesLayout1.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getLikesLayout1.body)}`);
    
    if (getLikesLayout1.statusCode === 200 && getLikesLayout1.body.success) {
      console.log('   ✅ GET лайки для проекта layout-1 работает\n');
    } else {
      console.log('   ❌ GET лайки для проекта layout-1 не работает\n');
    }

    // Тест 4: GET лайки для несуществующего проекта (валидный формат)
    console.log('4. Тест GET /api/likes/pet-999...');
    const getLikesPet999 = await makeRequest('/api/likes/pet-999');
    console.log(`   Статус: ${getLikesPet999.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getLikesPet999.body)}`);
    
    if (getLikesPet999.statusCode === 404 && getLikesPet999.body.error) {
      console.log('   ✅ Валидация несуществующего проекта работает\n');
    } else {
      console.log('   ❌ Валидация несуществующего проекта не работает\n');
    }

    // Тест 5: GET лайки с некорректным форматом ID
    console.log('5. Тест GET /api/likes/invalid...');
    const getInvalidLikes = await makeRequest('/api/likes/invalid');
    console.log(`   Статус: ${getInvalidLikes.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(getInvalidLikes.body)}`);
    
    if (getInvalidLikes.statusCode === 400 && getInvalidLikes.body.error) {
      console.log('   ✅ Валидация некорректного формата ID работает\n');
    } else {
      console.log('   ❌ Валидация некорректного формата ID не работает\n');
    }

    // Тест 6: POST добавить лайк
    console.log('6. Тест POST /api/likes/pet-1 (добавить лайк)...');
    const addLike = await makeRequest('/api/likes/pet-1', 'POST', { action: 'add' });
    console.log(`   Статус: ${addLike.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(addLike.body)}`);
    
    if (addLike.statusCode === 200 && addLike.body.success && addLike.body.action === 'add') {
      console.log('   ✅ POST добавить лайк работает\n');
    } else {
      console.log('   ❌ POST добавить лайк не работает\n');
    }

    // Тест 7: POST убрать лайк
    console.log('7. Тест POST /api/likes/pet-1 (убрать лайк)...');
    const removeLike = await makeRequest('/api/likes/pet-1', 'POST', { action: 'remove' });
    console.log(`   Статус: ${removeLike.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(removeLike.body)}`);
    
    if (removeLike.statusCode === 200 && removeLike.body.success && removeLike.body.action === 'remove') {
      console.log('   ✅ POST убрать лайк работает\n');
    } else {
      console.log('   ❌ POST убрать лайк не работает\n');
    }

    // Тест 8: POST с некорректными данными
    console.log('8. Тест POST /api/likes/pet-1 (некорректное действие)...');
    const invalidAction = await makeRequest('/api/likes/pet-1', 'POST', { action: 'invalid' });
    console.log(`   Статус: ${invalidAction.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(invalidAction.body)}`);
    
    if (invalidAction.statusCode === 400 && invalidAction.body.error) {
      console.log('   ✅ Валидация некорректного действия работает\n');
    } else {
      console.log('   ❌ Валидация некорректного действия не работает\n');
    }

    // Тест 9: POST без тела запроса
    console.log('9. Тест POST /api/likes/pet-1 (без тела запроса)...');
    const noBody = await makeRequest('/api/likes/pet-1', 'POST', null);
    console.log(`   Статус: ${noBody.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(noBody.body)}`);
    
    if (noBody.statusCode === 400 && noBody.body.error) {
      console.log('   ✅ Валидация отсутствующего тела запроса работает\n');
    } else {
      console.log('   ❌ Валидация отсутствующего тела запроса не работает\n');
    }

    // Тест 10: GET все лайки
    console.log('10. Тест GET /api/likes...');
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