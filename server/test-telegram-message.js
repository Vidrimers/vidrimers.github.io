// Тест отправки тестового сообщения в Telegram
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

async function testTelegramMessage() {
  console.log('📱 Тест отправки тестового сообщения в Telegram...\n');

  try {
    const response = await makeRequest('/api/telegram/test', 'POST');
    
    console.log(`Статус: ${response.statusCode}`);
    console.log(`Ответ: ${JSON.stringify(response.body, null, 2)}`);
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ Тестовое сообщение отправлено');
      console.log('📱 Проверьте Telegram на наличие сообщения');
    } else {
      console.log('❌ Ошибка отправки');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testTelegramMessage();