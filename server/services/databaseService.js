/**
 * Сервис для работы с CMS базой данных SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Путь к файлу базы данных CMS (используем основную базу данных)
const CMS_DB_PATH = path.join(__dirname, '..', '..', 'database', 'vidrimers.db');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'database', 'schema.sql');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  /**
   * Инициализация CMS базы данных
   * @returns {Promise<void>}
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      // Создаем папку database если её нет
      const dbDir = path.dirname(CMS_DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(CMS_DB_PATH, (err) => {
        if (err) {
          console.error('Ошибка подключения к CMS базе данных:', err.message);
          reject(err);
          return;
        }
        
        console.log('✅ Подключение к CMS SQLite базе данных установлено');
        
        // Читаем и выполняем схему базы данных
        if (fs.existsSync(SCHEMA_PATH)) {
          const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
          
          this.db.exec(schema, (err) => {
            if (err) {
              console.error('Ошибка создания схемы базы данных:', err.message);
              reject(err);
              return;
            }
            
            console.log('✅ Схема CMS базы данных создана успешно');
            resolve();
          });
        } else {
          console.error('Файл схемы базы данных не найден:', SCHEMA_PATH);
          reject(new Error('Schema file not found'));
        }
      });
    });
  }

  /**
   * Закрыть соединение с базой данных
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.db = null;
        resolve();
      });
    });
  }

  /**
   * Выполнить SQL запрос с параметрами
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<any>}
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Получить одну запись
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<Object|null>}
   */
  getOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Получить все записи
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<Array>}
   */
  getAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  /**
   * Выполнить транзакцию
   * @param {Function} callback - Функция с операциями транзакции
   * @returns {Promise<any>}
   */
  async transaction(callback) {
    try {
      await this.runQuery('BEGIN TRANSACTION');
      
      try {
        const result = await callback(this);
        await this.runQuery('COMMIT');
        return result;
      } catch (error) {
        await this.runQuery('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Инициализация CMS базы данных (функция для обратной совместимости)
 * @returns {Promise<sqlite3.Database>} - Экземпляр базы данных
 */
function initCMSDatabase() {
  return new Promise((resolve, reject) => {
    // Создаем папку database если её нет
    const dbDir = path.dirname(CMS_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new sqlite3.Database(CMS_DB_PATH, (err) => {
      if (err) {
        console.error('Ошибка подключения к CMS базе данных:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Подключение к CMS SQLite базе данных установлено');
      
      // Читаем и выполняем схему базы данных
      if (fs.existsSync(SCHEMA_PATH)) {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        
        db.exec(schema, (err) => {
          if (err) {
            console.error('Ошибка создания схемы базы данных:', err.message);
            reject(err);
            return;
          }
          
          console.log('✅ Схема CMS базы данных создана успешно');
          resolve(db);
        });
      } else {
        console.error('Файл схемы базы данных не найден:', SCHEMA_PATH);
        reject(new Error('Schema file not found'));
      }
    });
  });
}

/**
 * Получить экземпляр базы данных (функция для обратной совместимости)
 * @returns {Promise<sqlite3.Database>}
 */
function getDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(CMS_DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

/**
 * Закрыть соединение с базой данных (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Выполнить SQL запрос с параметрами (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} sql - SQL запрос
 * @param {Array} params - Параметры запроса
 * @returns {Promise<any>}
 */
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Получить одну запись (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} sql - SQL запрос
 * @param {Array} params - Параметры запроса
 * @returns {Promise<Object|null>}
 */
function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

/**
 * Получить все записи (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} sql - SQL запрос
 * @param {Array} params - Параметры запроса
 * @returns {Promise<Array>}
 */
function getAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Выполнить транзакцию (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {Function} callback - Функция с операциями транзакции
 * @returns {Promise<any>}
 */
function transaction(db, callback) {
  return new Promise(async (resolve, reject) => {
    try {
      await runQuery(db, 'BEGIN TRANSACTION');
      
      try {
        const result = await callback(db);
        await runQuery(db, 'COMMIT');
        resolve(result);
      } catch (error) {
        await runQuery(db, 'ROLLBACK');
        reject(error);
      }
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = DatabaseService;

// Экспортируем также функции для обратной совместимости
module.exports.initCMSDatabase = initCMSDatabase;
module.exports.getDatabase = getDatabase;
module.exports.closeDatabase = closeDatabase;
module.exports.runQuery = runQuery;
module.exports.getOne = getOne;
module.exports.getAll = getAll;
module.exports.transaction = transaction;