/**
 * Роуты для управления файлами
 * Requirements: 9.1, 9.3, 9.5, 9.6
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { requireAuth } = require('../middleware/auth');
const { getDbService, getTelegramService, getFileService } = require('../services');

const router = express.Router();

// Настройка multer — используем memoryStorage, чтобы FileService управлял путями
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const fileService = getFileService();
    const validation = fileService.validateFile({
      mimetype: file.mimetype,
      size: 0, // размер проверим после загрузки в память
      originalname: file.originalname,
    });

    if (!validation.valid) {
      return cb(new Error(validation.error), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

/**
 * POST /api/files/upload
 * Загружает изображение (только для админа)
 */
router.post('/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Размер файла не должен превышать 5MB' },
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message || 'Ошибка загрузки файла' },
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Файл не был загружен' },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const fileService = getFileService();
      const dbService = getDbService();
      const telegramService = getTelegramService();

      const category = req.query.category || req.body.category || 'general';
      const isSvg = req.file.mimetype === 'image/svg+xml';

      // Финальная проверка размера (multer уже ограничивает, но на всякий случай)
      const validation = fileService.validateFile({
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname,
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: validation.error },
          timestamp: new Date().toISOString(),
        });
      }

      // Генерируем уникальное имя файла
      const filename = fileService.generateUniqueFilename(req.file.originalname);
      const categoryDir = path.join(require('../services/fileService').UPLOADS_DIR, category);

      // Создаём папку категории если нет
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      const finalFilename = isSvg ? filename : `optimized-${filename}`;
      const finalPath = path.join(categoryDir, finalFilename);

      if (isSvg) {
        // SVG сохраняем как есть
        fs.writeFileSync(finalPath, req.file.buffer);
      } else {
        // Оптимизируем растровые изображения через Sharp
        await sharp(req.file.buffer)
          .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toFile(finalPath);
      }

      const webPath = fileService.getWebPath(category, finalFilename);

      // Логируем активность
      await dbService.logActivity(
        req.user.userId,
        'UPLOAD_FILE',
        'file',
        finalFilename,
        { originalName: req.file.originalname, category, size: req.file.size, webPath, isSvg },
        req.ip,
        req.get('User-Agent')
      );

      if (telegramService) {
        await telegramService.sendActivityNotification('Загружен файл', {
          entityType: 'Файл',
          entityId: finalFilename,
          title: req.file.originalname,
        });
      }

      res.json({
        success: true,
        data: {
          filename: finalFilename,
          originalName: req.file.originalname,
          path: webPath,
          size: req.file.size,
          category,
          isSvg,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Ошибка обработки файла:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FILE_PROCESSING_ERROR', message: 'Ошибка обработки файла' },
        timestamp: new Date().toISOString(),
      });
    }
  });
});

/**
 * DELETE /api/files/:category/:filename
 * Удаляет файл (только для админа)
 */
router.delete('/:category/:filename', requireAuth, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const fileService = getFileService();

    const result = fileService.deleteFile(category, filename);

    if (!result.success) {
      const statusCode = result.error === 'Файл не найден' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: { code: 'FILE_DELETE_ERROR', message: result.error },
        timestamp: new Date().toISOString(),
      });
    }

    const dbService = getDbService();
    const telegramService = getTelegramService();

    await dbService.logActivity(
      req.user.userId,
      'DELETE_FILE',
      'file',
      filename,
      { category },
      req.ip,
      req.get('User-Agent')
    );

    if (telegramService) {
      await telegramService.sendActivityNotification('Удален файл', {
        entityType: 'Файл',
        entityId: filename,
        title: filename,
      });
    }

    res.json({
      success: true,
      data: { message: 'Файл успешно удален' },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FILE_DELETE_ERROR', message: 'Ошибка удаления файла' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/files/:category
 * Получает список файлов в категории (только для админа)
 */
router.get('/:category', requireAuth, (req, res) => {
  try {
    const { category } = req.params;

    if (!category || category.includes('..')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Недопустимая категория' },
        timestamp: new Date().toISOString(),
      });
    }

    const fileService = getFileService();
    const files = fileService.listFiles(category);

    res.json({
      success: true,
      data: files,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FILES_LIST_ERROR', message: 'Ошибка получения списка файлов' },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/files/cleanup
 * Запускает очистку неиспользуемых файлов (только для админа)
 */
router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const fileService = getFileService();

    // Собираем все пути к файлам, которые используются в БД
    const usedPaths = new Set();

    const [projects, skills, certificates] = await Promise.all([
      dbService.getAll('SELECT image_path FROM projects WHERE image_path IS NOT NULL'),
      dbService.getAll('SELECT icon_path FROM skills WHERE icon_path IS NOT NULL'),
      dbService.getAll('SELECT image_path FROM certificates WHERE image_path IS NOT NULL'),
    ]);

    for (const row of projects) usedPaths.add(row.image_path);
    for (const row of skills) usedPaths.add(row.icon_path);
    for (const row of certificates) usedPaths.add(row.image_path);

    const result = fileService.cleanupOrphanedFiles(usedPaths);
    fileService.cleanupEmptyDirs();

    await dbService.logActivity(
      req.user.userId,
      'CLEANUP_FILES',
      'file',
      null,
      { deleted: result.deleted.length, errors: result.errors.length },
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      data: {
        deleted: result.deleted,
        errors: result.errors,
        message: `Удалено ${result.deleted.length} неиспользуемых файлов`,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Ошибка очистки файлов:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CLEANUP_ERROR', message: 'Ошибка очистки файлов' },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
