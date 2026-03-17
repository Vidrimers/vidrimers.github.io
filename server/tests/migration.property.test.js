/**
 * Property-based тесты для миграции данных
 * Feature: admin-cms-system, Property 12: Database Migration Integrity
 * Validates: Requirements 2.6, 2.7
 */

const fc = require('fast-check');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Импортируем сервисы
const DatabaseService = require('../services/databaseService');
const MigrationService = require('../services/migrationService');

// Тестовая база данных
const TEST_DB_PATH = path.join(__dirname, '..', 'database', 'test_migration.db');

describe('Property 12: Database Migration Integrity', () => {
  let dbService;
  let migrationService;

  beforeEach(async () => {
    // Удаляем тестовую базу данных если она существует
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Создаем новые экземпляры сервисов для каждого теста
    dbService = new DatabaseService();
    
    // Переопределяем путь к базе данных для тестов
    const originalPath = path.join(__dirname, '..', 'database', 'cms.db');
    dbService.constructor.prototype.initialize = async function() {
      return new Promise((resolve, reject) => {
        const dbDir = path.dirname(TEST_DB_PATH);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(TEST_DB_PATH, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Читаем и выполняем схему базы данных
          const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
          if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            this.db.exec(schema, (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          } else {
            reject(new Error('Schema file not found'));
          }
        });
      });
    };

    await dbService.initialize();
    
    migrationService = new MigrationService();
    migrationService.dbService = dbService;
    
    // Убеждаемся, что база данных пустая
    await dbService.runQuery('DELETE FROM projects');
    await dbService.runQuery('DELETE FROM categories');
    await dbService.runQuery('DELETE FROM skills');
    await dbService.runQuery('DELETE FROM certificates');
    await dbService.runQuery('DELETE FROM about_content');
    await dbService.runQuery('DELETE FROM contacts');
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.close();
    }
    
    // Удаляем тестовую базу данных
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  /**
   * Property 12: Database Migration Integrity
   * For any valid migration operation, all static data should be preserved 
   * in the database without loss or corruption
   */
  test('Property 12: Migration preserves all static data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true), // Простой генератор для запуска миграции
        async (shouldMigrate) => {
          // Выполняем миграцию
          await migrationService.migrateAllData();
          
          // Проверяем, что все категории мигрированы
          const categories = await dbService.getAll('SELECT * FROM categories ORDER BY sort_order');
          expect(categories).toHaveLength(2);
          expect(categories[0].id).toBe('pet');
          expect(categories[0].name_ru).toBe('Собственные проекты');
          expect(categories[0].name_en).toBe('Personal Projects');
          expect(categories[1].id).toBe('layout');
          expect(categories[1].name_ru).toBe('Учебные проекты');
          expect(categories[1].name_en).toBe('Learning Projects');
          
          // Проверяем, что все проекты мигрированы
          const projects = await dbService.getAll('SELECT * FROM projects ORDER BY sort_order');
          expect(projects.length).toBeGreaterThan(0);
          
          // Проверяем целостность данных проектов
          for (const project of projects) {
            expect(project.id).toBeTruthy();
            expect(project.title_ru).toBeTruthy();
            expect(project.title_en).toBeTruthy();
            expect(project.description_ru).toBeTruthy();
            expect(project.description_en).toBeTruthy();
            expect(project.category_id).toBeTruthy();
            expect(['pet', 'layout']).toContain(project.category_id);
            expect(typeof project.is_ai).toBe('number');
            expect(typeof project.is_new).toBe('number');
            expect(typeof project.is_in_progress).toBe('number');
            expect(typeof project.is_hidden).toBe('number');
          }
          
          // Проверяем, что все навыки мигрированы
          const skills = await dbService.getAll('SELECT * FROM skills ORDER BY sort_order');
          expect(skills.length).toBeGreaterThan(0);
          
          // Проверяем целостность данных навыков
          for (const skill of skills) {
            expect(skill.name_ru).toBeTruthy();
            expect(skill.name_en).toBeTruthy();
            expect(skill.icon_path).toBeTruthy();
            expect(typeof skill.sort_order).toBe('number');
            expect(typeof skill.is_hidden).toBe('number');
          }
          
          // Проверяем, что все сертификаты мигрированы
          const certificates = await dbService.getAll('SELECT * FROM certificates ORDER BY sort_order');
          expect(certificates.length).toBeGreaterThan(0);
          
          // Проверяем целостность данных сертификатов
          for (const cert of certificates) {
            expect(cert.title_ru).toBeTruthy();
            expect(cert.title_en).toBeTruthy();
            expect(cert.image_path).toBeTruthy();
            expect(typeof cert.sort_order).toBe('number');
            expect(typeof cert.is_hidden).toBe('number');
          }
          
          // Проверяем контент "Обо мне"
          const aboutContent = await dbService.getOne('SELECT * FROM about_content WHERE id = 1');
          expect(aboutContent).toBeTruthy();
          expect(aboutContent.content_ru).toBeTruthy();
          expect(aboutContent.content_en).toBeTruthy();
          expect(aboutContent.content_ru.length).toBeGreaterThan(100); // Должен быть достаточно длинным
          expect(aboutContent.content_en.length).toBeGreaterThan(100);
          
          // Проверяем контактную информацию
          const contacts = await dbService.getOne('SELECT * FROM contacts WHERE id = 1');
          expect(contacts).toBeTruthy();
          expect(contacts.telegram).toBeTruthy();
          
          // Проверяем, что other_links является валидным JSON
          if (contacts.other_links) {
            expect(() => JSON.parse(contacts.other_links)).not.toThrow();
          }
          
          return true;
        }
      ),
      { 
        numRuns: 10, // Меньше итераций для тестов базы данных
        timeout: 30000 // 30 секунд таймаут
      }
    );
  }, 35000); // 35 секунд таймаут для Jest

  /**
   * Тест идемпотентности миграции
   * Повторная миграция не должна дублировать данные
   */
  test('Property 12: Migration idempotency - repeated migrations preserve data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Количество повторных миграций
        async (migrationCount) => {
          // Выполняем миграцию несколько раз
          for (let i = 0; i < migrationCount; i++) {
            await migrationService.migrateAllData();
          }
          
          // Проверяем, что данные не дублировались
          const categories = await dbService.getAll('SELECT * FROM categories');
          expect(categories).toHaveLength(2); // Должно быть ровно 2 категории
          
          const projects = await dbService.getAll('SELECT * FROM projects');
          const uniqueProjectIds = new Set(projects.map(p => p.id));
          expect(projects.length).toBe(uniqueProjectIds.size); // Все ID должны быть уникальными
          
          const skills = await dbService.getAll('SELECT * FROM skills');
          const uniqueSkillNames = new Set(skills.map(s => `${s.name_ru}-${s.name_en}`));
          expect(skills.length).toBe(uniqueSkillNames.size); // Все навыки должны быть уникальными
          
          const certificates = await dbService.getAll('SELECT * FROM certificates');
          const uniqueCertPaths = new Set(certificates.map(c => c.image_path));
          expect(certificates.length).toBe(uniqueCertPaths.size); // Все пути изображений должны быть уникальными
          
          // Проверяем, что контент "Обо мне" и контакты остались единственными записями
          const aboutCount = await dbService.getOne('SELECT COUNT(*) as count FROM about_content');
          expect(aboutCount.count).toBe(1);
          
          const contactsCount = await dbService.getOne('SELECT COUNT(*) as count FROM contacts');
          expect(contactsCount.count).toBe(1);
          
          return true;
        }
      ),
      { 
        numRuns: 5,
        timeout: 45000 // 45 секунд таймаут
      }
    );
  }, 50000); // 50 секунд таймаут для Jest

  /**
   * Тест проверки необходимости миграции
   */
  test('Property 12: Migration necessity detection works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async (shouldTest) => {
          // Очищаем базу данных перед каждым запуском property теста
          await dbService.runQuery('DELETE FROM projects');
          await dbService.runQuery('DELETE FROM skills');
          await dbService.runQuery('DELETE FROM categories');
          await dbService.runQuery('DELETE FROM certificates');
          await dbService.runQuery('DELETE FROM about_content');
          await dbService.runQuery('DELETE FROM contacts');
          
          // В начале база данных пустая, миграция должна быть нужна
          const needsBefore = await migrationService.needsMigration();
          expect(needsBefore).toBe(true);
          
          // После миграции она НЕ должна быть нужна
          await migrationService.migrateAllData();
          
          // Добавляем небольшую задержку чтобы убедиться что транзакция завершилась
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const needsAfter = await migrationService.needsMigration();
          expect(needsAfter).toBe(false);
          
          return true;
        }
      ),
      { 
        numRuns: 3,
        timeout: 20000
      }
    );
  }, 25000);

  /**
   * Тест целостности связей между таблицами
   */
  test('Property 12: Foreign key relationships are preserved during migration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async (shouldTest) => {
          await migrationService.migrateAllData();
          
          // Проверяем, что все проекты ссылаются на существующие категории
          const projects = await dbService.getAll('SELECT * FROM projects');
          const categories = await dbService.getAll('SELECT id FROM categories');
          const categoryIds = new Set(categories.map(c => c.id));
          
          for (const project of projects) {
            expect(categoryIds.has(project.category_id)).toBe(true);
          }
          
          // Проверяем, что у каждой категории есть хотя бы один проект
          for (const category of categories) {
            const projectsInCategory = projects.filter(p => p.category_id === category.id);
            expect(projectsInCategory.length).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { 
        numRuns: 5,
        timeout: 20000
      }
    );
  }, 25000);
});