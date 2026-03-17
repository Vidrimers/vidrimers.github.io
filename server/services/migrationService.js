/**
 * Сервис для миграции данных из статических файлов в базу данных
 */

const fs = require('fs').promises;
const path = require('path');
const DatabaseService = require('./databaseService');

class MigrationService {
  constructor() {
    this.dbService = new DatabaseService();
  }

  /**
   * Выполняет полную миграцию всех данных
   */
  async migrateAllData() {
    try {
      console.log('🔄 Начинаем миграцию данных...');

      // Инициализируем базу данных если не инициализирована
      if (!this.dbService.db) {
        await this.dbService.initialize();
      }

      // Мигрируем данные в определенном порядке (сначала категории, потом проекты)
      await this.migrateCategoriesFromProjects();
      await this.migrateProjects();
      await this.migrateSkills();
      await this.migrateCertificates();
      await this.migrateTranslations();

      console.log('✅ Миграция данных завершена успешно');
      return true;

    } catch (error) {
      console.error('❌ Ошибка миграции данных:', error);
      throw error;
    }
  }

  /**
   * Мигрирует категории из данных проектов
   */
  async migrateCategoriesFromProjects() {
    try {
      console.log('📂 Миграция категорий...');

      // Читаем данные проектов
      const portfolioPath = path.join(__dirname, '../../src/data/portfolioData.js');
      const portfolioContent = await fs.readFile(portfolioPath, 'utf8');
      
      // Извлекаем данные (простой парсинг для статических данных)
      const portfolioData = this.parseJSDataFile(portfolioContent);

      // Собираем уникальные категории
      const categories = new Set();
      portfolioData.forEach(project => {
        if (project.category) {
          categories.add(project.category);
        }
      });

      // Создаем категории в базе данных
      let sortOrder = 0;
      for (const categoryName of categories) {
        const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
        
        try {
          await this.dbService.runQuery(`
            INSERT OR IGNORE INTO categories (id, name_ru, name_en, sort_order)
            VALUES (?, ?, ?, ?)
          `, [categoryId, categoryName, categoryName, sortOrder]);
          
          console.log(`  ✓ Категория: ${categoryName} (${categoryId})`);
          sortOrder++;
        } catch (error) {
          console.warn(`  ⚠️ Ошибка создания категории ${categoryName}:`, error.message);
        }
      }

      console.log(`✅ Мигрировано ${categories.size} категорий`);

    } catch (error) {
      console.error('❌ Ошибка миграции категорий:', error);
      throw error;
    }
  }

  /**
   * Мигрирует проекты портфолио
   */
  async migrateProjects() {
    try {
      console.log('💼 Миграция проектов портфолио...');

      const portfolioPath = path.join(__dirname, '../../src/data/portfolioData.js');
      const portfolioContent = await fs.readFile(portfolioPath, 'utf8');
      const portfolioData = this.parseJSDataFile(portfolioContent);

      let migratedCount = 0;

      for (const project of portfolioData) {
        try {
          const categoryId = project.category ? 
            project.category.toLowerCase().replace(/\s+/g, '-') : 
            'other';

          await this.dbService.runQuery(`
            INSERT OR REPLACE INTO projects (
              id, title_ru, title_en, description_ru, description_en,
              image_path, link, category_id, is_ai, is_new, is_in_progress, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            project.id || `project-${migratedCount + 1}`,
            project.title?.ru || project.title || '',
            project.title?.en || project.title || '',
            project.description?.ru || project.description || '',
            project.description?.en || project.description || '',
            project.image || null,
            project.link || null,
            categoryId,
            project.isAi || false,
            project.isNew || false,
            project.isInProgress || false,
            migratedCount
          ]);

          console.log(`  ✓ Проект: ${project.title?.ru || project.title}`);
          migratedCount++;

        } catch (error) {
          console.warn(`  ⚠️ Ошибка миграции проекта ${project.title}:`, error.message);
        }
      }

      console.log(`✅ Мигрировано ${migratedCount} проектов`);

    } catch (error) {
      console.error('❌ Ошибка миграции проектов:', error);
      throw error;
    }
  }

  /**
   * Мигрирует навыки
   */
  async migrateSkills() {
    try {
      console.log('🛠️ Миграция навыков...');

      const skillsPath = path.join(__dirname, '../../src/data/skillsData.js');
      const skillsContent = await fs.readFile(skillsPath, 'utf8');
      const skillsData = this.parseJSDataFile(skillsContent);

      let migratedCount = 0;

      for (const skill of skillsData) {
        try {
          await this.dbService.runQuery(`
            INSERT OR REPLACE INTO skills (
              name_ru, name_en, icon_path, sort_order
            ) VALUES (?, ?, ?, ?)
          `, [
            skill.name?.ru || skill.name || '',
            skill.name?.en || skill.name || '',
            skill.icon || '',
            migratedCount
          ]);

          console.log(`  ✓ Навык: ${skill.name?.ru || skill.name}`);
          migratedCount++;

        } catch (error) {
          console.warn(`  ⚠️ Ошибка миграции навыка ${skill.name}:`, error.message);
        }
      }

      console.log(`✅ Мигрировано ${migratedCount} навыков`);

    } catch (error) {
      console.error('❌ Ошибка миграции навыков:', error);
      throw error;
    }
  }

  /**
   * Мигрирует сертификаты
   */
  async migrateCertificates() {
    try {
      console.log('🏆 Миграция сертификатов...');

      const certificatesPath = path.join(__dirname, '../../src/data/certificatesData.js');
      const certificatesContent = await fs.readFile(certificatesPath, 'utf8');
      const certificatesData = this.parseJSDataFile(certificatesContent);

      let migratedCount = 0;

      for (const cert of certificatesData) {
        try {
          await this.dbService.runQuery(`
            INSERT OR REPLACE INTO certificates (
              title_ru, title_en, description_ru, description_en,
              image_path, link, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            cert.title?.ru || cert.title || null,
            cert.title?.en || cert.title || null,
            cert.description?.ru || cert.description || null,
            cert.description?.en || cert.description || null,
            cert.image || cert.src || '',
            cert.link || null,
            migratedCount
          ]);

          console.log(`  ✓ Сертификат: ${cert.title?.ru || cert.title || `Сертификат ${migratedCount + 1}`}`);
          migratedCount++;

        } catch (error) {
          console.warn(`  ⚠️ Ошибка миграции сертификата:`, error.message);
        }
      }

      console.log(`✅ Мигрировано ${migratedCount} сертификатов`);

    } catch (error) {
      console.error('❌ Ошибка миграции сертификатов:', error);
      throw error;
    }
  }

  /**
   * Мигрирует переводы в таблицы about_content и contacts
   */
  async migrateTranslations() {
    try {
      console.log('🌐 Миграция переводов...');

      // Читаем файлы переводов
      const ruPath = path.join(__dirname, '../../src/data/translations/ru.json');
      const enPath = path.join(__dirname, '../../src/data/translations/en.json');
      
      const ruContent = JSON.parse(await fs.readFile(ruPath, 'utf8'));
      const enContent = JSON.parse(await fs.readFile(enPath, 'utf8'));

      // Мигрируем контент "Обо мне"
      if (ruContent.about && enContent.about) {
        await this.dbService.runQuery(`
          INSERT OR REPLACE INTO about_content (id, content_ru, content_en)
          VALUES (1, ?, ?)
        `, [
          ruContent.about.description || '',
          enContent.about.description || ''
        ]);
        console.log('  ✓ Контент "Обо мне"');
      }

      // Мигрируем контактную информацию
      const contacts = {
        email: ruContent.contacts?.email || null,
        telegram: ruContent.contacts?.telegram || null,
        linkedin: ruContent.contacts?.linkedin || null,
        github: ruContent.contacts?.github || null
      };

      await this.dbService.runQuery(`
        INSERT OR REPLACE INTO contacts (id, email, telegram, linkedin, github)
        VALUES (1, ?, ?, ?, ?)
      `, [
        contacts.email,
        contacts.telegram,
        contacts.linkedin,
        contacts.github
      ]);
      console.log('  ✓ Контактная информация');

      console.log('✅ Переводы мигрированы');

    } catch (error) {
      console.error('❌ Ошибка миграции переводов:', error);
      throw error;
    }
  }

  /**
   * Простой парсер для JS файлов с данными
   * @param {string} content - Содержимое файла
   * @returns {Array} Массив данных
   */
  parseJSDataFile(content) {
    try {
      // Удаляем export и import строки
      let cleanContent = content
        .replace(/export\s+default\s+/, '')
        .replace(/export\s+/, '')
        .replace(/import.*from.*['"];?\s*/g, '')
        .replace(/const\s+\w+\s*=\s*/, '');

      // Находим массив или объект
      const match = cleanContent.match(/(\[[\s\S]*\])/);
      if (match) {
        // Заменяем одинарные кавычки на двойные для JSON
        let jsonString = match[1]
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":') // Добавляем кавычки к ключам
          .replace(/,\s*}/g, '}') // Убираем лишние запятые
          .replace(/,\s*]/g, ']');

        return JSON.parse(jsonString);
      }

      return [];
    } catch (error) {
      console.warn('Ошибка парсинга JS файла:', error.message);
      return [];
    }
  }

  /**
   * Проверяет, нужна ли миграция
   */
  async needsMigration() {
    try {
      if (!this.dbService.db) {
        await this.dbService.initialize();
      }

      // Проверяем, есть ли данные в таблицах
      const projectsCount = await this.dbService.getQuery('SELECT COUNT(*) as count FROM projects');
      const categoriesCount = await this.dbService.getQuery('SELECT COUNT(*) as count FROM categories');
      
      return projectsCount.count === 0 && categoriesCount.count === 0;
    } catch (error) {
      console.error('Ошибка проверки необходимости миграции:', error);
      return true; // В случае ошибки лучше попробовать мигрировать
    }
  }

  /**
   * Закрывает соединение с базой данных
   */
  async close() {
    if (this.dbService) {
      await this.dbService.close();
    }
  }
}

module.exports = MigrationService;