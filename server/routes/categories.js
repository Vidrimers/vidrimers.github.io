/**
 * Роуты для управления категориями портфолио
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getDbService, getTelegramService } = require('../services');

const router = express.Router();

/**
 * GET /api/categories
 * Получает все категории (публичный эндпоинт)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { includeHidden = false } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';
    
    const dbService = getDbService();
    
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];

    // Скрываем скрытые категории для обычных пользователей
    if (!isAdmin || includeHidden === 'false') {
      sql += ' AND is_hidden = FALSE';
    }

    sql += ' ORDER BY sort_order ASC, created_at ASC';

    const categories = await dbService.allQuery(sql, params);

    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORIES_FETCH_ERROR',
        message: 'Ошибка получения категорий'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/categories/:id
 * Получает конкретную категорию
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === 'admin';

    const dbService = getDbService();

    let sql = 'SELECT * FROM categories WHERE id = ?';
    const params = [id];

    // Скрываем скрытые категории для обычных пользователей
    if (!isAdmin) {
      sql += ' AND is_hidden = FALSE';
    }

    const category = await dbService.getQuery(sql, params);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Категория не найдена'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: category,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения категории:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_FETCH_ERROR',
        message: 'Ошибка получения категории'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/categories
 * Создает новую категорию (только для админа)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      id,
      nameRu,
      nameEn,
      sortOrder = 0
    } = req.body;

    // Валидация обязательных полей
    if (!id || !nameRu || !nameEn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Отсутствуют обязательные поля (id, nameRu, nameEn)'
        },
        timestamp: new Date().toISOString()
      });
    }

    const dbService = getDbService();
    const telegramService = getTelegramService();

    // Создаем категорию
    await dbService.runQuery(`
      INSERT INTO categories (id, name_ru, name_en, sort_order)
      VALUES (?, ?, ?, ?)
    `, [id, nameRu, nameEn, sortOrder]);

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'CREATE_CATEGORY',
      'category',
      id,
      { nameRu, nameEn },
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Создана новая категория', {
        entityType: 'Категория',
        entityId: id,
        title: nameRu
      });
    }

    // Получаем созданную категорию
    const createdCategory = await dbService.getQuery('SELECT * FROM categories WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: createdCategory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка создания категории:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_ID_EXISTS',
          message: 'Категория с таким ID уже существует'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_CREATE_ERROR',
        message: 'Ошибка создания категории'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/categories/:id
 * Обновляет категорию (только для админа)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dbService = getDbService();
    const telegramService = getTelegramService();

    // Проверяем, что категория существует
    const existingCategory = await dbService.getQuery('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Категория не найдена'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Формируем SQL для обновления
    const allowedFields = ['name_ru', 'name_en', 'sort_order', 'is_hidden'];
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
      UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'UPDATE_CATEGORY',
      'category',
      id,
      updates,
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Обновлена категория', {
        entityType: 'Категория',
        entityId: id,
        title: updates.nameRu || existingCategory.name_ru
      });
    }

    // Получаем обновленную категорию
    const updatedCategory = await dbService.getQuery('SELECT * FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedCategory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_UPDATE_ERROR',
        message: 'Ошибка обновления категории'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/categories/:id
 * Удаляет категорию (только для админа)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const dbService = getDbService();
    const telegramService = getTelegramService();

    // Проверяем, что категория существует
    const existingCategory = await dbService.getQuery('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Категория не найдена'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Проверяем, что категория не используется в проектах
    const projectsCount = await dbService.getQuery(
      'SELECT COUNT(*) as count FROM projects WHERE category_id = ?',
      [id]
    );

    if (projectsCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: `Категория используется в ${projectsCount.count} проект(ах). Удалите или переместите проекты перед удалением категории.`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Удаляем категорию
    await dbService.runQuery('DELETE FROM categories WHERE id = ?', [id]);

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'DELETE_CATEGORY',
      'category',
      id,
      { nameRu: existingCategory.name_ru },
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      await telegramService.sendActivityNotification('Удалена категория', {
        entityType: 'Категория',
        entityId: id,
        title: existingCategory.name_ru
      });
    }

    res.json({
      success: true,
      data: { message: 'Категория успешно удалена' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_DELETE_ERROR',
        message: 'Ошибка удаления категории'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/categories/:id/projects
 * Получает все проекты в категории
 */
router.get('/:id/projects', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { includeHidden = false } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';

    const dbService = getDbService();

    // Проверяем, что категория существует
    let categoryCheck = 'SELECT * FROM categories WHERE id = ?';
    if (!isAdmin) {
      categoryCheck += ' AND is_hidden = FALSE';
    }

    const category = await dbService.getQuery(categoryCheck, [id]);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Категория не найдена'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Получаем проекты категории
    let sql = 'SELECT * FROM projects WHERE category_id = ?';
    const params = [id];

    if (!isAdmin || includeHidden === 'false') {
      sql += ' AND is_hidden = FALSE';
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC';

    const projects = await dbService.allQuery(sql, params);

    res.json({
      success: true,
      data: {
        category: category,
        projects: projects,
        count: projects.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения проектов категории:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_PROJECTS_FETCH_ERROR',
        message: 'Ошибка получения проектов категории'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;