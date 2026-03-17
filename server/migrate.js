#!/usr/bin/env node

/**
 * Скрипт для запуска миграции данных CMS
 */

const { initCMSDatabase, closeDatabase } = require('./services/databaseService');
const { runFullMigration, needsMigration } = require('./services/migrationService');

async function main() {
  let db;
  
  try {
    console.log('🚀 Запуск миграции CMS данных...');
    
    // Инициализируем базу данных
    db = await initCMSDatabase();
    
    // Проверяем, нужна ли миграция
    const shouldMigrate = await needsMigration(db);
    
    if (shouldMigrate) {
      console.log('📦 Миграция необходима, начинаем перенос данных...');
      await runFullMigration(db);
    } else {
      console.log('✅ Данные уже мигрированы, пропускаем миграцию');
    }
    
    console.log('🎉 Миграция завершена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await closeDatabase(db);
      console.log('🔒 Соединение с базой данных закрыто');
    }
  }
}

// Запускаем миграцию, если скрипт вызван напрямую
if (require.main === module) {
  main();
}

module.exports = { main };