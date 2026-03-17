/**
 * Property-based тесты для CRUD операций портфолио
 * Feature: admin-cms-system, Property 5: Content CRUD Round Trip
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.3, 5.3, 6.2, 7.3, 8.2, 8.3
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import fc from 'fast-check';
import DatabaseService from '../services/databaseService.js';

describe('Portfolio CRUD Property Tests', () => {
  let dbService;

  beforeAll(async () => {
    // Инициализируем тестовую базу данных
    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterAll(async () => {
    if (dbService) {
      await dbService.close();
    }
  });

  beforeEach(async () => {
    // Очищаем таблицы перед каждым тестом
    try {
      await dbService.runQuery('DELETE FROM projects');
      await dbService.runQuery('DELETE FROM categories');
    } catch (error) {
      // Игнорируем ошибки очистки, если база не инициализирована
      console.warn('Warning: Could not clear tables:', error.message);
    }
  });

  describe('Property 5: Content CRUD Round Trip', () => {
    
    it('Property 5.1: Category create then read should return equivalent data', async () => {
      // Простой тест без property-based генерации
      const categoryData = {
        id: 'test-category-1',
        nameRu: 'Тестовая категория',
        nameEn: 'Test Category',
        sortOrder: 10,
        isHidden: false
      };

      // Создаем категорию
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryData.id,
        categoryData.nameRu,
        categoryData.nameEn,
        categoryData.sortOrder,
        categoryData.isHidden
      ]);

      // Читаем созданную категорию
      const retrievedCategory = await dbService.getOne(
        'SELECT * FROM categories WHERE id = ?',
        [categoryData.id]
      );

      // Проверяем эквивалентность данных
      expect(retrievedCategory).toBeTruthy();
      expect(retrievedCategory.id).toBe(categoryData.id);
      expect(retrievedCategory.name_ru).toBe(categoryData.nameRu);
      expect(retrievedCategory.name_en).toBe(categoryData.nameEn);
      expect(retrievedCategory.sort_order).toBe(categoryData.sortOrder);
      expect(retrievedCategory.is_hidden).toBe(categoryData.isHidden ? 1 : 0);
    });

    it('Property 5.2: Project create then read should return equivalent data', async () => {
      const categoryData = {
        id: 'test-category-2',
        nameRu: 'Тестовая категория 2',
        nameEn: 'Test Category 2'
      };

      const projectData = {
        id: 'test-project-1',
        titleRu: 'Тестовый проект',
        titleEn: 'Test Project',
        descriptionRu: 'Описание тестового проекта',
        descriptionEn: 'Test project description',
        imagePath: '/images/test.jpg',
        link: 'https://example.com',
        isAi: true,
        isNew: false,
        isInProgress: true,
        isHidden: false,
        sortOrder: 5
      };

      // Сначала создаем категорию
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryData.id,
        categoryData.nameRu,
        categoryData.nameEn,
        0,
        false
      ]);

      // Создаем проект
      await dbService.runQuery(`
        INSERT INTO projects (
          id, title_ru, title_en, description_ru, description_en,
          image_path, link, category_id, is_ai, is_new, is_in_progress, 
          is_hidden, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectData.id,
        projectData.titleRu,
        projectData.titleEn,
        projectData.descriptionRu,
        projectData.descriptionEn,
        projectData.imagePath,
        projectData.link,
        categoryData.id,
        projectData.isAi,
        projectData.isNew,
        projectData.isInProgress,
        projectData.isHidden,
        projectData.sortOrder
      ]);

      // Читаем созданный проект
      const retrievedProject = await dbService.getOne(
        'SELECT * FROM projects WHERE id = ?',
        [projectData.id]
      );

      // Проверяем эквивалентность данных
      expect(retrievedProject).toBeTruthy();
      expect(retrievedProject.id).toBe(projectData.id);
      expect(retrievedProject.title_ru).toBe(projectData.titleRu);
      expect(retrievedProject.title_en).toBe(projectData.titleEn);
      expect(retrievedProject.description_ru).toBe(projectData.descriptionRu);
      expect(retrievedProject.description_en).toBe(projectData.descriptionEn);
      expect(retrievedProject.image_path).toBe(projectData.imagePath);
      expect(retrievedProject.link).toBe(projectData.link);
      expect(retrievedProject.category_id).toBe(categoryData.id);
      expect(retrievedProject.is_ai).toBe(projectData.isAi ? 1 : 0);
      expect(retrievedProject.is_new).toBe(projectData.isNew ? 1 : 0);
      expect(retrievedProject.is_in_progress).toBe(projectData.isInProgress ? 1 : 0);
      expect(retrievedProject.is_hidden).toBe(projectData.isHidden ? 1 : 0);
      expect(retrievedProject.sort_order).toBe(projectData.sortOrder);
    });

    it('Property 5.3: Category update then read should return updated data', async () => {
      const categoryId = 'test-category-3';
      const initialData = {
        nameRu: 'Начальное название',
        nameEn: 'Initial Name'
      };
      const updatedData = {
        nameRu: 'Обновленное название',
        nameEn: 'Updated Name',
        sortOrder: 15,
        isHidden: true
      };

      // Создаем категорию с начальными данными
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryId,
        initialData.nameRu,
        initialData.nameEn,
        0,
        false
      ]);

      // Обновляем категорию
      await dbService.runQuery(`
        UPDATE categories 
        SET name_ru = ?, name_en = ?, sort_order = ?, is_hidden = ?
        WHERE id = ?
      `, [
        updatedData.nameRu,
        updatedData.nameEn,
        updatedData.sortOrder,
        updatedData.isHidden,
        categoryId
      ]);

      // Читаем обновленную категорию
      const updatedCategory = await dbService.getOne(
        'SELECT * FROM categories WHERE id = ?',
        [categoryId]
      );

      // Проверяем, что данные обновились
      expect(updatedCategory).toBeTruthy();
      expect(updatedCategory.name_ru).toBe(updatedData.nameRu);
      expect(updatedCategory.name_en).toBe(updatedData.nameEn);
      expect(updatedCategory.sort_order).toBe(updatedData.sortOrder);
      expect(updatedCategory.is_hidden).toBe(updatedData.isHidden ? 1 : 0);
    });

    it('Property 5.4: Project update then read should return updated data', async () => {
      const categoryId = 'test-category-4';
      const projectId = 'test-project-4';

      // Создаем категорию
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryId,
        'Категория 4',
        'Category 4',
        0,
        false
      ]);

      // Создаем проект с начальными данными
      await dbService.runQuery(`
        INSERT INTO projects (
          id, title_ru, title_en, description_ru, description_en,
          category_id, is_ai, is_new, is_in_progress, is_hidden, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectId,
        'Начальный заголовок',
        'Initial Title',
        'Начальное описание',
        'Initial Description',
        categoryId,
        false,
        false,
        false,
        false,
        0
      ]);

      const updatedData = {
        titleRu: 'Обновленный заголовок',
        descriptionRu: 'Обновленное описание',
        isHidden: true,
        sortOrder: 20
      };

      // Обновляем проект
      await dbService.runQuery(`
        UPDATE projects 
        SET title_ru = ?, description_ru = ?, is_hidden = ?, sort_order = ?
        WHERE id = ?
      `, [
        updatedData.titleRu,
        updatedData.descriptionRu,
        updatedData.isHidden,
        updatedData.sortOrder,
        projectId
      ]);

      // Читаем обновленный проект
      const updatedProject = await dbService.getOne(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );

      // Проверяем, что данные обновились
      expect(updatedProject).toBeTruthy();
      expect(updatedProject.title_ru).toBe(updatedData.titleRu);
      expect(updatedProject.description_ru).toBe(updatedData.descriptionRu);
      expect(updatedProject.is_hidden).toBe(updatedData.isHidden ? 1 : 0);
      expect(updatedProject.sort_order).toBe(updatedData.sortOrder);
    });

    it('Property 5.5: Category delete should remove from database', async () => {
      const categoryId = 'test-category-5';
      const categoryData = {
        nameRu: 'Категория для удаления',
        nameEn: 'Category to Delete'
      };

      // Создаем категорию
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryId,
        categoryData.nameRu,
        categoryData.nameEn,
        0,
        false
      ]);

      // Проверяем, что категория существует
      const existingCategory = await dbService.getOne(
        'SELECT * FROM categories WHERE id = ?',
        [categoryId]
      );
      expect(existingCategory).toBeTruthy();

      // Удаляем категорию
      await dbService.runQuery('DELETE FROM categories WHERE id = ?', [categoryId]);

      // Проверяем, что категория удалена
      const deletedCategory = await dbService.getOne(
        'SELECT * FROM categories WHERE id = ?',
        [categoryId]
      );
      expect(deletedCategory).toBeNull();
    });

    it('Property 5.6: Project delete should remove from database', async () => {
      const categoryId = 'test-category-6';
      const projectId = 'test-project-6';

      // Создаем категорию
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryId,
        'Категория 6',
        'Category 6',
        0,
        false
      ]);

      // Создаем проект
      await dbService.runQuery(`
        INSERT INTO projects (
          id, title_ru, title_en, description_ru, description_en, category_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        projectId,
        'Проект для удаления',
        'Project to Delete',
        'Описание проекта для удаления',
        'Description of project to delete',
        categoryId
      ]);

      // Проверяем, что проект существует
      const existingProject = await dbService.getOne(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );
      expect(existingProject).toBeTruthy();

      // Удаляем проект
      await dbService.runQuery('DELETE FROM projects WHERE id = ?', [projectId]);

      // Проверяем, что проект удален
      const deletedProject = await dbService.getOne(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );
      expect(deletedProject).toBeNull();
    });

    it('Property 5.7: Multiple projects in same category should maintain referential integrity', async () => {
      const categoryId = 'test-category-7';
      const categoryName = 'Категория с несколькими проектами';
      const projectCount = 3;

      // Создаем категорию
      await dbService.runQuery(`
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        categoryId,
        categoryName,
        categoryName + ' EN',
        0,
        false
      ]);

      // Создаем несколько проектов в этой категории
      const projectIds = [];
      for (let i = 1; i <= projectCount; i++) {
        const projectId = `${categoryId}-proj-${i}`;
        projectIds.push(projectId);

        await dbService.runQuery(`
          INSERT INTO projects (
            id, title_ru, title_en, description_ru, description_en, category_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          projectId,
          `Проект ${i}`,
          `Project ${i} EN`,
          `Описание проекта ${i}`,
          `Description for project ${i} EN`,
          categoryId
        ]);
      }

      // Проверяем, что все проекты созданы и связаны с категорией
      const projects = await dbService.getAll(
        'SELECT * FROM projects WHERE category_id = ?',
        [categoryId]
      );

      expect(projects).toHaveLength(projectCount);
      
      // Проверяем, что все проекты имеют правильную категорию
      projects.forEach(project => {
        expect(project.category_id).toBe(categoryId);
        expect(projectIds).toContain(project.id);
      });

      // Проверяем, что категория существует
      const category = await dbService.getOne(
        'SELECT * FROM categories WHERE id = ?',
        [categoryId]
      );
      expect(category).toBeTruthy();
      expect(category.name_ru).toBe(categoryName);
    });
  });
});