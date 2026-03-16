/**
 * Модуль для работы с SQLite базой данных
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к файлу базы данных
const DB_PATH = path.join(__dirname, '..', 'database', 'likes.db');

/**
 * Инициализация базы данных
 * @returns {Promise<sqlite3.Database>} - Экземпляр базы данных
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    // Создаем папку database если её нет
    const fs = require('fs');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Подключение к SQLite базе данных установлено');
      
      // Создаем таблицы если их нет
      db.serialize(() => {
        // Таблица для подсчета лайков
        db.run(`
          CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT UNIQUE NOT NULL,
            likes_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Таблица для отслеживания лайков пользователей
        db.run(`
          CREATE TABLE IF NOT EXISTS user_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, project_id)
          )
        `, (err) => {
        if (err) {
          console.error('Ошибка создания таблицы:', err.message);
          reject(err);
          return;
        }
        
        console.log('✅ Таблицы likes и user_likes готовы');
        resolve(db);
      });
    });
    });
  });
}

/**
 * Получить количество лайков для проекта
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} projectId - ID проекта
 * @returns {Promise<number>} - Количество лайков
 */
function getLikes(db, projectId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT likes_count FROM likes WHERE project_id = ?',
      [projectId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Если записи нет, возвращаем 0
        resolve(row ? row.likes_count : 0);
      }
    );
  });
}

/**
 * Проверить, лайкал ли пользователь проект
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} userId - ID пользователя
 * @param {string} projectId - ID проекта
 * @returns {Promise<boolean>} - true если пользователь лайкал проект
 */
function isUserLiked(db, userId, projectId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM user_likes WHERE user_id = ? AND project_id = ?',
      [userId, projectId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(!!row);
      }
    );
  });
}

/**
 * Переключить лайк пользователя (добавить или убрать)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} userId - ID пользователя
 * @param {string} projectId - ID проекта
 * @returns {Promise<{likes: number, isLiked: boolean}>} - Новое состояние лайков
 */
function toggleUserLike(db, userId, projectId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Проверяем, лайкал ли пользователь уже этот проект
      const alreadyLiked = await isUserLiked(db, userId, projectId);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        if (alreadyLiked) {
          // Убираем лайк пользователя
          db.run(
            'DELETE FROM user_likes WHERE user_id = ? AND project_id = ?',
            [userId, projectId]
          );
          
          // Уменьшаем счетчик
          db.run(
            `UPDATE likes 
             SET likes_count = MAX(0, likes_count - 1),
                 updated_at = CURRENT_TIMESTAMP
             WHERE project_id = ?`,
            [projectId]
          );
        } else {
          // Добавляем лайк пользователя
          db.run(
            'INSERT INTO user_likes (user_id, project_id) VALUES (?, ?)',
            [userId, projectId]
          );
          
          // Увеличиваем счетчик
          db.run(
            `INSERT INTO likes (project_id, likes_count) 
             VALUES (?, 1) 
             ON CONFLICT(project_id) 
             DO UPDATE SET 
               likes_count = likes_count + 1,
               updated_at = CURRENT_TIMESTAMP`,
            [projectId]
          );
        }
        
        db.run('COMMIT', async (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          try {
            // Получаем актуальные данные
            const likes = await getLikes(db, projectId);
            const isLiked = !alreadyLiked; // Инвертируем состояние
            
            resolve({ likes, isLiked });
          } catch (error) {
            reject(error);
          }
        });
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Добавить лайк проекту
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} projectId - ID проекта
 * @returns {Promise<number>} - Новое количество лайков
 */
function addLike(db, projectId) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO likes (project_id, likes_count) 
       VALUES (?, 1) 
       ON CONFLICT(project_id) 
       DO UPDATE SET 
         likes_count = likes_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [projectId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Получаем новое количество лайков
        getLikes(db, projectId)
          .then(resolve)
          .catch(reject);
      }
    );
  });
}

/**
 * Убрать лайк у проекта
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @param {string} projectId - ID проекта
 * @returns {Promise<number>} - Новое количество лайков
 */
function removeLike(db, projectId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE likes 
       SET likes_count = MAX(0, likes_count - 1),
           updated_at = CURRENT_TIMESTAMP
       WHERE project_id = ?`,
      [projectId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Получаем новое количество лайков
        getLikes(db, projectId)
          .then(resolve)
          .catch(reject);
      }
    );
  });
}

/**
 * Получить все лайки
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<Object>} - Объект с лайками всех проектов
 */
function getAllLikes(db) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT project_id, likes_count FROM likes WHERE likes_count > 0',
      [],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Преобразуем в объект
        const likes = {};
        rows.forEach(row => {
          likes[row.project_id] = row.likes_count;
        });
        
        resolve(likes);
      }
    );
  });
}

module.exports = {
  initDatabase,
  getLikes,
  addLike,
  removeLike,
  getAllLikes,
  isUserLiked,
  toggleUserLike
};