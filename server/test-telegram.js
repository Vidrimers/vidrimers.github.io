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
    // Тестируем информацию о боте
    console.log('0. Проверяем информацию о Telegram боте...');
    const botInfo = await makeRequest('/api/telegram/info', 'GET');
    console.log(`   Статус: ${botInfo.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(botInfo.body, null, 2)}`);
    
    if (botInfo.body.enabled) {
      console.log('   ✅ Telegram бот настроен и работает');
      console.log(`   🤖 Бот: ${botInfo.body.botInfo.first_name} (@${botInfo.body.botInfo.username})`);
    } else {
      console.log('   ⚠️  Telegram бот не настроен');
    }

    // Отправляем тестовое сообщение
    console.log('\n1. Отправляем тестовое сообщение в Telegram...');
    const testMessage = await makeRequest('/api/telegram/test', 'POST');
    console.log(`   Статус: ${testMessage.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(testMessage.body, null, 2)}`);
    
    if (testMessage.statusCode === 200 && testMessage.body.success) {
      console.log('   ✅ Тестовое сообщение отправлено');
      console.log('   📱 Проверьте Telegram на наличие тестового сообщения');
    } else {
      console.log('   ❌ Ошибка отправки тестового сообщения');
    }

    // Добавляем лайк для проекта pet-2 (должно отправить уведомление)
    console.log('\n2. Добавляем лайк для pet-2 (ЛФК "Креатив")...');
    const response = await makeRequest('/api/likes/pet-2', 'POST', { 
      userId: 'test-user-1' 
    });
    
    console.log(`   Статус: ${response.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response.body, null, 2)}`);
    
    if (response.statusCode === 200 && response.body.isLiked) {
      console.log('   ✅ Лайк добавлен успешно');
      console.log(`   ❤️ Количество лайков: ${response.body.likes}`);
      console.log('   📱 Проверьте Telegram на наличие уведомления о лайке');
    } else if (response.statusCode === 200 && !response.body.isLiked) {
      console.log('   ℹ️  Лайк убран (пользователь уже лайкал этот проект)');
      console.log(`   ❤️ Количество лайков: ${response.body.likes}`);
    } else {
      console.log('   ❌ Ошибка добавления лайка');
    }

    // Ждем немного и добавляем лайк от другого пользователя
    console.log('\n3. Ждем 2 секунды и добавляем лайк для pet-1 от другого пользователя...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response2 = await makeRequest('/api/likes/pet-1', 'POST', { 
      userId: 'test-user-2' 
    });
    console.log(`   Статус: ${response2.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response2.body, null, 2)}`);
    
    if (response2.statusCode === 200 && response2.body.isLiked) {
      console.log('   ✅ Второй лайк добавлен успешно');
      console.log(`   ❤️ Количество лайков: ${response2.body.likes}`);
      console.log('   📱 Проверьте Telegram на наличие второго уведомления');
    }

    // Добавляем лайк для учебного проекта
    console.log('\n4. Ждем 2 секунды и добавляем лайк для layout-1 (Mavic 2 Pro)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response3 = await makeRequest('/api/likes/layout-1', 'POST', { 
      userId: 'test-user-3' 
    });
    console.log(`   Статус: ${response3.statusCode}`);
    console.log(`   Ответ: ${JSON.stringify(response3.body, null, 2)}`);
    
    if (response3.statusCode === 200 && response3.body.isLiked) {
      console.log('   ✅ Третий лайк добавлен успешно');
      console.log(`   ❤️ Количество лайков: ${response3.body.likes}`);
      console.log('   📱 Проверьте Telegram на наличие третьего уведомления');
    }

    // Получаем все лайки
    console.log('\n5. Получаем статистику всех лайков...');
    const allLikes = await makeRequest('/api/likes', 'GET');
    console.log(`   Статус: ${allLikes.statusCode}`);
    console.log(`   Все лайки: ${JSON.stringify(allLikes.body, null, 2)}`);

    console.log('\n🎉 Тестирование завершено!');
    console.log('📱 Проверьте Telegram чат на наличие уведомлений о лайках');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

if (require.main === module) {
  testTelegram();
}

module.exports = { testTelegram };