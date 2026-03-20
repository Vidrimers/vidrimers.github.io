/**
 * FileManager сервис для управления загруженными файлами
 * Requirements: 9.1, 9.3, 9.5, 9.6
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Корневая папка для загрузок
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Разрешённые MIME-типы
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

// Разрешённые расширения файлов
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

// Максимальный размер файла (5 MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

class FileService {
  constructor() {
    this._ensureUploadsDir();
  }

  /**
   * Создаёт корневую папку uploads если её нет
   */
  _ensureUploadsDir() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  /**
   * Создаёт папку категории если её нет
   * @param {string} category
   * @returns {string} Абсолютный путь к папке категории
   */
  _ensureCategoryDir(category) {
    const categoryDir = path.join(UPLOADS_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    return categoryDir;
  }

  /**
   * Валидирует безопасность файла
   * @param {{ mimetype: string, size: number, originalname: string }} fileInfo
   * @returns {{ valid: boolean, error?: string }}
   */
  validateFile(fileInfo) {
    const { mimetype, size, originalname } = fileInfo;

    // Проверка MIME-типа
    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      return {
        valid: false,
        error: `Неподдерживаемый тип файла: ${mimetype}. Разрешены только изображения: JPG, PNG, WebP, GIF, SVG`,
      };
    }

    // Проверка расширения файла
    const ext = path.extname(originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Недопустимое расширение файла: ${ext}`,
      };
    }

    // Проверка размера файла
    if (size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Размер файла (${Math.round(size / 1024 / 1024 * 10) / 10} MB) превышает максимально допустимый (5 MB)`,
      };
    }

    // Проверка безопасности имени файла (path traversal)
    const basename = path.basename(originalname);
    if (basename !== originalname || originalname.includes('..') || originalname.includes('/') || originalname.includes('\\')) {
      return {
        valid: false,
        error: 'Недопустимое имя файла',
      };
    }

    return { valid: true };
  }

  /**
   * Генерирует уникальное имя файла
   * @param {string} originalname - Оригинальное имя файла
   * @returns {string} Уникальное имя файла
   */
  generateUniqueFilename(originalname) {
    const ext = path.extname(originalname).toLowerCase();
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${randomHex}${ext}`;
  }

  /**
   * Возвращает веб-путь к файлу
   * @param {string} category
   * @param {string} filename
   * @returns {string}
   */
  getWebPath(category, filename) {
    return `/uploads/${category}/${filename}`;
  }

  /**
   * Возвращает абсолютный путь к файлу
   * @param {string} category
   * @param {string} filename
   * @returns {string}
   */
  getAbsolutePath(category, filename) {
    return path.join(UPLOADS_DIR, category, filename);
  }

  /**
   * Проверяет существование файла
   * @param {string} category
   * @param {string} filename
   * @returns {boolean}
   */
  fileExists(category, filename) {
    return fs.existsSync(this.getAbsolutePath(category, filename));
  }

  /**
   * Удаляет файл по категории и имени
   * @param {string} category
   * @param {string} filename
   * @returns {{ success: boolean, error?: string }}
   */
  deleteFile(category, filename) {
    // Защита от path traversal
    if (
      !category || !filename ||
      category.includes('..') || filename.includes('..') ||
      category.includes('/') || filename.includes('/')
    ) {
      return { success: false, error: 'Недопустимый путь к файлу' };
    }

    const filePath = this.getAbsolutePath(category, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Файл не найден' };
    }

    try {
      fs.unlinkSync(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: `Ошибка удаления файла: ${err.message}` };
    }
  }

  /**
   * Удаляет файл по веб-пути вида /uploads/category/filename
   * @param {string} webPath
   * @returns {{ success: boolean, error?: string }}
   */
  deleteFileByWebPath(webPath) {
    if (!webPath || !webPath.startsWith('/uploads/')) {
      return { success: false, error: 'Некорректный веб-путь к файлу' };
    }

    // Извлекаем category/filename из пути
    const relative = webPath.replace('/uploads/', '');
    const parts = relative.split('/');

    if (parts.length !== 2) {
      return { success: false, error: 'Некорректная структура пути к файлу' };
    }

    const [category, filename] = parts;
    return this.deleteFile(category, filename);
  }

  /**
   * Возвращает список файлов в категории
   * @param {string} category
   * @returns {Array<{ filename: string, path: string, size: number, created: Date, modified: Date }>}
   */
  listFiles(category) {
    if (!category || category.includes('..')) {
      return [];
    }

    const categoryDir = path.join(UPLOADS_DIR, category);

    if (!fs.existsSync(categoryDir)) {
      return [];
    }

    return fs.readdirSync(categoryDir)
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
          modified: stats.mtime,
        };
      })
      .sort((a, b) => b.created - a.created);
  }

  /**
   * Собирает все веб-пути файлов из всех категорий
   * @returns {Set<string>}
   */
  getAllUploadedFilePaths() {
    const result = new Set();

    if (!fs.existsSync(UPLOADS_DIR)) return result;

    const categories = fs.readdirSync(UPLOADS_DIR).filter(entry => {
      return fs.statSync(path.join(UPLOADS_DIR, entry)).isDirectory();
    });

    for (const category of categories) {
      const files = this.listFiles(category);
      for (const file of files) {
        result.add(file.path);
      }
    }

    return result;
  }

  /**
   * Удаляет файлы, которые не используются ни в одной записи БД
   * @param {Set<string>} usedPaths - Множество веб-путей, которые используются в БД
   * @returns {{ deleted: string[], errors: string[] }}
   */
  cleanupOrphanedFiles(usedPaths) {
    const allPaths = this.getAllUploadedFilePaths();
    const deleted = [];
    const errors = [];

    for (const webPath of allPaths) {
      if (!usedPaths.has(webPath)) {
        const result = this.deleteFileByWebPath(webPath);
        if (result.success) {
          deleted.push(webPath);
        } else {
          errors.push(`${webPath}: ${result.error}`);
        }
      }
    }

    return { deleted, errors };
  }

  /**
   * Удаляет пустые папки категорий
   */
  cleanupEmptyDirs() {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    const categories = fs.readdirSync(UPLOADS_DIR).filter(entry => {
      return fs.statSync(path.join(UPLOADS_DIR, entry)).isDirectory();
    });

    for (const category of categories) {
      const categoryDir = path.join(UPLOADS_DIR, category);
      const files = fs.readdirSync(categoryDir);
      if (files.length === 0) {
        try {
          fs.rmdirSync(categoryDir);
        } catch (_) {
          // Игнорируем ошибки удаления пустых папок
        }
      }
    }
  }
}

// Синглтон
let instance = null;

function getFileService() {
  if (!instance) {
    instance = new FileService();
  }
  return instance;
}

module.exports = FileService;
module.exports.getFileService = getFileService;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
module.exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
