// Простой тест для одного Telegram уведомления
const http = require('http');

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

async function testSingleTelegram() {
  console.log('🧪 Тест одного Telegram уведомления...\n');

  try {
    // Добавляем лайк для проекта pet-3
    console.log('Добавляем лайк для pet-3 (НПП Полет)...');
    const response = await makeRequest('/api/likes/pet-3', 'POST', { 
      userId: `test-user-${Date.now()}` 
    });
    
    console.log(`Статус: ${response.statusCode}`);
    console.log(`Ответ: ${JSON.stringify(response.body, null, 2)}`);
    
    if (response.statusCode === 200 && response.body.isLiked) {
      console.log('✅ Лайк добавлен успешно');
      console.log(`❤️ Количество лайков: ${response.body.likes}`);
      console.log('📱 Проверьте Telegram на наличие уведомления');
    } else if (response.statusCode === 200 && !response.body.isLiked) {
      console.log('ℹ️  Лайк убран');
      console.log(`❤️ Количество лайков: ${response.body.likes}`);
    } else {
      console.log('❌ Ошибка');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testSingleTelegram();