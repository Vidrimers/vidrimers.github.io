/**
 * Сервис для работы с базой данных CMS
 * Инициализация, миграции и базовые операции
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../database/cms.db');
    this.schemaPath = path.join(__dirname, '../database/schema.sql');
  }

  /**
   * Инициализирует базу данных
   * @returns {Promise<sqlite3.Database>} Экземпляр базы данных
   */
  async initialize() {
    try {
      // Создаем директорию для базы данных если её нет
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Подключаемся к базе данных
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Ошибка подключения к базе данных CMS:', err);
          throw err;
        }
        console.log('✅ Подключение к базе данных CMS установлено');
      });

      // Включаем поддержку внешних ключей
      await this.runQuery('PRAGMA foreign_keys = ON');

      // Создаем таблицы из схемы
      await this.createTables();

      console.log('✅ База данных CMS инициализирована');
      return this.db;

    } catch (error) {
      console.error('❌ Ошибка инициализации базы данных CMS:', error);
      throw error;
    }
  }

  /**
   * Создает таблицы из файла схемы
   * @private
   */
  async createTables() {
    try {
      const schema = await fs.readFile(this.schemaPath, 'utf8');
      
      // Разделяем SQL команды по точке с запятой и фильтруем пустые
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Выполняем каждую команду отдельно
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await this.runQuery(statement);
          } catch (error) {
            // Игнорируем ошибки "уже существует" для CREATE IF NOT EXISTS
            if (!error.message.includes('already exists')) {
              console.warn('Предупреждение при выполнении SQL:', statement.substring(0, 50) + '...', error.message);
            }
          }
        }
      }

      console.log('✅ Таблицы CMS созданы/обновлены');
    } catch (error) {
      console.error('❌ Ошибка создания таблиц:', error);
      throw error;
    }
  }

  /**
   * Выполняет SQL запрос
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<object>} Результат запроса
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Выполняет SELECT запрос и возвращает одну строку
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<object|null>} Строка результата или null
   */
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Выполняет SELECT запрос и возвращает все строки
   * @param {string} sql - SQL запрос
   * @param {Array} params - Параметры запроса
   * @returns {Promise<Array>} Массив строк результата
   */
  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Выполняет транзакцию
   * @param {Function} callback - Функция с операциями транзакции
   * @returns {Promise<any>} Результат транзакции
   */
  async transaction(callback) {
    await this.runQuery('BEGIN TRANSACTION');
    
    try {
      const result = await callback(this);
      await this.runQuery('COMMIT');
      return result;
    } catch (error) {
      await this.runQuery('ROLLBACK');
      throw error;
    }
  }

  /**
   * Логирует активность пользователя
   * @param {string} userId - ID пользователя
   * @param {string} action - Выполненное действие
   * @param {string} entityType - Тип сущности
   * @param {string} entityId - ID сущности
   * @param {object} details - Дополнительные детали
   * @param {string} ipAddress - IP адрес
   * @param {string} userAgent - User Agent
   * @returns {Promise<number>} ID созданной записи лога
   */
  async logActivity(userId, action, entityType, entityId = null, details = {}, ipAddress = null, userAgent = null) {
    try {
      const result = await this.runQuery(`
        INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, 
          details, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ]);

      return result.lastID;
    } catch (error) {
      console.error('Ошибка логирования активности:', error);
      throw error;
    }
  }

  /**
   * Получает логи активности с фильтрацией
   * @param {object} filters - Фильтры для поиска
   * @param {number} limit - Лимит записей
   * @param {number} offset - Смещение
   * @returns {Promise<Array>} Массив логов
   */
  async getActivityLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let sql = 'SELECT * FROM activity_logs WHERE 1=1';
      const params = [];

      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.action) {
        sql += ' AND action = ?';
        params.push(filters.action);
      }

      if (filters.entityType) {
        sql += ' AND entity_type = ?';
        params.push(filters.entityType);
      }

      if (filters.dateFrom) {
        sql += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        sql += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const logs = await this.allQuery(sql, params);
      
      // Парсим JSON детали
      return logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : {}
      }));

    } catch (error) {
      console.error('Ошибка получения логов:', error);
      throw error;
    }
  }

  /**
   * Очищает старые логи (старше указанного количества дней)
   * @param {number} daysToKeep - Количество дней для хранения
   * @returns {Promise<number>} Количество удаленных записей
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.runQuery(
        'DELETE FROM activity_logs WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      console.log(`🧹 Удалено ${result.changes} старых записей логов`);
      return result.changes;

    } catch (error) {
      console.error('Ошибка очистки логов:', error);
      throw error;
    }
  }

  /**
   * Получает статистику базы данных
   * @returns {Promise<object>} Статистика
   */
  async getStats() {
    try {
      const stats = {};

      // Считаем записи в каждой таблице
      const tables = ['projects', 'categories', 'skills', 'certificates', 'activity_logs'];
      
      for (const table of tables) {
        const result = await this.getQuery(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result.count;
      }

      // Размер базы данных
      try {
        const dbStats = await fs.stat(this.dbPath);
        stats.databaseSize = dbStats.size;
      } catch (error) {
        stats.databaseSize = 0;
      }

      return stats;
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      throw error;
    }
  }

  /**
   * Закрывает соединение с базой данных
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Соединение с базой данных CMS закрыто');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseService;