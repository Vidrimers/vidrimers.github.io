/**
 * API маршруты для управления Hero-секцией
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { getDbService, getFileService } = require('../services');

const router = express.Router();

// Папка для hero-изображений
const HERO_UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'hero');

// Настройка multer
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Разрешены только изображения: JPG, PNG, WebP, GIF'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Создаём папку uploads/hero если её нет
if (!fs.existsSync(HERO_UPLOADS_DIR)) {
  fs.mkdirSync(HERO_UPLOADS_DIR, { recursive: true });
}

/**
 * GET /api/hero — Получить данные Hero (публичный)
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();

    const heroContent = await dbService.getQuery('SELECT * FROM hero_content WHERE id = 1');

    if (!heroContent) {
      // Если нет в БД — возвращаем дефолтные значения из JSON-переводов
      return res.json({
        success: true,
        data: {
          titleRu: 'Ярослав Ширяков',
          titleEn: 'Yaroslav Shiryakov',
          subtitleRu: 'Frontend разработчик',
          subtitleEn: 'Frontend Developer',
          languages: [
            { code: 'ru', labelRu: 'РУС', labelEn: 'RUS', enabled: true },
            { code: 'en', labelRu: 'АНГ', labelEn: 'ENG', enabled: true },
          ],
          currentPhoto: null,
          allImages: [],
        },
      });
    }

    // Парсим языки
    let languages;
    try {
      languages = JSON.parse(heroContent.languages_json);
    } catch {
      languages = [
        { code: 'ru', labelRu: 'РУС', labelEn: 'RUS', enabled: true },
        { code: 'en', labelRu: 'АНГ', labelEn: 'ENG', enabled: true },
      ];
    }

    // Получаем текущее фото
    let currentPhoto = null;
    if (heroContent.current_photo_id) {
      currentPhoto = await dbService.getQuery(
        'SELECT * FROM hero_images WHERE id = ?',
        [heroContent.current_photo_id]
      );
    }

    // Получаем все изображения
    const allImages = await dbService.getAll(
      'SELECT * FROM hero_images ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: {
        titleRu: heroContent.title_ru,
        titleEn: heroContent.title_en,
        subtitleRu: heroContent.subtitle_ru,
        subtitleEn: heroContent.subtitle_en,
        languages,
        currentPhoto,
        allImages,
        updatedAt: heroContent.updated_at,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении Hero контента:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HERO_FETCH_ERROR',
        message: 'Ошибка при получении Hero контента',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/hero — Обновить текстовые данные Hero (только для авторизованных)
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const { titleRu, titleEn, subtitleRu, subtitleEn, languages } = req.body;

    // Валидация
    if (!titleRu || typeof titleRu !== 'string' || !titleRu.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Заголовок на русском обязателен' },
      });
    }
    if (!subtitleRu || typeof subtitleRu !== 'string' || !subtitleRu.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Подзаголовок на русском обязателен' },
      });
    }

    // Валидация языков
    let languagesJson;
    if (languages && Array.isArray(languages)) {
      // Проверяем что есть хотя бы один язык
      const enabledLangs = languages.filter(l => l.enabled);
      if (enabledLangs.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Должен быть включён хотя бы один язык' },
        });
      }
      languagesJson = JSON.stringify(languages);
    }

    const dbService = getDbService();

    // Проверяем существование записи
    const existing = await dbService.getQuery('SELECT id FROM hero_content WHERE id = 1');

    if (existing) {
      const fields = ['title_ru = ?', 'title_en = ?', 'subtitle_ru = ?', 'subtitle_en = ?'];
      const params = [titleRu.trim(), (titleEn || '').trim(), subtitleRu.trim(), (subtitleEn || '').trim()];

      if (languagesJson) {
        fields.push('languages_json = ?');
        params.push(languagesJson);
      }

      params.push(1); // WHERE id = 1

      await dbService.runQuery(
        `UPDATE hero_content SET ${fields.join(', ')} WHERE id = ?`,
        params
      );
    } else {
      await dbService.runQuery(
        `INSERT INTO hero_content (id, title_ru, title_en, subtitle_ru, subtitle_en, languages_json)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [
          titleRu.trim(),
          (titleEn || '').trim(),
          subtitleRu.trim(),
          (subtitleEn || '').trim(),
          languagesJson || JSON.stringify([
            { code: 'ru', labelRu: 'РУС', labelEn: 'RUS', enabled: true },
            { code: 'en', labelRu: 'АНГ', labelEn: 'ENG', enabled: true },
          ]),
        ]
      );
    }

    // Возвращаем обновлённые данные
    const updated = await dbService.getQuery('SELECT * FROM hero_content WHERE id = 1');
    let languagesParsed;
    try {
      languagesParsed = JSON.parse(updated.languages_json);
    } catch {
      languagesParsed = [];
    }

    res.json({
      success: true,
      data: {
        titleRu: updated.title_ru,
        titleEn: updated.title_en,
        subtitleRu: updated.subtitle_ru,
        subtitleEn: updated.subtitle_en,
        languages: languagesParsed,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Ошибка при обновлении Hero контента:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HERO_UPDATE_ERROR',
        message: 'Ошибка при обновлении Hero контента',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/hero/upload — Загрузить изображение Hero (только для авторизованных)
 */
router.post('/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Размер файла не должен превышать 10MB' },
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message || 'Ошибка загрузки файла' },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Файл не был загружен' },
      });
    }

    try {
      const fileService = getFileService();
      const dbService = getDbService();

      // Валидация
      const validation = fileService.validateFile({
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: validation.error },
        });
      }

      // Проверка magic bytes
      const bufferValidation = fileService.validateFileBuffer(req.file.buffer, req.file.mimetype);
      if (!bufferValidation.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FILE_CONTENT', message: bufferValidation.error },
        });
      }

      // Проверка дубликата имени
      const existingByName = await dbService.getQuery(
        'SELECT id FROM hero_images WHERE original_name = ?',
        [req.file.originalname]
      );
      if (existingByName) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_NAME', message: 'Изображение с таким именем уже существует' },
        });
      }

      // Генерируем уникальное имя
      const filename = fileService.generateUniqueFilename(req.file.originalname);
      const filePath = path.join(HERO_UPLOADS_DIR, filename);

      // Сохраняем файл
      fs.writeFileSync(filePath, req.file.buffer);

      // Получаем размеры изображения (без sharp — через buffer size)
      let width = null;
      let height = null;
      try {
        const sharp = require('sharp');
        const metadata = await sharp(req.file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch {
        // sharp недоступен — размеры не определяем
      }

      // Записываем в БД
      const result = await dbService.runQuery(
        `INSERT INTO hero_images (filename, original_name, size, width, height)
         VALUES (?, ?, ?, ?, ?)`,
        [filename, req.file.originalname, req.file.size, width, height]
      );

      const newImage = await dbService.getQuery(
        'SELECT * FROM hero_images WHERE id = ?',
        [result.lastID]
      );

      res.json({
        success: true,
        data: newImage,
      });
    } catch (error) {
      console.error('Ошибка при загрузке Hero изображения:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HERO_UPLOAD_ERROR',
          message: 'Ошибка при загрузке изображения',
          details: error.message,
        },
      });
    }
  });
});

/**
 * PUT /api/hero/photo/:id — Установить текущее изображение Hero (только для авторизованных)
 */
router.put('/photo/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const dbService = getDbService();

    // Проверяем существование изображения
    const image = await dbService.getQuery('SELECT * FROM hero_images WHERE id = ?', [id]);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Изображение не найдено' },
      });
    }

    // Обновляем текущее фото
    const existing = await dbService.getQuery('SELECT id FROM hero_content WHERE id = 1');
    if (existing) {
      await dbService.runQuery(
        'UPDATE hero_content SET current_photo_id = ? WHERE id = 1',
        [id]
      );
    } else {
      await dbService.runQuery(
        `INSERT INTO hero_content (id, title_ru, title_en, subtitle_ru, subtitle_en, current_photo_id)
         VALUES (1, '', '', '', '', ?)`,
        [id]
      );
    }

    res.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error('Ошибка при установке Hero фото:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HERO_PHOTO_UPDATE_ERROR',
        message: 'Ошибка при установке фото',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/hero/photo/:id/crops — Обновить crop-настройки изображения (только для авторизованных)
 */
router.put('/photo/:id/crops', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { crops } = req.body;
    const dbService = getDbService();

    const image = await dbService.getQuery('SELECT * FROM hero_images WHERE id = ?', [id]);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Изображение не найдено' },
      });
    }

    await dbService.runQuery(
      'UPDATE hero_images SET responsive_crops_json = ? WHERE id = ?',
      [JSON.stringify(crops), id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при обновлении crop-настроек:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HERO_CROPS_UPDATE_ERROR',
        message: 'Ошибка при обновлении crop-настроек',
        details: error.message,
      },
    });
  }
});

/**
 * DELETE /api/hero/images/:id — Удалить изображение Hero (только для авторизованных)
 */
router.delete('/images/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const dbService = getDbService();

    // Получаем изображение
    const image = await dbService.getQuery('SELECT * FROM hero_images WHERE id = ?', [id]);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: { code: 'IMAGE_NOT_FOUND', message: 'Изображение не найдено' },
      });
    }

    // Удаляем файл с диска
    const filePath = path.join(HERO_UPLOADS_DIR, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Сбрасываем current_photo_id если это было текущее фото
    const heroContent = await dbService.getQuery('SELECT current_photo_id FROM hero_content WHERE id = 1');
    if (heroContent && heroContent.current_photo_id === parseInt(id)) {
      await dbService.runQuery(
        'UPDATE hero_content SET current_photo_id = NULL WHERE id = 1'
      );
    }

    // Удаляем запись из БД
    await dbService.runQuery('DELETE FROM hero_images WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении Hero изображения:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HERO_DELETE_ERROR',
        message: 'Ошибка при удалении изображения',
        details: error.message,
      },
    });
  }
});

module.exports = router;
