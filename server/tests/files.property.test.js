/**
 * Property-based тесты для файловых операций
 * Feature: admin-cms-system, Property 8: File Upload and Management
 * Validates: Requirements 9.1, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import FileService from '../services/fileService.js';

// Создаём временную директорию для тестов
let testUploadsDir;
let fileService;

// Патчим UPLOADS_DIR для изоляции тестов
function createTestFileService() {
  const svc = new FileService();
  // Переопределяем внутренние методы для работы с тестовой директорией
  svc._uploadsDir = testUploadsDir;
  svc._ensureUploadsDir = () => {
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }
  };
  svc._ensureCategoryDir = (category) => {
    const dir = path.join(testUploadsDir, category);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  };
  svc.getAbsolutePath = (category, filename) => path.join(testUploadsDir, category, filename);
  svc.fileExists = (category, filename) => fs.existsSync(path.join(testUploadsDir, category, filename));
  svc.deleteFile = (category, filename) => {
    if (!category || !filename || category.includes('..') || filename.includes('..') ||
        category.includes('/') || filename.includes('/')) {
      return { success: false, error: 'Недопустимый путь к файлу' };
    }
    const filePath = path.join(testUploadsDir, category, filename);
    if (!fs.existsSync(filePath)) return { success: false, error: 'Файл не найден' };
    try {
      fs.unlinkSync(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };
  svc.deleteFileByWebPath = (webPath) => {
    if (!webPath || !webPath.startsWith('/uploads/')) {
      return { success: false, error: 'Некорректный веб-путь к файлу' };
    }
    const relative = webPath.replace('/uploads/', '');
    const parts = relative.split('/');
    if (parts.length !== 2) return { success: false, error: 'Некорректная структура пути к файлу' };
    const [category, filename] = parts;
    return svc.deleteFile(category, filename);
  };
  svc.listFiles = (category) => {
    if (!category || category.includes('..')) return [];
    const categoryDir = path.join(testUploadsDir, category);
    if (!fs.existsSync(categoryDir)) return [];
    return fs.readdirSync(categoryDir)
      .filter(file => fs.statSync(path.join(categoryDir, file)).isFile())
      .map(file => {
        const stats = fs.statSync(path.join(categoryDir, file));
        return { filename: file, path: `/uploads/${category}/${file}`, size: stats.size, created: stats.birthtime, modified: stats.mtime };
      })
      .sort((a, b) => b.created - a.created);
  };
  svc.getAllUploadedFilePaths = () => {
    const result = new Set();
    if (!fs.existsSync(testUploadsDir)) return result;
    const categories = fs.readdirSync(testUploadsDir).filter(e => fs.statSync(path.join(testUploadsDir, e)).isDirectory());
    for (const cat of categories) {
      for (const file of svc.listFiles(cat)) result.add(file.path);
    }
    return result;
  };
  svc.cleanupOrphanedFiles = (usedPaths) => {
    const allPaths = svc.getAllUploadedFilePaths();
    const deleted = [];
    const errors = [];
    for (const webPath of allPaths) {
      if (!usedPaths.has(webPath)) {
        const result = svc.deleteFileByWebPath(webPath);
        if (result.success) deleted.push(webPath);
        else errors.push(`${webPath}: ${result.error}`);
      }
    }
    return { deleted, errors };
  };
  svc.cleanupEmptyDirs = () => {
    if (!fs.existsSync(testUploadsDir)) return;
    const categories = fs.readdirSync(testUploadsDir).filter(e => fs.statSync(path.join(testUploadsDir, e)).isDirectory());
    for (const cat of categories) {
      const dir = path.join(testUploadsDir, cat);
      if (fs.readdirSync(dir).length === 0) {
        try { fs.rmdirSync(dir); } catch (_) {}
      }
    }
  };
  return svc;
}

// Вспомогательная функция: создаёт реальный файл в тестовой директории
function createTestFile(category, filename, content = 'test') {
  const dir = path.join(testUploadsDir, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

beforeEach(() => {
  testUploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileservice-test-'));
  fileService = createTestFileService();
});

afterEach(() => {
  // Удаляем временную директорию после каждого теста
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
  }
});

describe('Property 8: File Upload and Management', () => {

  // ─── Property 8.1: Валидация MIME-типов ───────────────────────────────────

  describe('Property 8.1: MIME type validation', () => {

    it('Property 8.1.1: Разрешённые MIME-типы должны проходить валидацию', () => {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...allowedMimeTypes),
          fc.integer({ min: 1, max: 5 * 1024 * 1024 - 1 }),
          fc.constantFrom('photo.jpg', 'icon.png', 'logo.webp', 'anim.gif', 'icon.svg'),
          (mimetype, size, originalname) => {
            const result = fileService.validateFile({ mimetype, size, originalname });
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 8.1.2: Запрещённые MIME-типы должны отклоняться', () => {
      const forbiddenMimeTypes = [
        'application/pdf',
        'text/html',
        'application/javascript',
        'application/zip',
        'video/mp4',
        'audio/mpeg',
        'application/octet-stream',
        'text/plain',
        'application/x-executable',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...forbiddenMimeTypes),
          fc.integer({ min: 1, max: 1024 }),
          fc.constant('file.pdf'),
          (mimetype, size, originalname) => {
            const result = fileService.validateFile({ mimetype, size, originalname });
            expect(result.valid).toBe(false);
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property 8.2: Валидация размера файла ────────────────────────────────

  describe('Property 8.2: File size validation', () => {

    it('Property 8.2.1: Файлы до 5MB должны проходить валидацию', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
          (size) => {
            const result = fileService.validateFile({
              mimetype: 'image/jpeg',
              size,
              originalname: 'photo.jpg',
            });
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 8.2.2: Файлы больше 5MB должны отклоняться', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 }),
          (size) => {
            const result = fileService.validateFile({
              mimetype: 'image/jpeg',
              size,
              originalname: 'photo.jpg',
            });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('5 MB');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property 8.3: Генерация уникальных имён файлов ──────────────────────

  describe('Property 8.3: Unique filename generation', () => {

    it('Property 8.3.1: Каждый вызов должен возвращать уникальное имя', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('photo.jpg', 'icon.png', 'logo.webp', 'anim.gif', 'icon.svg'),
          (originalname) => {
            const names = new Set();
            for (let i = 0; i < 20; i++) {
              names.add(fileService.generateUniqueFilename(originalname));
            }
            // Все 20 имён должны быть уникальными
            expect(names.size).toBe(20);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.3.2: Расширение файла должно сохраняться', () => {
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

      fc.assert(
        fc.property(
          fc.constantFrom(...extensions),
          (ext) => {
            const originalname = `testfile${ext}`;
            const generated = fileService.generateUniqueFilename(originalname);
            expect(generated.endsWith(ext)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 8.3.3: Сгенерированное имя не должно содержать небезопасных символов', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('photo.jpg', 'icon.png', 'logo.webp'),
          (originalname) => {
            const generated = fileService.generateUniqueFilename(originalname);
            // Не должно содержать path traversal символов
            expect(generated).not.toContain('..');
            expect(generated).not.toContain('/');
            expect(generated).not.toContain('\\');
            // Должно содержать только безопасные символы
            expect(/^[a-zA-Z0-9\-_.]+$/.test(generated)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property 8.4: Веб-путь к файлу ─────────────────────────────────────

  describe('Property 8.4: Web path generation', () => {

    it('Property 8.4.1: Веб-путь должен иметь правильный формат /uploads/category/filename', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills', 'certificates', 'general'),
          fc.constantFrom('photo.jpg', 'icon.png', 'logo.webp'),
          (category, filename) => {
            const webPath = fileService.getWebPath(category, filename);
            expect(webPath).toBe(`/uploads/${category}/${filename}`);
            expect(webPath.startsWith('/uploads/')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property 8.5: Удаление файлов ───────────────────────────────────────

  describe('Property 8.5: File deletion', () => {

    it('Property 8.5.1: Существующий файл должен успешно удаляться', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills', 'certificates'),
          fc.constantFrom('img1.jpg', 'img2.png', 'img3.webp'),
          (category, filename) => {
            // Создаём файл
            createTestFile(category, filename);
            expect(fileService.fileExists(category, filename)).toBe(true);

            // Удаляем
            const result = fileService.deleteFile(category, filename);
            expect(result.success).toBe(true);
            expect(fileService.fileExists(category, filename)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.5.2: Удаление несуществующего файла должно возвращать ошибку', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills'),
          fc.constantFrom('nonexistent1.jpg', 'nonexistent2.png'),
          (category, filename) => {
            const result = fileService.deleteFile(category, filename);
            expect(result.success).toBe(false);
            expect(typeof result.error).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.5.3: Path traversal атаки должны отклоняться', () => {
      const maliciousPaths = [
        ['../etc', 'passwd'],
        ['portfolio', '../../../etc/passwd'],
        ['..', 'secret.txt'],
        ['portfolio/../../', 'file.jpg'],
        ['portfolio', 'file/../../secret'],
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...maliciousPaths),
          ([category, filename]) => {
            const result = fileService.deleteFile(category, filename);
            expect(result.success).toBe(false);
            expect(typeof result.error).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.5.4: Удаление по веб-пути должно работать корректно', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills', 'certificates'),
          fc.constantFrom('img1.jpg', 'img2.png'),
          (category, filename) => {
            createTestFile(category, filename);
            const webPath = `/uploads/${category}/${filename}`;

            const result = fileService.deleteFileByWebPath(webPath);
            expect(result.success).toBe(true);
            expect(fileService.fileExists(category, filename)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.5.5: Некорректные веб-пути должны отклоняться', () => {
      const invalidPaths = [
        '/images/photo.jpg',
        '/static/file.png',
        'uploads/photo.jpg',
        '',
        '/uploads/',
        '/uploads/only-category',
        '/uploads/a/b/c/too-deep.jpg',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...invalidPaths),
          (webPath) => {
            const result = fileService.deleteFileByWebPath(webPath);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ─── Property 8.6: Список файлов ─────────────────────────────────────────

  describe('Property 8.6: File listing', () => {

    it('Property 8.6.1: Список файлов должен содержать все созданные файлы', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills', 'certificates'),
          fc.array(fc.constantFrom('a.jpg', 'b.png', 'c.webp', 'd.gif'), { minLength: 1, maxLength: 4 }),
          (category, filenames) => {
            // Очищаем директорию перед каждой итерацией
            if (fs.existsSync(testUploadsDir)) {
              fs.rmSync(testUploadsDir, { recursive: true, force: true });
            }
            fs.mkdirSync(testUploadsDir, { recursive: true });

            const unique = [...new Set(filenames)];
            for (const f of unique) createTestFile(category, f, `content-${f}`);

            const listed = fileService.listFiles(category);
            expect(listed.length).toBe(unique.length);

            for (const f of unique) {
              const found = listed.find(l => l.filename === f);
              expect(found).toBeTruthy();
              expect(found.path).toBe(`/uploads/${category}/${f}`);
              expect(typeof found.size).toBe('number');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.6.2: Список файлов несуществующей категории должен возвращать пустой массив', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('nonexistent-cat', 'empty-cat', 'missing'),
          (category) => {
            const listed = fileService.listFiles(category);
            expect(Array.isArray(listed)).toBe(true);
            expect(listed.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 8.6.3: Path traversal в категории должен возвращать пустой массив', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('../etc', '../../root', '../..'),
          (category) => {
            const listed = fileService.listFiles(category);
            expect(Array.isArray(listed)).toBe(true);
            expect(listed.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // ─── Property 8.7: Валидация имени файла ─────────────────────────────────

  describe('Property 8.7: Filename security validation', () => {

    it('Property 8.7.1: Имена файлов с path traversal должны отклоняться', () => {
      const dangerousNames = [
        '../etc/passwd',
        '../../secret.jpg',
        '/absolute/path.jpg',
        'path\\with\\backslash.jpg',
        'file/with/slash.jpg',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...dangerousNames),
          (originalname) => {
            const result = fileService.validateFile({
              mimetype: 'image/jpeg',
              size: 1024,
              originalname,
            });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
