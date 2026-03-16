const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || './database/vidrimers.db';
  }

  // Инициализация базы данных
  async init() {
    try {
      // Создаем папку database если её нет
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Создана папка для БД: ${dbDir}`);
      }

      // Подключаемся к базе данных
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Ошибка подключения к БД:', err.message);
          throw err;
        }
        console.log(`Подключение к SQLite БД: ${this.dbPath}`);
      });

      // Создаем таблицы
      await this.createTables();
      
      return this.db;
    } catch (error) {
      console.error('Ошибка инициализации БД:', error);
      throw error;
    }
  }

  // Создание таблиц
  createTables() {
    return new Promise((resolve, reject) => {
      const createLikesTable = `
        CREATE TABLE IF NOT EXISTS likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id TEXT NOT NULL UNIQUE,
          likes_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createLikesTable, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы likes:', err.message);
          reject(err);
        } else {
          console.log('Таблица likes создана или уже существует');
          resolve();
        }
      });
    });
  }

  // Получить количество лайков для проекта
  getLikes(projectId) {
    return new Promise((resolve, reject) => {
      // Валидация входных данных
      if (!projectId || typeof projectId !== 'string') {
        reject(new Error('ID проекта должен быть непустой строкой'));
        return;
      }
      
      const query = 'SELECT likes_count FROM likes WHERE project_id = ?';
      
      this.db.get(query, [projectId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.likes_count : 0);
        }
      });
    });
  }

  // Добавить лайк проекту
  addLike(projectId) {
    return new Promise((resolve, reject) => {
      // Валидация входных данных
      if (!projectId || typeof projectId !== 'string') {
        reject(new Error('ID проекта должен быть непустой строкой'));
        return;
      }
      
      // Сначала проверяем, существует ли запись
      const checkQuery = 'SELECT likes_count FROM likes WHERE project_id = ?';
      
      this.db.get(checkQuery, [projectId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          // Обновляем существующую запись
          const updateQuery = `
            UPDATE likes 
            SET likes_count = likes_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = ?
          `;
          
          this.db.run(updateQuery, [projectId], function(err) {
            if (err) {
              reject(err);
            } else {
              // Получаем обновленное количество лайков
              const selectQuery = 'SELECT likes_count FROM likes WHERE project_id = ?';
              this.db.get(selectQuery, [projectId], (err, row) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(row.likes_count);
                }
              });
            }
          }.bind(this));
        } else {
          // Создаем новую запись
          const insertQuery = `
            INSERT INTO likes (project_id, likes_count) 
            VALUES (?, 1)
          `;
          
          this.db.run(insertQuery, [projectId], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(1);
            }
          });
        }
      });
    });
  }

  // Убрать лайк у проекта
  removeLike(projectId) {
    return new Promise((resolve, reject) => {
      // Валидация входных данных
      if (!projectId || typeof projectId !== 'string') {
        reject(new Error('ID проекта должен быть непустой строкой'));
        return;
      }
      
      const query = `
        UPDATE likes 
        SET likes_count = MAX(0, likes_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = ?
      `;

      this.db.run(query, [projectId], function(err) {
        if (err) {
          reject(err);
        } else {
          // Получаем обновленное количество лайков
          const selectQuery = 'SELECT likes_count FROM likes WHERE project_id = ?';
          this.db.get(selectQuery, [projectId], (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row ? row.likes_count : 0);
            }
          });
        }
      }.bind(this));
    });
  }

  // Получить все лайки
  getAllLikes() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT project_id, likes_count FROM likes ORDER BY project_id';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Закрыть соединение с БД
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Ошибка закрытия БД:', err.message);
        } else {
          console.log('Соединение с БД закрыто');
        }
      });
    }
  }
}

module.exports = Database;