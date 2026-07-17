/**
 * Модуль для работы с SQLite базой данных Pet Gang
 * Отдельная БД, не связанная с основной
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'petgang.db');

let db = null;

/**
 * Инициализация базы данных Pet Gang
 */
function initPetGangDatabase() {
  return new Promise((resolve, reject) => {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Pet Gang: Ошибка подключения к БД:', err.message);
        reject(err);
        return;
      }

      console.log('Pet Gang: Подключение к SQLite установлено');

      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phones TEXT DEFAULT '[]',
          country TEXT,
          city TEXT,
          instagram TEXT,
          telegram TEXT,
          email TEXT,
          visibility_settings TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS pets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          species TEXT NOT NULL,
          breed TEXT,
          sex TEXT NOT NULL,
          birth_date TEXT,
          chip_number TEXT,
          tag_number TEXT,
          sterilized INTEGER DEFAULT 0,
          color TEXT,
          special_marks TEXT,
          free_walking INTEGER DEFAULT 0,
          address TEXT,
          photos TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS qr_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qr_token TEXT UNIQUE NOT NULL,
          pet_id INTEGER,
          is_bound INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pet_id) REFERENCES pets(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS scan_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qr_id INTEGER NOT NULL,
          pet_id INTEGER,
          ip_address TEXT,
          latitude REAL,
          longitude REAL,
          user_agent TEXT,
          scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (qr_id) REFERENCES qr_codes(id),
          FOREIGN KEY (pet_id) REFERENCES pets(id)
        )`, (err) => {
          if (err) {
            console.error('Pet Gang: Ошибка создания таблиц:', err.message);
            reject(err);
            return;
          }
          console.log('Pet Gang: Таблицы готовы');

          // Очистка: отвязать QR от удалённых питомцев
          db.run(`
            UPDATE qr_codes SET pet_id = NULL, is_bound = 0
            WHERE is_bound = 1 AND pet_id NOT IN (SELECT id FROM pets)
          `);

          resolve(db);
        });
      });
    });
  });
}

/**
 * Получить экземпляр БД
 */
function getDb() {
  return db;
}

// === USERS ===

function getUser(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function getOrCreateUser(data) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = 1', [], (err, row) => {
      if (err) { reject(err); return; }

      if (row) {
        db.run(
          `UPDATE users SET name=?, phones=?, country=?, city=?, instagram=?, telegram=?, email=?, visibility_settings=? WHERE id=1`,
          [data.name, JSON.stringify(data.phones || []), data.country, data.city, data.instagram, data.telegram, data.email, JSON.stringify(data.visibility_settings || {})],
          function (err) {
            if (err) reject(err);
            else resolve({ id: 1, ...data });
          }
        );
      } else {
        db.run(
          `INSERT INTO users (name, phones, country, city, instagram, telegram, email, visibility_settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.name, JSON.stringify(data.phones || []), data.country, data.city, data.instagram, data.telegram, data.email, JSON.stringify(data.visibility_settings || {})],
          function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, ...data });
          }
        );
      }
    });
  });
}

// === PETS ===

function getAllPets() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM pets ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(parsePet));
    });
  });
}

function getPet(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM pets WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row ? parsePet(row) : null);
    });
  });
}

function createPet(data) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO pets (user_id, name, species, breed, sex, birth_date, chip_number, tag_number, sterilized, color, special_marks, free_walking, address, photos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id || 1,
        data.name,
        data.species,
        data.breed || null,
        data.sex,
        data.birth_date || null,
        data.chip_number || null,
        data.tag_number || null,
        data.sterilized ? 1 : 0,
        data.color || null,
        data.special_marks || null,
        data.free_walking ? 1 : 0,
        data.address || null,
        JSON.stringify(data.photos || [])
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...data, photos: data.photos || [] });
      }
    );
  });
}

function updatePet(id, data) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE pets SET name=?, species=?, breed=?, sex=?, birth_date=?, chip_number=?, tag_number=?, sterilized=?, color=?, special_marks=?, free_walking=?, address=?, photos=? WHERE id=?`,
      [
        data.name,
        data.species,
        data.breed || null,
        data.sex,
        data.birth_date || null,
        data.chip_number || null,
        data.tag_number || null,
        data.sterilized ? 1 : 0,
        data.color || null,
        data.special_marks || null,
        data.free_walking ? 1 : 0,
        data.address || null,
        JSON.stringify(data.photos || []),
        id
      ],
      function (err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      }
    );
  });
}

function deletePet(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT photos FROM pets WHERE id = ?', [id], (err, row) => {
      if (err) { reject(err); return; }

      if (row) {
        const photos = JSON.parse(row.photos || '[]');
        photos.forEach(photoPath => {
          const fullPath = path.join(__dirname, '..', '..', 'uploads', 'pets', photoPath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
      }

      db.run('DELETE FROM pets WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else {
          // Отвязываем QR-коды удалённого питомца
          db.run('UPDATE qr_codes SET pet_id = NULL, is_bound = 0 WHERE pet_id = ?', [id]);
          resolve({ deleted: true });
        }
      });
    });
  });
}

function parsePet(row) {
  return {
    ...row,
    photos: JSON.parse(row.photos || '[]'),
    sterilized: !!row.sterilized,
    free_walking: !!row.free_walking
  };
}

// === QR CODES ===

function getQrByToken(token) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM qr_codes WHERE qr_token = ?', [token], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function createQr(token) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO qr_codes (qr_token) VALUES (?)',
      [token],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, qr_token: token, is_bound: false });
      }
    );
  });
}

function bindQr(qrId, petId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE qr_codes SET pet_id = ?, is_bound = 1 WHERE id = ?',
      [petId, qrId],
      function (err) {
        if (err) reject(err);
        else resolve({ bound: true });
      }
    );
  });
}

function getAllQrCodes() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM qr_codes ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// === SCAN LOGS ===

function logScan(qrId, petId, ip, lat, lon, userAgent) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO scan_logs (qr_id, pet_id, ip_address, latitude, longitude, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
      [qrId, petId, ip, lat || null, lon || null, userAgent || null],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

module.exports = {
  initPetGangDatabase,
  getDb,
  getUser,
  getOrCreateUser,
  getAllPets,
  getPet,
  createPet,
  updatePet,
  deletePet,
  getQrByToken,
  createQr,
  bindQr,
  getAllQrCodes,
  logScan
};
