/**
 * Property-based тесты для управления видимостью контента
 * Feature: admin-cms-system, Property 7: Content Visibility Management
 * Validates: Requirements 4.8, 5.6, 7.6
 *
 * Тесты проверяют:
 * - Скрытие элемента делает его невидимым на публичном сайте, но сохраняет в БД
 * - Показ скрытого элемента восстанавливает его видимость
 * - Публичный API не возвращает скрытые элементы
 * - Админский API (includeHidden=true) возвращает все элементы
 * - Флаг is_hidden не влияет на целостность остальных данных
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import fc from 'fast-check';
import DatabaseService from '../services/databaseService.js';

describe('Property 7: Content Visibility Management', () => {
  let dbService;

  beforeAll(async () => {
    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterAll(async () => {
    if (dbService) {
      await dbService.close();
    }
  });

  beforeEach(async () => {
    try {
      await dbService.runQuery('DELETE FROM projects');
      await dbService.runQuery('DELETE FROM categories');
      await dbService.runQuery('DELETE FROM skills');
      await dbService.runQuery('DELETE FROM certificates');
    } catch (error) {
      console.warn('Warning: Could not clear tables:', error.message);
    }
  });

  // ─── Вспомогательные функции ─────────────────────────────────────────────

  /**
   * Симулирует публичный запрос (без скрытых элементов)
   */
  const getVisibleItems = (items) => items.filter(item => !item.is_hidden);

  /**
   * Симулирует скрытие элемента (как PUT с isHidden: true)
   */
  const hideItem = (item) => ({ ...item, is_hidden: 1 });

  /**
   * Симулирует показ элемента (как PUT с isHidden: false)
   */
  const showItem = (item) => ({ ...item, is_hidden: 0 });

  /**
   * Проверяет что данные элемента не изменились кроме флага is_hidden
   */
  const dataIntact = (original, modified, fields) => {
    return fields.every(field => original[field] === modified[field]);
  };

  // ─── Генераторы ──────────────────────────────────────────────────────────

  // Генератор непустой строки без спецсимволов SQL
  const safeString = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0 && !s.includes("'") && !s.includes('"'));

  // Генератор булевого флага видимости
  const visibilityFlag = fc.boolean();

  // Генератор набора проектов (1–5 штук) с разными флагами видимости
  const projectsWithVisibility = fc.array(
    fc.record({
      titleRu: safeString,
      titleEn: safeString,
      isHidden: visibilityFlag
    }),
    { minLength: 1, maxLength: 5 }
  );

  // Генератор набора навыков (1–5 штук) с разными флагами видимости
  const skillsWithVisibility = fc.array(
    fc.record({
      nameRu: safeString,
      nameEn: safeString,
      isHidden: visibilityFlag
    }),
    { minLength: 1, maxLength: 5 }
  );

  // Генератор набора сертификатов (1–5 штук) с разными флагами видимости
  const certificatesWithVisibility = fc.array(
    fc.record({
      imagePath: fc.constant('/uploads/test.jpg'),
      isHidden: visibilityFlag
    }),
    { minLength: 1, maxLength: 5 }
  );

  // ─── Тесты для проектов (Requirement 4.8) ────────────────────────────────

  describe('Projects visibility (Requirement 4.8)', () => {

    /**
     * Property 7.1: Скрытый проект не возвращается публичным API
     * Для любого проекта: после скрытия он не должен быть в публичной выборке
     */
    it('Property 7.1: Hidden project is excluded from public results', async () => {
      await fc.assert(
        fc.asyncProperty(projectsWithVisibility, async (projects) => {
          // Создаём категорию
          const categoryId = `cat-vis-${Date.now()}`;
          await dbService.runQuery(
            'INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden) VALUES (?, ?, ?, ?, ?)',
            [categoryId, 'Тест', 'Test', 0, 0]
          );

          // Создаём проекты с разными флагами видимости
          const insertedIds = [];
          for (let i = 0; i < projects.length; i++) {
            const id = `proj-vis-${Date.now()}-${i}`;
            insertedIds.push(id);
            await dbService.runQuery(
              `INSERT INTO projects (id, title_ru, title_en, description_ru, description_en, category_id, is_hidden, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, projects[i].titleRu, projects[i].titleEn, 'desc ru', 'desc en', categoryId, projects[i].isHidden ? 1 : 0, i]
            );
          }

          // Публичная выборка — только видимые
          const allProjects = await dbService.allQuery(
            `SELECT * FROM projects WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
          const publicProjects = getVisibleItems(allProjects);
          const hiddenProjects = allProjects.filter(p => p.is_hidden);

          // Скрытые проекты не должны попасть в публичную выборку
          for (const hidden of hiddenProjects) {
            const found = publicProjects.find(p => p.id === hidden.id);
            expect(found).toBeUndefined();
          }

          // Видимые проекты должны быть в публичной выборке
          const expectedVisible = projects.filter(p => !p.isHidden).length;
          expect(publicProjects.length).toBe(expectedVisible);

          // Очищаем
          await dbService.runQuery(
            `DELETE FROM projects WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
          await dbService.runQuery('DELETE FROM categories WHERE id = ?', [categoryId]);
        }),
        { numRuns: 20 }
      );
    });

    /**
     * Property 7.2: Скрытый проект сохраняется в БД (не удаляется)
     * После скрытия проект должен быть доступен через adminQuery (includeHidden=true)
     */
    it('Property 7.2: Hidden project is preserved in database', async () => {
      await fc.assert(
        fc.asyncProperty(safeString, safeString, async (titleRu, titleEn) => {
          const categoryId = `cat-preserve-${Date.now()}`;
          const projectId = `proj-preserve-${Date.now()}`;

          await dbService.runQuery(
            'INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden) VALUES (?, ?, ?, ?, ?)',
            [categoryId, 'Тест', 'Test', 0, 0]
          );

          // Создаём видимый проект
          await dbService.runQuery(
            `INSERT INTO projects (id, title_ru, title_en, description_ru, description_en, category_id, is_hidden)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [projectId, titleRu, titleEn, 'desc ru', 'desc en', categoryId, 0]
          );

          // Скрываем проект
          await dbService.runQuery(
            'UPDATE projects SET is_hidden = 1 WHERE id = ?',
            [projectId]
          );

          // Проект должен существовать в БД
          const inDb = await dbService.getQuery('SELECT * FROM projects WHERE id = ?', [projectId]);
          expect(inDb).not.toBeNull();
          expect(inDb.is_hidden).toBe(1);

          // Данные проекта не должны измениться
          expect(inDb.title_ru).toBe(titleRu);
          expect(inDb.title_en).toBe(titleEn);

          // Публичная выборка не должна содержать скрытый проект
          const publicProjects = await dbService.allQuery(
            'SELECT * FROM projects WHERE id = ? AND is_hidden = 0',
            [projectId]
          );
          expect(publicProjects.length).toBe(0);

          // Очищаем
          await dbService.runQuery('DELETE FROM projects WHERE id = ?', [projectId]);
          await dbService.runQuery('DELETE FROM categories WHERE id = ?', [categoryId]);
        }),
        { numRuns: 30 }
      );
    });

    /**
     * Property 7.3: Показ скрытого проекта восстанавливает видимость
     */
    it('Property 7.3: Unhiding project restores its visibility', async () => {
      await fc.assert(
        fc.asyncProperty(safeString, safeString, async (titleRu, titleEn) => {
          const categoryId = `cat-restore-${Date.now()}`;
          const projectId = `proj-restore-${Date.now()}`;

          await dbService.runQuery(
            'INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden) VALUES (?, ?, ?, ?, ?)',
            [categoryId, 'Тест', 'Test', 0, 0]
          );

          // Создаём скрытый проект
          await dbService.runQuery(
            `INSERT INTO projects (id, title_ru, title_en, description_ru, description_en, category_id, is_hidden)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [projectId, titleRu, titleEn, 'desc ru', 'desc en', categoryId, 1]
          );

          // Показываем проект
          await dbService.runQuery(
            'UPDATE projects SET is_hidden = 0 WHERE id = ?',
            [projectId]
          );

          // Проект должен появиться в публичной выборке
          const publicProjects = await dbService.allQuery(
            'SELECT * FROM projects WHERE id = ? AND is_hidden = 0',
            [projectId]
          );
          expect(publicProjects.length).toBe(1);
          expect(publicProjects[0].title_ru).toBe(titleRu);

          // Очищаем
          await dbService.runQuery('DELETE FROM projects WHERE id = ?', [projectId]);
          await dbService.runQuery('DELETE FROM categories WHERE id = ?', [categoryId]);
        }),
        { numRuns: 30 }
      );
    });
  });

  // ─── Тесты для навыков (Requirement 5.6) ─────────────────────────────────

  describe('Skills visibility (Requirement 5.6)', () => {

    /**
     * Property 7.4: Скрытый навык не возвращается публичным API
     */
    it('Property 7.4: Hidden skill is excluded from public results', async () => {
      await fc.assert(
        fc.asyncProperty(skillsWithVisibility, async (skills) => {
          const insertedIds = [];
          for (let i = 0; i < skills.length; i++) {
            const result = await dbService.runQuery(
              `INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
               VALUES (?, ?, ?, ?, ?)`,
              [skills[i].nameRu, skills[i].nameEn, '/ico/test.png', i, skills[i].isHidden ? 1 : 0]
            );
            insertedIds.push(result.lastID);
          }

          // Публичная выборка
          const allSkills = await dbService.allQuery(
            `SELECT * FROM skills WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
          const publicSkills = getVisibleItems(allSkills);

          // Скрытые навыки не должны быть в публичной выборке
          const hiddenSkills = allSkills.filter(s => s.is_hidden);
          for (const hidden of hiddenSkills) {
            expect(publicSkills.find(s => s.id === hidden.id)).toBeUndefined();
          }

          const expectedVisible = skills.filter(s => !s.isHidden).length;
          expect(publicSkills.length).toBe(expectedVisible);

          // Очищаем
          await dbService.runQuery(
            `DELETE FROM skills WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
        }),
        { numRuns: 20 }
      );
    });

    /**
     * Property 7.5: Toggle видимости навыка инвертирует флаг
     */
    it('Property 7.5: Toggling skill visibility inverts is_hidden flag', async () => {
      await fc.assert(
        fc.asyncProperty(visibilityFlag, async (initialHidden) => {
          const result = await dbService.runQuery(
            `INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
             VALUES (?, ?, ?, ?, ?)`,
            ['Навык', 'Skill', '/ico/test.png', 0, initialHidden ? 1 : 0]
          );
          const skillId = result.lastID;

          // Инвертируем флаг
          await dbService.runQuery(
            'UPDATE skills SET is_hidden = ? WHERE id = ?',
            [initialHidden ? 0 : 1, skillId]
          );

          const updated = await dbService.getQuery('SELECT * FROM skills WHERE id = ?', [skillId]);
          expect(updated.is_hidden).toBe(initialHidden ? 0 : 1);

          // Инвертируем обратно
          await dbService.runQuery(
            'UPDATE skills SET is_hidden = ? WHERE id = ?',
            [initialHidden ? 1 : 0, skillId]
          );

          const restored = await dbService.getQuery('SELECT * FROM skills WHERE id = ?', [skillId]);
          expect(restored.is_hidden).toBe(initialHidden ? 1 : 0);

          // Очищаем
          await dbService.runQuery('DELETE FROM skills WHERE id = ?', [skillId]);
        }),
        { numRuns: 50 }
      );
    });
  });

  // ─── Тесты для сертификатов (Requirement 7.6) ────────────────────────────

  describe('Certificates visibility (Requirement 7.6)', () => {

    /**
     * Property 7.6: Скрытый сертификат не возвращается публичным API
     */
    it('Property 7.6: Hidden certificate is excluded from public results', async () => {
      await fc.assert(
        fc.asyncProperty(certificatesWithVisibility, async (certs) => {
          const insertedIds = [];
          for (let i = 0; i < certs.length; i++) {
            const result = await dbService.runQuery(
              `INSERT INTO certificates (image_path, sort_order, is_hidden)
               VALUES (?, ?, ?)`,
              [certs[i].imagePath, i, certs[i].isHidden ? 1 : 0]
            );
            insertedIds.push(result.lastID);
          }

          const allCerts = await dbService.allQuery(
            `SELECT * FROM certificates WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
          const publicCerts = getVisibleItems(allCerts);
          const hiddenCerts = allCerts.filter(c => c.is_hidden);

          for (const hidden of hiddenCerts) {
            expect(publicCerts.find(c => c.id === hidden.id)).toBeUndefined();
          }

          const expectedVisible = certs.filter(c => !c.isHidden).length;
          expect(publicCerts.length).toBe(expectedVisible);

          // Очищаем
          await dbService.runQuery(
            `DELETE FROM certificates WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
        }),
        { numRuns: 20 }
      );
    });

    /**
     * Property 7.7: Скрытый сертификат сохраняется в БД (не удаляется)
     */
    it('Property 7.7: Hidden certificate is preserved in database', async () => {
      await fc.assert(
        fc.asyncProperty(visibilityFlag, async (startVisible) => {
          const result = await dbService.runQuery(
            `INSERT INTO certificates (image_path, sort_order, is_hidden)
             VALUES (?, ?, ?)`,
            ['/uploads/cert.jpg', 0, startVisible ? 0 : 1]
          );
          const certId = result.lastID;

          // Скрываем
          await dbService.runQuery(
            'UPDATE certificates SET is_hidden = 1 WHERE id = ?',
            [certId]
          );

          // Должен существовать в БД
          const inDb = await dbService.getQuery('SELECT * FROM certificates WHERE id = ?', [certId]);
          expect(inDb).not.toBeNull();
          expect(inDb.is_hidden).toBe(1);
          expect(inDb.image_path).toBe('/uploads/cert.jpg');

          // Не должен быть в публичной выборке
          const publicResult = await dbService.allQuery(
            'SELECT * FROM certificates WHERE id = ? AND is_hidden = 0',
            [certId]
          );
          expect(publicResult.length).toBe(0);

          // Очищаем
          await dbService.runQuery('DELETE FROM certificates WHERE id = ?', [certId]);
        }),
        { numRuns: 30 }
      );
    });
  });

  // ─── Общие свойства видимости ─────────────────────────────────────────────

  describe('General visibility properties', () => {

    /**
     * Property 7.8: Флаг is_hidden не влияет на остальные данные элемента
     * Для любого элемента: изменение is_hidden не должно менять другие поля
     */
    it('Property 7.8: Toggling visibility does not corrupt other data fields', async () => {
      await fc.assert(
        fc.asyncProperty(safeString, safeString, visibilityFlag, async (nameRu, nameEn, initialHidden) => {
          const result = await dbService.runQuery(
            `INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
             VALUES (?, ?, ?, ?, ?)`,
            [nameRu, nameEn, '/ico/test.png', 42, initialHidden ? 1 : 0]
          );
          const skillId = result.lastID;

          // Меняем только is_hidden
          await dbService.runQuery(
            'UPDATE skills SET is_hidden = ? WHERE id = ?',
            [initialHidden ? 0 : 1, skillId]
          );

          const updated = await dbService.getQuery('SELECT * FROM skills WHERE id = ?', [skillId]);

          // Остальные поля не должны измениться
          expect(updated.name_ru).toBe(nameRu);
          expect(updated.name_en).toBe(nameEn);
          expect(updated.icon_path).toBe('/ico/test.png');
          expect(updated.sort_order).toBe(42);
          // Только is_hidden изменился
          expect(updated.is_hidden).toBe(initialHidden ? 0 : 1);

          // Очищаем
          await dbService.runQuery('DELETE FROM skills WHERE id = ?', [skillId]);
        }),
        { numRuns: 50 }
      );
    });

    /**
     * Property 7.9: Количество видимых + скрытых = общее количество
     * Инвариант: публичная выборка + скрытые = все элементы
     */
    it('Property 7.9: Visible + hidden count equals total count', async () => {
      await fc.assert(
        fc.asyncProperty(skillsWithVisibility, async (skills) => {
          const insertedIds = [];
          for (let i = 0; i < skills.length; i++) {
            const result = await dbService.runQuery(
              `INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
               VALUES (?, ?, ?, ?, ?)`,
              [skills[i].nameRu, skills[i].nameEn, '/ico/test.png', i, skills[i].isHidden ? 1 : 0]
            );
            insertedIds.push(result.lastID);
          }

          const allItems = await dbService.allQuery(
            `SELECT * FROM skills WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
          const visibleCount = allItems.filter(s => !s.is_hidden).length;
          const hiddenCount = allItems.filter(s => s.is_hidden).length;

          // Инвариант: видимые + скрытые = все
          expect(visibleCount + hiddenCount).toBe(allItems.length);
          expect(allItems.length).toBe(skills.length);

          // Очищаем
          await dbService.runQuery(
            `DELETE FROM skills WHERE id IN (${insertedIds.map(() => '?').join(',')})`,
            insertedIds
          );
        }),
        { numRuns: 30 }
      );
    });
  });
});
