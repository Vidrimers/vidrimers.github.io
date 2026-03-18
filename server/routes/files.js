/**
 * Роуты для управления файлами
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { requireAuth } = require('../middleware/auth');
const { getDbService, getTelegramService } = require('../services');

const router = express.Router();

// Создаем папку uploads если её нет
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'general';
    const categoryDir = path.join(uploadsDir, category);
    
    // Создаем папку категории если её нет
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    cb(null, categoryDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}-${randomString}${extension}`;
    
    cb(null, filename);
  }
});

// Фильтр для проверки типов файлов
const fileFilter = (req, file, cb) => {
  // Разрешенные MIME типы
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла. Разрешены только изображения: JPG, PNG, WebP, GIF, SVG'), false);
  }
};

// Настройка multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Только один файл за раз
  }
});

/**
 * POST /api/files/upload
 * Загружает изображение (только для админа)
 */
router.post('/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Ошибка загрузки файла:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Размер файла не должен превышать 5MB'
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'Ошибка загрузки файла'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Файл не был загружен'
        },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const dbService = getDbService();
      const telegramService = getTelegramService();
      
      const originalPath = req.file.path;
      const category = req.body.category || 'general';
      let finalPath = originalPath;
      let finalFilename = req.file.filename;
      
      // Проверяем, является ли файл SVG
      const isSvg = req.file.mimetype === 'image/svg+xml';
      
      if (!isSvg) {
        // Оптимизируем изображение с помощью Sharp (только для растровых изображений)
        const optimizedFilename = `optimized-${req.file.filename}`;
        const optimizedPath = path.join(path.dirname(originalPath), optimizedFilename);
        
        await sharp(originalPath)
          .resize(1200, 800, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 85,
            progressive: true 
          })
          .toFile(optimizedPath);

        // Удаляем оригинальный файл
        fs.unlinkSync(originalPath);
        
        finalPath = optimizedPath;
        finalFilename = optimizedFilename;
      }
      // Для SVG файлов оставляем как есть

      // Формируем путь для веба (относительно public)
      const webPath = `/uploads/${category}/${finalFilename}`;

      // Логируем активность
      await dbService.logActivity(
        req.user.userId,
        'UPLOAD_FILE',
        'file',
        finalFilename,
        { 
          originalName: req.file.originalname,
          category: category,
          size: req.file.size,
          webPath: webPath,
          isSvg: isSvg
        },
        req.ip,
        req.get('User-Agent')
      );

      // Отправляем уведомление в Telegram
      if (telegramService) {
        await telegramService.sendActivityNotification('Загружен файл', {
          entityType: 'Файл',
          entityId: finalFilename,
          title: req.file.originalname
        });
      }

      res.json({
        success: true,
        data: {
          filename: finalFilename,
          originalName: req.file.originalname,
          path: webPath,
          size: req.file.size,
          category: category,
          isSvg: isSvg
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Ошибка обработки файла:', error);
      
      // Удаляем файл при ошибке
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'FILE_PROCESSING_ERROR',
          message: 'Ошибка обработки файла'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
});

/**
 * DELETE /api/files/:filename
 * Удаляет файл (только для админа)
 */
router.delete('/:category/:filename', requireAuth, async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    // Валидация параметров
    if (!category || !filename) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Не указана категория или имя файла'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Проверяем безопасность пути
    if (category.includes('..') || filename.includes('..')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Недопустимый путь к файлу'
        },
        timestamp: new Date().toISOString()
      });
    }

    const filePath = path.join(uploadsDir, category, filename);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Файл не найден'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Удаляем файл
    fs.unlinkSync(filePath);

    const dbService = getDbService();
    const telegramService = getTelegramService();

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'DELETE_FILE',
      'file',
      filename,
      { category: category },
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Удален файл', {
        entityType: 'Файл',
        entityId: filename,
        title: filename
      });
    }

    res.json({
      success: true,
      data: { message: 'Файл успешно удален' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_DELETE_ERROR',
        message: 'Ошибка удаления файла'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/files/:category
 * Получает список файлов в категории (только для админа)
 */
router.get('/:category', requireAuth, async (req, res) => {
  try {
    const { category } = req.params;
    
    // Валидация категории
    if (!category || category.includes('..')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: 'Недопустимая категория'
        },
        timestamp: new Date().toISOString()
      });
    }

    const categoryDir = path.join(uploadsDir, category);

    // Проверяем существование папки
    if (!fs.existsSync(categoryDir)) {
      return res.json({
        success: true,
        data: [],
        timestamp: new Date().toISOString()
      });
    }

    // Читаем файлы в папке
    const files = fs.readdirSync(categoryDir)
      .filter(file => {
        const filePath = path.join(categoryDir, file);
        return fs.statSync(filePath).isFile();
      })
      .map(file => {
        const filePath = path.join(categoryDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          path: `/uploads/${category}/${file}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created)); // Сортируем по дате создания

    res.json({
      success: true,
      data: files,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILES_LIST_ERROR',
        message: 'Ошибка получения списка файлов'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;