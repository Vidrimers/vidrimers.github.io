// Прямой тест Telegram модуля
const Telegram = require('./telegram');
require('dotenv').config();

async function testTelegramDirect() {
  console.log('🤖 Прямое тестирование Telegram модуля...\n');

  try {
    // Создаем экземпляр Telegram
    const telegram = new Telegram();
    
    console.log('1. Проверяем статус бота...');
    const botInfo = await telegram.getBotInfo();
    console.log('   Статус бота:', JSON.stringify(botInfo, null, 2));
    
    if (botInfo.enabled) {
      console.log(`   ✅ Бот настроен: ${botInfo.botInfo.first_name} (@${botInfo.botInfo.username})`);
      
      // Отправляем тестовое сообщение
      console.log('\n2. Отправляем тестовое сообщение...');
      const testResult = await telegram.sendTestMessage();
      console.log(`   Результат: ${testResult ? '✅ Успешно' : '❌ Ошибка'}`);
      
      // Отправляем уведомление о лайке
      console.log('\n3. Отправляем уведомление о лайке для pet-2...');
      const likeResult = await telegram.sendLikeNotification('pet-2', 5);
      console.log(`   Результат: ${likeResult ? '✅ Успешно' : '❌ Ошибка'}`);
      
      // Отправляем уведомление о лайке для layout-1
      console.log('\n4. Отправляем уведомление о лайке для layout-1...');
      const likeResult2 = await telegram.sendLikeNotification('layout-1', 3);
      console.log(`   Результат: ${likeResult2 ? '✅ Успешно' : '❌ Ошибка'}`);
      
      // Тестируем форматирование сообщения
      console.log('\n5. Тестируем форматирование сообщений...');
      const message1 = telegram.formatLikeMessage('pet-1', 7);
      const message2 = telegram.formatLikeMessage('layout-2', 2);
      
      console.log('   Сообщение для pet-1:');
      console.log('   ' + message1.replace(/\n/g, '\n   '));
      
      console.log('\n   Сообщение для layout-2:');
      console.log('   ' + message2.replace(/\n/g, '\n   '));
      
    } else {
      console.log('   ❌ Бот не настроен:', botInfo.error);
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
  
  console.log('\n✅ Прямое тестирование завершено!');
}

if (require.main === module) {
  testTelegramDirect();
}

module.exports = { testTelegramDirect };