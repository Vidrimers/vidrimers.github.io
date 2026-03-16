// Тест для проверки Telegram уведомлений
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

async function testTelegram() {
  console.log('🤖 Тестирование Telegram уведомлений...\n');

  try {
    // Добавляем лайк для проекта pet-2 (должно отправить уведомление)
    console.log('1. Добавляем лайк для pet-2...');
    const response = await makeRequest('/api/likes/pet-2', 'POST', { action: 'add' });
    
    console.log(`   Статус: ${response.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response.body)}`);
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('   ✅ Лайк добавлен успешно');
      console.log('   📱 Проверьте Telegram на наличие уведомления');
    } else {
      console.log('   ❌ Ошибка добавления лайка');
    }

    // Ждем немного и добавляем еще один лайк
    console.log('\n2. Ждем 2 секунды и добавляем еще один лайк...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response2 = await makeRequest('/api/likes/pet-1', 'POST', { action: 'add' });
    console.log(`   Статус: ${response2.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response2.body)}`);
    
    if (response2.statusCode === 200 && response2.body.success) {
      console.log('   ✅ Второй лайк добавлен успешно');
      console.log('   📱 Проверьте Telegram на наличие второго уведомления');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

if (require.main === module) {
  testTelegram();
}

module.exports = { testTelegram };