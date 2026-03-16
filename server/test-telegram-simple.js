// Простой тест для проверки Telegram уведомлений
const http = require('http');

// Функция для выполнения HTTP запроса
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 1989,
      path: path,
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
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

async function testTelegramSimple() {
  console.log('🤖 Простой тест Telegram уведомлений...\n');

  try {
    // Генерируем уникальный ID пользователя для теста
    const testUserId = `test-user-${Date.now()}`;
    console.log(`👤 Используем тестового пользователя: ${testUserId}\n`);

    // Добавляем лайк для проекта pet-3 (НПП Полет)
    console.log('1. Добавляем лайк для pet-3 (НПП Полет)...');
    const response = await makeRequest('/api/likes/pet-3', 'POST', { 
      action: 'add',
      userId: testUserId
    });
    
    console.log(`   Статус: ${response.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response.body, null, 2)}`);
    
    if (response.statusCode === 200 && response.body.success) {
      if (response.body.action === 'add') {
        console.log('   ✅ Лайк добавлен успешно');
        console.log(`   ❤️ Количество лайков: ${response.body.likes}`);
        console.log('   📱 Проверьте Telegram на наличие уведомления');
      } else {
        console.log('   ℹ️  Лайк убран (пользователь уже лайкал этот проект)');
        console.log(`   ❤️ Количество лайков: ${response.body.likes}`);
      }
    } else {
      console.log('   ❌ Ошибка добавления лайка');
    }

    // Ждем и добавляем лайк для другого проекта
    console.log('\n2. Ждем 3 секунды и добавляем лайк для layout-2...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const testUserId2 = `test-user-${Date.now()}`;
    const response2 = await makeRequest('/api/likes/layout-2', 'POST', { 
      action: 'add',
      userId: testUserId2
    });
    
    console.log(`   Статус: ${response2.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response2.body, null, 2)}`);
    
    if (response2.statusCode === 200 && response2.body.success) {
      if (response2.body.action === 'add') {
        console.log('   ✅ Второй лайк добавлен успешно');
        console.log(`   ❤️ Количество лайков: ${response2.body.likes}`);
        console.log('   📱 Проверьте Telegram на наличие второго уведомления');
      } else {
        console.log('   ℹ️  Лайк убран (пользователь уже лайкал этот проект)');
        console.log(`   ❤️ Количество лайков: ${response2.body.likes}`);
      }
    }

    console.log('\n✅ Тестирование завершено!');
    console.log('📱 Проверьте Telegram чат на наличие уведомлений о лайках');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

if (require.main === module) {
  testTelegramSimple();
}

module.exports = { testTelegramSimple };