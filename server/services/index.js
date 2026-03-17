/**
 * Глобальные экземпляры сервисов
 */

const DatabaseService = require('./databaseService');
const TelegramService = require('./telegramService');

// Глобальные экземпляры
let dbService = null;
let telegramService = null;

/**
 * Инициализирует все сервисы
 */
async function initializeServices() {
  try {
    // Инициализируем базу данных
    dbService = new DatabaseService();
    await dbService.initialize();
    
    // Инициализируем Telegram
    try {
      telegramService = new TelegramService();
    } catch (error) {
      console.warn('⚠️ Telegram сервис не настроен:', error.message);
      telegramService = null;
    }
    
    console.log('✅ Все сервисы инициализированы');
    return { dbService, telegramService };
    
  } catch (error) {
    console.error('❌ Ошибка инициализации сервисов:', error);
    throw error;
  }
}

/**
 * Получает экземпляр сервиса базы данных
 */
function getDbService() {
  if (!dbService) {
    throw new Error('Database service не инициализирован');
  }
  return dbService;
}

/**
 * Получает экземпляр Telegram сервиса
 */
function getTelegramService() {
  return telegramService; // Может быть null если не настроен
}

/**
 * Закрывает все сервисы
 */
async function closeServices() {
  const promises = [];
  
  if (dbService) {
    promises.push(dbService.close());
  }
  
  await Promise.all(promises);
  console.log('✅ Все сервисы закрыты');
}

module.exports = {
  initializeServices,
  getDbService,
  getTelegramService,
  closeServices
};