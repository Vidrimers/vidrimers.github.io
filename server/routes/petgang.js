/**
 * API роуты Pet Gang — Паспорт питомца
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
// requireAuth импортируется для совместимости, но Pet Gang использует свою авторизацию
const petgangDb = require('../database/petgang');
const PetGangTelegram = require('../services/petgang-telegram');

const router = express.Router();

// Pet Gang авторизация — отдельный JWT-секрет
const PETGANG_JWT_SECRET = process.env.PETGANG_JWT_SECRET || 'petgang-secret-key-change-in-production';
const PETGANG_SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

// Хранилище кодов подтверждения Pet Gang
const petgangCodes = new Map();

// Multer для загрузки фото питомцев
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Допустимые форматы: JPEG, PNG, WebP'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB до сжатия
});

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'pets');

// Создаём папку если нет
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Генерация уникального токена для QR-кода
 */
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// ==================== АВТОРИЗАЦИЯ PET GANG ====================

/**
 * Middleware для проверки авторизации Pet Gang
 */
function requirePetGangAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Токен отсутствует' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, PETGANG_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
}

/**
 * POST /api/auth/request-code — запросить код подтверждения
 */
router.post('/auth/request-code', async (req, res) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    petgangCodes.set(code, { createdAt: Date.now(), expiresAt: Date.now() + 5 * 60 * 1000 });

    // Отправляем код в Telegram
    let telegramSent = false;
    try {
      const Telegram = require('../telegram');
      const tg = new Telegram();
      if (tg.isEnabled) {
        const chatId = process.env.PETGANG_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
        const message = `🔐 Код для входа в Pet Gang:\n\n` +
          `<code>${code}</code>\n\n` +
          `⏰ Код действителен 5 минут\n` +
          `🌐 Сайт: vidrimers.site/pet-gang`;
        await tg.bot.sendMessage(chatId, message, { parse_mode: 'HTML', disable_web_page_preview: true });
        telegramSent = true;
      }
    } catch (e) {
      console.error('Pet Gang Auth: Ошибка Telegram:', e.message);
    }

    res.json({
      success: true,
      data: {
        message: 'Код подтверждения отправлен',
        telegramSent,
        ...(process.env.NODE_ENV === 'development' && { code })
      }
    });
  } catch (error) {
    console.error('Pet Gang Auth: Ошибка генерации кода:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/auth/verify-code — проверить код и создать сессию
 */
router.post('/auth/verify-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Код обязателен' });
    }

    const codeData = petgangCodes.get(code);
    if (!codeData || Date.now() > codeData.expiresAt) {
      petgangCodes.delete(code);
      return res.status(400).json({ success: false, error: 'Неверный или просроченный код' });
    }

    petgangCodes.delete(code);

    // Создаём JWT сессию
    const token = jwt.sign(
      { userId: 'petgang_admin', role: 'admin', iat: Math.floor(Date.now() / 1000) },
      PETGANG_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, data: { token, expiresIn: PETGANG_SESSION_EXPIRY } });
  } catch (error) {
    console.error('Pet Gang Auth: Ошибка верификации:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/auth/logout — выход
 */
router.post('/auth/logout', requirePetGangAuth, async (req, res) => {
  res.json({ success: true, message: 'Вы вышли из системы' });
});

/**
 * GET /api/auth/check — проверка авторизации
 */
router.get('/auth/check', requirePetGangAuth, async (req, res) => {
  res.json({ success: true, data: { authorized: true, userId: req.user.userId } });
});

// ==================== ПРОФИЛЬ ====================

/**
 * GET /api/profile — получить профиль владельца
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await petgangDb.getUser(1);
    if (!user) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: {
        ...user,
        phones: JSON.parse(user.phones || '[]'),
        visibility_settings: JSON.parse(user.visibility_settings || '{}')
      }
    });
  } catch (error) {
    console.error('Pet Gang: Ошибка получения профиля:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/profile — обновить профиль владельца
 */
router.put('/profile', requirePetGangAuth, async (req, res) => {
  try {
    const { name, phones, country, city, instagram, telegram, email, visibility_settings } = req.body;
    const user = await petgangDb.getOrCreateUser({
      name, phones, country, city, instagram, telegram, email, visibility_settings
    });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Pet Gang: Ошибка обновления профиля:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ==================== ПИТОМЦЫ ====================

/**
 * GET /api/pets — список карточек (только для админа)
 */
router.get('/pets', requirePetGangAuth, async (req, res) => {
  try {
    const pets = await petgangDb.getAllPets();
    res.json({ success: true, data: pets });
  } catch (error) {
    console.error('Pet Gang: Ошибка получения питомцев:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/pets/:id — данные карточки питомца
 */
router.get('/pets/:id', async (req, res) => {
  try {
    const pet = await petgangDb.getPet(req.params.id);
    if (!pet) {
      return res.status(404).json({ success: false, error: 'Питомец не найден' });
    }

    // Получаем профиль владельца с учётом настроек видимости
    const user = await petgangDb.getUser(pet.user_id || 1);
    let ownerContact = null;
    if (user) {
      const vis = JSON.parse(user.visibility_settings || '{}');
      ownerContact = {};
      if (vis.show_name) ownerContact.name = user.name;
      if (vis.show_phones) ownerContact.phones = JSON.parse(user.phones || '[]');
      if (vis.show_instagram) ownerContact.instagram = user.instagram;
      if (vis.show_telegram) ownerContact.telegram = user.telegram;
      if (vis.show_email) ownerContact.email = user.email;
      if (vis.show_city) ownerContact.city = user.city;
    }

    res.json({ success: true, data: { pet, ownerContact } });
  } catch (error) {
    console.error('Pet Gang: Ошибка получения питомца:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/pets — создать карточку питомца
 */
router.post('/pets', requirePetGangAuth, async (req, res) => {
  try {
    const pet = await petgangDb.createPet({ ...req.body, user_id: 1 });
    res.json({ success: true, data: pet });
  } catch (error) {
    console.error('Pet Gang: Ошибка создания питомца:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/pets/:id — обновить карточку питомца
 */
router.put('/pets/:id', requirePetGangAuth, async (req, res) => {
  try {
    const existing = await petgangDb.getPet(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Питомец не найден' });
    }
    const pet = await petgangDb.updatePet(req.params.id, { ...req.body, photos: req.body.photos || existing.photos });
    res.json({ success: true, data: pet });
  } catch (error) {
    console.error('Pet Gang: Ошибка обновления питомца:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * DELETE /api/pets/:id — удалить карточку питомца
 */
router.delete('/pets/:id', requirePetGangAuth, async (req, res) => {
  try {
    await petgangDb.deletePet(req.params.id);
    res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Pet Gang: Ошибка удаления питомца:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ==================== ФОТОГРАФИИ ====================

/**
 * POST /api/pets/:id/photos — загрузить фото (max 3, max 5 МБ)
 */
router.post('/pets/:id/photos', requirePetGangAuth, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Файл слишком большой (макс 5 МБ)' : err.message;
      return res.status(400).json({ success: false, error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    try {
      const pet = await petgangDb.getPet(req.params.id);
      if (!pet) {
        return res.status(404).json({ success: false, error: 'Питомец не найден' });
      }
      if (pet.photos.length >= 3) {
        return res.status(400).json({ success: false, error: 'Максимум 3 фотографии' });
      }

      // Сжатие через sharp
      let buffer = req.file.buffer;
      let info = await sharp(buffer).metadata();

      if (info.size > 5 * 1024 * 1024 || req.file.size > 5 * 1024 * 1024) {
        // Уменьшаем качество до тех пор, пока не станет <= 5 МБ
        let quality = 80;
        while (quality > 10) {
          buffer = await sharp(req.file.buffer).jpeg({ quality }).toBuffer();
          info = await sharp(buffer).metadata();
          if (info.size <= 5 * 1024 * 1024) break;
          quality -= 10;
        }
      } else {
        buffer = await sharp(req.file.buffer).jpeg({ quality: 85 }).toBuffer();
      }

      const filename = `pet_${req.params.id}_${Date.now()}.jpg`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, buffer);

      const photos = [...pet.photos, filename];
      await petgangDb.updatePet(req.params.id, { ...pet, photos });

      res.json({ success: true, data: { filename, photos } });
    } catch (error) {
      console.error('Pet Gang: Ошибка загрузки фото:', error.message);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
});

/**
 * DELETE /api/pets/:id/photos/:photoId — удалить фото (с сервера)
 */
router.delete('/pets/:id/photos/:photoId', requirePetGangAuth, async (req, res) => {
  try {
    const pet = await petgangDb.getPet(req.params.id);
    if (!pet) {
      return res.status(404).json({ success: false, error: 'Питомец не найден' });
    }

    const photoIndex = parseInt(req.params.photoId);
    if (isNaN(photoIndex) || photoIndex < 0 || photoIndex >= pet.photos.length) {
      return res.status(400).json({ success: false, error: 'Некорректный индекс фото' });
    }

    const photoFilename = pet.photos[photoIndex];
    const filepath = path.join(UPLOADS_DIR, photoFilename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    const photos = pet.photos.filter((_, i) => i !== photoIndex);
    await petgangDb.updatePet(req.params.id, { ...pet, photos });

    res.json({ success: true, data: { photos } });
  } catch (error) {
    console.error('Pet Gang: Ошибка удаления фото:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ==================== QR-КОДЫ ====================

/**
 * POST /api/qr/generate — сгенерировать новый QR-код
 */
router.post('/qr/generate', requirePetGangAuth, async (req, res) => {
  try {
    const token = generateToken();
    const qr = await petgangDb.createQr(token);

    const baseUrl = process.env.PETGANG_SITE_URL || 'https://vidrimers.site/pet-gang';
    const qrUrl = `${baseUrl}/scan/${token}`;

    // Генерируем изображение QR-кода
    const qrImage = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 });

    res.json({
      success: true,
      data: {
        id: qr.id,
        token,
        url: qrUrl,
        qr_image: qrImage
      }
    });
  } catch (error) {
    console.error('Pet Gang: Ошибка генерации QR:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/qr/generate-batch — сгенерировать пакет QR-кодов
 */
router.post('/qr/generate-batch', requirePetGangAuth, async (req, res) => {
  try {
    const { count = 10 } = req.body;
    if (count < 1 || count > 100) {
      return res.status(400).json({ success: false, error: 'Количество от 1 до 100' });
    }

    const baseUrl = process.env.PETGANG_SITE_URL || 'https://vidrimers.site/pet-gang';
    const results = [];

    for (let i = 0; i < count; i++) {
      const token = generateToken();
      const qr = await petgangDb.createQr(token);
      const qrUrl = `${baseUrl}/scan/${token}`;
      const qrImage = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 });
      results.push({ id: qr.id, token, url: qrUrl, qr_image: qrImage });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Pet Gang: Ошибка пакетной генерации QR:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/qr/:token — данные по QR (для сканирования)
 */
router.get('/qr/:token', async (req, res) => {
  try {
    const qr = await petgangDb.getQrByToken(req.params.token);
    if (!qr) {
      return res.status(404).json({ success: false, error: 'QR-код не найден' });
    }

    if (qr.is_bound && qr.pet_id) {
      const pet = await petgangDb.getPet(qr.pet_id);
      const user = await petgangDb.getUser(pet?.user_id || 1);
      let ownerContact = null;
      if (user) {
        const vis = JSON.parse(user.visibility_settings || '{}');
        ownerContact = {};
        if (vis.show_name) ownerContact.name = user.name;
        if (vis.show_phones) ownerContact.phones = JSON.parse(user.phones || '[]');
        if (vis.show_instagram) ownerContact.instagram = user.instagram;
        if (vis.show_telegram) ownerContact.telegram = user.telegram;
        if (vis.show_email) ownerContact.email = user.email;
        if (vis.show_city) ownerContact.city = user.city;
      }
      return res.json({ success: true, data: { bound: true, pet, ownerContact } });
    }

    res.json({ success: true, data: { bound: false, qr_id: qr.id } });
  } catch (error) {
    console.error('Pet Gang: Ошибка получения QR:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/qr/bind — привязать QR к карточке
 */
router.post('/qr/bind', requirePetGangAuth, async (req, res) => {
  try {
    const { qr_id, pet_id } = req.body;
    if (!qr_id || !pet_id) {
      return res.status(400).json({ success: false, error: 'qr_id и pet_id обязательны' });
    }
    await petgangDb.bindQr(qr_id, pet_id);
    res.json({ success: true, bound: true });
  } catch (error) {
    console.error('Pet Gang: Ошибка привязки QR:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/qr/pet/:petId — получить QR-код питомца
 */
router.get('/qr/pet/:petId', requirePetGangAuth, async (req, res) => {
  try {
    const db = petgangDb.getDb();
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM qr_codes WHERE pet_id = ? AND is_bound = 1', [req.params.petId], (err, row) => {
        err ? reject(err) : resolve(row);
      });
    });

    if (!row) {
      return res.json({ success: true, data: null });
    }

    const baseUrl = process.env.PETGANG_SITE_URL || 'https://vidrimers.site/pet-gang';
    const qrUrl = `${baseUrl}/scan/${row.qr_token}`;
    const qrImage = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 });

    res.json({
      success: true,
      data: { id: row.id, token: row.qr_token, url: qrUrl, qr_image: qrImage }
    });
  } catch (error) {
    console.error('Pet Gang: Ошибка получения QR:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/qr — список всех QR-кодов (для админа)
 */
router.get('/qr', requirePetGangAuth, async (req, res) => {
  try {
    const qrs = await petgangDb.getAllQrCodes();
    res.json({ success: true, data: qrs });
  } catch (error) {
    console.error('Pet Gang: Ошибка получения QR:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ==================== СКАНИРОВАНИЕ ====================

/**
 * POST /api/scan — лог сканирования + уведомление в Telegram
 */
router.post('/scan', async (req, res) => {
  try {
    const { qr_token, latitude, longitude } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const qr = await petgangDb.getQrByToken(qr_token);
    if (!qr) {
      return res.status(404).json({ success: false, error: 'QR-код не найден' });
    }

    // Логируем сканирование
    await petgangDb.logScan(qr.id, qr.pet_id, ip, latitude, longitude, userAgent);

    // Отправляем уведомление в Telegram
    if (qr.is_bound && qr.pet_id) {
      const pet = await petgangDb.getPet(qr.pet_id);
      if (pet) {
        const now = new Date();
        const dateTime = now.toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        const telegramService = new PetGangTelegram(
          require('../telegram')?.isEnabled ? { isEnabled: true, bot: require('../telegram') } : null
        );

        // Попробуем использовать глобальный экземпляр Telegram
        try {
          const Telegram = require('../telegram');
          const tgInstance = new Telegram();
          if (tgInstance.isEnabled) {
            const chatId = process.env.PETGANG_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
            const geoText = (latitude && longitude)
              ? `GPS координаты: ${latitude}, ${longitude}`
              : 'GPS координаты: не предоставлены';

            const message =
              `‼️ Паспорт питомца «${pet.name}» был отсканирован.\n` +
              `Дата и время: ${dateTime}\n` +
              `${geoText}\n` +
              `IP адрес: ${ip}`;

            await tgInstance.bot.sendMessage(chatId, message);

            if (latitude && longitude) {
              await tgInstance.bot.sendLocation(chatId, latitude, longitude);
            }
          }
        } catch (tgErr) {
          console.error('Pet Gang: Ошибка Telegram:', tgErr.message);
        }
      }
    }

    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Pet Gang: Ошибка сканирования:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ==================== СТАТИСТИКА ====================

/**
 * GET /api/stats — статистика (для админа)
 */
router.get('/stats', requirePetGangAuth, async (req, res) => {
  try {
    const db = petgangDb.getDb();
    const [totalQr, boundQr, totalPets, totalScans] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM qr_codes', [], (err, row) => {
          err ? reject(err) : resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM qr_codes WHERE is_bound = 1', [], (err, row) => {
          err ? reject(err) : resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM pets', [], (err, row) => {
          err ? reject(err) : resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM scan_logs', [], (err, row) => {
          err ? reject(err) : resolve(row.count);
        });
      })
    ]);

    res.json({
      success: true,
      data: {
        total_qr: totalQr,
        bound_qr: boundQr,
        unbound_qr: totalQr - boundQr,
        total_pets: totalPets,
        total_scans: totalScans
      }
    });
  } catch (error) {
    console.error('Pet Gang: Ошибка статистики:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
