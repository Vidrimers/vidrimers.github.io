/**
 * Роуты для управления проектами портфолио
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateProject, sanitizeProject } = require('../middleware/validation');
const { getDbService, getTelegramService } = require('../services');

const router = express.Router();

/**
 * GET /api/projects
 * Получает все проекты (публичный эндпоинт)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, includeHidden = false } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';
    
    const dbService = getDbService();
    
    let sql = `
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Фильтр по категории
    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    // Скрываем скрытые проекты для обычных пользователей
    if (!isAdmin || includeHidden === 'false') {
      sql += ' AND p.is_hidden = FALSE';
    }

    sql += ' ORDER BY p.sort_order ASC, p.created_at DESC';

    const projects = await dbService.allQuery(sql, params);

    res.json({
      success: true,
      data: projects,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECTS_FETCH_ERROR',
        message: 'Ошибка получения проектов'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/projects/:id
 * Получает конкретный проект
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === 'admin';

    let sql = `
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;

    // Скрываем скрытые проекты для обычных пользователей
    if (!isAdmin) {
      sql += ' AND p.is_hidden = FALSE';
    }

    const project = await dbService.getQuery(sql, [id]);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения проекта:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_FETCH_ERROR',
        message: 'Ошибка получения проекта'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/projects
 * Создает новый проект (только для админа)
 */
router.post('/', requireAuth, sanitizeProject, validateProject, async (req, res) => {
  try {
    const {
      id,
      titleRu,
      titleEn,
      descriptionRu,
      descriptionEn,
      imagePath,
      link,
      categoryId,
      isAi = false,
      isNew = false,
      isInProgress = false,
      sortOrder = 0
    } = req.body;

    // Валидация обязательных полей
    if (!id || !titleRu || !titleEn || !descriptionRu || !descriptionEn || !categoryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Отсутствуют обязательные поля'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Проверяем, что категория существует
    const category = await dbService.getQuery('SELECT id FROM categories WHERE id = ?', [categoryId]);
    if (!category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: 'Указанная категория не существует'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Создаем проект
    await dbService.runQuery(`
      INSERT INTO projects (
        id, title_ru, title_en, description_ru, description_en,
        image_path, link, category_id, is_ai, is_new, is_in_progress, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, titleRu, titleEn, descriptionRu, descriptionEn,
      imagePath, link, categoryId, isAi, isNew, isInProgress, sortOrder
    ]);

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'CREATE_PROJECT',
      'project',
      id,
      { titleRu, titleEn, categoryId },
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Создан новый проект', {
        entityType: 'Проект',
        entityId: id,
        title: titleRu
      });
    }

    // Получаем созданный проект с данными категории
    const createdProject = await dbService.getQuery(`
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    res.status(201).json({
      success: true,
      data: createdProject,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROJECT_ID_EXISTS',
          message: 'Проект с таким ID уже существует'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_CREATE_ERROR',
        message: 'Ошибка создания проекта'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/projects/:id
 * Обновляет проект (только для админа)
 */
router.put('/:id', requireAuth, sanitizeProject, validateProject, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Проверяем, что проект существует
    const existingProject = await dbService.getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Если обновляется категория, проверяем её существование
    if (updates.categoryId) {
      const category = await dbService.getQuery('SELECT id FROM categories WHERE id = ?', [updates.categoryId]);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Указанная категория не существует'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Формируем SQL для обновления
    const allowedFields = [
      'title_ru', 'title_en', 'description_ru', 'description_en',
      'image_path', 'link', 'category_id', 'is_ai', 'is_new', 
      'is_in_progress', 'is_hidden', 'sort_order'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_VALID_FIELDS',
          message: 'Нет валидных полей для обновления'
        },
        timestamp: new Date().toISOString()
      });
    }

    updateValues.push(id);

    await dbService.runQuery(`
      UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'UPDATE_PROJECT',
      'project',
      id,
      updates,
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Обновлен проект', {
        entityType: 'Проект',
        entityId: id,
        title: updates.titleRu || existingProject.title_ru
      });
    }

    // Получаем обновленный проект
    const updatedProject = await dbService.getQuery(`
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    res.json({
      success: true,
      data: updatedProject,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка обновления проекта:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_UPDATE_ERROR',
        message: 'Ошибка обновления проекта'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Удаляет проект (только для админа)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, что проект существует
    const existingProject = await dbService.getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Проект не найден'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Удаляем проект
    await dbService.runQuery('DELETE FROM projects WHERE id = ?', [id]);

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'DELETE_PROJECT',
      'project',
      id,
      { titleRu: existingProject.title_ru },
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Удален проект', {
        entityType: 'Проект',
        entityId: id,
        title: existingProject.title_ru
      });
    }

    res.json({
      success: true,
      data: { message: 'Проект успешно удален' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка удаления проекта:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_DELETE_ERROR',
        message: 'Ошибка удаления проекта'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;