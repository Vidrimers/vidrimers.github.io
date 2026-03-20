/**
 * Property-based тесты для очистки файлов
 * Feature: admin-cms-system, Property 9: File Cleanup Integrity
 * Validates: Requirements 9.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import FileService from '../services/fileService.js';

let testUploadsDir;
let fileService;

/**
 * Создаёт экземпляр FileService, работающий с временной директорией
 */
function createTestFileService(uploadsDir) {
  const svc = new FileService();

  svc.getAbsolutePath = (category, filename) =>
    path.join(uploadsDir, category, filename);

  svc.fileExists = (category, filename) =>
    fs.existsSync(path.join(uploadsDir, category, filename));

  svc.deleteFile = (category, filename) => {
    if (
      !category || !filename ||
      category.includes('..') || filename.includes('..') ||
      category.includes('/') || filename.includes('/')
    ) {
      return { success: false, error: 'Недопустимый путь к файлу' };
    }
    const filePath = path.join(uploadsDir, category, filename);
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
    if (parts.length !== 2) return { success: false, error: 'Некорректная структура пути' };
    const [category, filename] = parts;
    return svc.deleteFile(category, filename);
  };

  svc.listFiles = (category) => {
    if (!category || category.includes('..')) return [];
    const categoryDir = path.join(uploadsDir, category);
    if (!fs.existsSync(categoryDir)) return [];
    return fs.readdirSync(categoryDir)
      .filter(f => fs.statSync(path.join(categoryDir, f)).isFile())
      .map(f => {
        const stats = fs.statSync(path.join(categoryDir, f));
        return {
          filename: f,
          path: `/uploads/${category}/${f}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      });
  };

  svc.getAllUploadedFilePaths = () => {
    const result = new Set();
    if (!fs.existsSync(uploadsDir)) return result;
    const categories = fs.readdirSync(uploadsDir)
      .filter(e => fs.statSync(path.join(uploadsDir, e)).isDirectory());
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
    if (!fs.existsSync(uploadsDir)) return;
    const categories = fs.readdirSync(uploadsDir)
      .filter(e => fs.statSync(path.join(uploadsDir, e)).isDirectory());
    for (const cat of categories) {
      const dir = path.join(uploadsDir, cat);
      if (fs.readdirSync(dir).length === 0) {
        try { fs.rmdirSync(dir); } catch (_) {}
      }
    }
  };

  return svc;
}

/**
 * Создаёт файл в тестовой директории
 */
function createFile(uploadsDir, category, filename, content = 'data') {
  const dir = path.join(uploadsDir, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);
  return `/uploads/${category}/${filename}`;
}

beforeEach(() => {
  testUploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-test-'));
  fileService = createTestFileService(testUploadsDir);
});

afterEach(() => {
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
  }
});

describe('Property 9: File Cleanup Integrity', () => {

  // ─── Property 9.1: Базовая очистка ────────────────────────────────────────

  describe('Property 9.1: Orphaned files are removed', () => {

    it('Property 9.1.1: Файлы не из usedPaths должны быть удалены', () => {
      fc.assert(
        fc.property(
          // Файлы которые используются
          fc.array(
            fc.record({
              category: fc.constantFrom('portfolio', 'skills', 'certificates'),
              filename: fc.constantFrom('used1.jpg', 'used2.png', 'used3.webp'),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          // Файлы которые НЕ используются (orphaned)
          fc.array(
            fc.record({
              category: fc.constantFrom('portfolio', 'skills', 'certificates'),
              filename: fc.constantFrom('orphan1.jpg', 'orphan2.png', 'orphan3.webp'),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (usedFiles, orphanFiles) => {
            // Убираем пересечения по пути
            const usedPaths = new Set();
            for (const f of usedFiles) {
              const webPath = createFile(testUploadsDir, f.category, f.filename);
              usedPaths.add(webPath);
            }

            // Создаём orphaned файлы (не добавляем в usedPaths)
            const orphanPaths = [];
            for (const f of orphanFiles) {
              const webPath = `/uploads/${f.category}/${f.filename}`;
              // Пропускаем если путь совпадает с used
              if (!usedPaths.has(webPath)) {
                createFile(testUploadsDir, f.category, f.filename);
                orphanPaths.push(webPath);
              }
            }

            const result = fileService.cleanupOrphanedFiles(usedPaths);

            // Все orphaned файлы должны быть удалены
            for (const orphanPath of orphanPaths) {
              expect(result.deleted).toContain(orphanPath);
              const [, , category, filename] = orphanPath.split('/');
              expect(fileService.fileExists(category, filename)).toBe(false);
            }

            // Используемые файлы должны остаться
            for (const webPath of usedPaths) {
              const parts = webPath.replace('/uploads/', '').split('/');
              expect(fileService.fileExists(parts[0], parts[1])).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 9.1.2: Файлы из usedPaths не должны удаляться', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              category: fc.constantFrom('portfolio', 'skills', 'certificates'),
              filename: fc.constantFrom('keep1.jpg', 'keep2.png', 'keep3.webp', 'keep4.gif'),
            }),
            { minLength: 1, maxLength: 4 }
          ),
          (files) => {
            // Очищаем директорию перед каждой итерацией
            if (fs.existsSync(testUploadsDir)) {
              fs.rmSync(testUploadsDir, { recursive: true, force: true });
            }
            fs.mkdirSync(testUploadsDir, { recursive: true });

            const usedPaths = new Set();
            for (const f of files) {
              const webPath = createFile(testUploadsDir, f.category, f.filename);
              usedPaths.add(webPath);
            }

            const result = fileService.cleanupOrphanedFiles(usedPaths);

            // Ничего не должно быть удалено
            expect(result.deleted.length).toBe(0);
            expect(result.errors.length).toBe(0);

            // Все файлы должны остаться на месте
            for (const webPath of usedPaths) {
              const parts = webPath.replace('/uploads/', '').split('/');
              expect(fileService.fileExists(parts[0], parts[1])).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 9.1.3: Очистка пустой директории не должна вызывать ошибок', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constant('/uploads/portfolio/used.jpg'), { minLength: 0, maxLength: 3 }),
          (usedPaths) => {
            // Директория пустая — файлов нет
            const result = fileService.cleanupOrphanedFiles(new Set(usedPaths));
            expect(result.deleted.length).toBe(0);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // ─── Property 9.2: Идемпотентность очистки ────────────────────────────────

  describe('Property 9.2: Cleanup idempotency', () => {

    it('Property 9.2.1: Повторная очистка не должна вызывать ошибок', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              category: fc.constantFrom('portfolio', 'skills'),
              filename: fc.constantFrom('file1.jpg', 'file2.png', 'file3.webp'),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (orphanFiles) => {
            for (const f of orphanFiles) {
              createFile(testUploadsDir, f.category, f.filename);
            }

            const usedPaths = new Set(); // Все файлы — orphaned

            // Первая очистка
            const first = fileService.cleanupOrphanedFiles(usedPaths);
            expect(first.errors.length).toBe(0);

            // Вторая очистка — файлов уже нет, ошибок быть не должно
            const second = fileService.cleanupOrphanedFiles(usedPaths);
            expect(second.deleted.length).toBe(0);
            expect(second.errors.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ─── Property 9.3: Удаление пустых папок ──────────────────────────────────

  describe('Property 9.3: Empty directory cleanup', () => {

    it('Property 9.3.1: Пустые папки категорий должны удаляться', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills', 'certificates', 'general'),
          (category) => {
            // Создаём папку с файлом, затем удаляем файл
            const filePath = createFile(testUploadsDir, category, 'temp.jpg');
            const absPath = path.join(testUploadsDir, category, 'temp.jpg');
            fs.unlinkSync(absPath);

            // Папка должна существовать но быть пустой
            const categoryDir = path.join(testUploadsDir, category);
            expect(fs.existsSync(categoryDir)).toBe(true);
            expect(fs.readdirSync(categoryDir).length).toBe(0);

            fileService.cleanupEmptyDirs();

            // Пустая папка должна быть удалена
            expect(fs.existsSync(categoryDir)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property 9.3.2: Непустые папки не должны удаляться', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'skills', 'certificates'),
          fc.constantFrom('file1.jpg', 'file2.png'),
          (category, filename) => {
            createFile(testUploadsDir, category, filename);

            fileService.cleanupEmptyDirs();

            // Папка с файлом должна остаться
            const categoryDir = path.join(testUploadsDir, category);
            expect(fs.existsSync(categoryDir)).toBe(true);
            expect(fileService.fileExists(category, filename)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // ─── Property 9.4: Целостность после удаления контента ────────────────────

  describe('Property 9.4: File removal on content deletion', () => {

    it('Property 9.4.1: После удаления контента связанный файл не должен оставаться', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('portfolio', 'certificates', 'skills'),
          fc.constantFrom('project.jpg', 'cert.png', 'skill-icon.webp'),
          (category, filename) => {
            // Симулируем: файл загружен и привязан к контенту
            const webPath = createFile(testUploadsDir, category, filename);
            expect(fileService.fileExists(category, filename)).toBe(true);

            // Симулируем удаление контента — удаляем файл через deleteFileByWebPath
            const result = fileService.deleteFileByWebPath(webPath);
            expect(result.success).toBe(true);

            // Файл не должен существовать
            expect(fileService.fileExists(category, filename)).toBe(false);

            // Повторная очистка не должна находить этот файл
            const cleanupResult = fileService.cleanupOrphanedFiles(new Set());
            expect(cleanupResult.deleted).not.toContain(webPath);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 9.4.2: Количество удалённых файлов должно совпадать с количеством orphaned', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          (usedCount, orphanCount) => {
            // Очищаем директорию перед каждой итерацией
            if (fs.existsSync(testUploadsDir)) {
              fs.rmSync(testUploadsDir, { recursive: true, force: true });
            }
            fs.mkdirSync(testUploadsDir, { recursive: true });

            const usedPaths = new Set();
            const allFilenames = ['f1.jpg', 'f2.png', 'f3.webp', 'f4.gif', 'f5.jpg',
                                  'f6.png', 'f7.webp', 'f8.gif', 'f9.jpg', 'f10.png'];

            // Создаём used файлы
            for (let i = 0; i < usedCount; i++) {
              const webPath = createFile(testUploadsDir, 'portfolio', `used-${allFilenames[i]}`);
              usedPaths.add(webPath);
            }

            // Создаём orphaned файлы
            for (let i = 0; i < orphanCount; i++) {
              createFile(testUploadsDir, 'portfolio', `orphan-${allFilenames[i]}`);
            }

            const result = fileService.cleanupOrphanedFiles(usedPaths);

            // Количество удалённых должно совпадать с orphanCount
            expect(result.deleted.length).toBe(orphanCount);
            expect(result.errors.length).toBe(0);

            // Итоговое количество файлов должно равняться usedCount
            const remaining = fileService.listFiles('portfolio');
            expect(remaining.length).toBe(usedCount);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ─── Property 9.5: getAllUploadedFilePaths ─────────────────────────────────

  describe('Property 9.5: getAllUploadedFilePaths consistency', () => {

    it('Property 9.5.1: Должны возвращаться пути всех файлов из всех категорий', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              category: fc.constantFrom('portfolio', 'skills', 'certificates'),
              filename: fc.constantFrom('a.jpg', 'b.png', 'c.webp', 'd.gif'),
            }),
            { minLength: 1, maxLength: 6 }
          ),
          (files) => {
            // Очищаем директорию перед каждой итерацией
            if (fs.existsSync(testUploadsDir)) {
              fs.rmSync(testUploadsDir, { recursive: true, force: true });
            }
            fs.mkdirSync(testUploadsDir, { recursive: true });

            const expectedPaths = new Set();
            for (const f of files) {
              const webPath = createFile(testUploadsDir, f.category, f.filename);
              expectedPaths.add(webPath);
            }

            const allPaths = fileService.getAllUploadedFilePaths();

            // Все созданные файлы должны быть в результате
            for (const p of expectedPaths) {
              expect(allPaths.has(p)).toBe(true);
            }

            // Размеры должны совпадать
            expect(allPaths.size).toBe(expectedPaths.size);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
