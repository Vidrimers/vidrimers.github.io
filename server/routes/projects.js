/**
 * Роуты для управления проектами портфолио
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validateProject, sanitizeProject } = require('../middleware/validation');
const { getDbService, getTelegramService, getFileService } = require('../services');
const { generateProjectId } = require('../utils/idGenerator');

const router = express.Router();

/**
 * GET /api/projects
 * Получает все проекты (публичный эндпоинт)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, includeHidden = false, sortBy = 'sort_order', sortDirection = 'asc' } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';
    
    const dbService = getDbService();
    
    // Валидация параметров сортировки
    const validSortFields = ['sort_order', 'created_at', 'title_ru', 'likes_count', 'project_date'];
    const validDirections = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'sort_order';
    const direction = validDirections.includes(sortDirection) ? sortDirection : 'asc';
    
    let sql = `
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en,
             COALESCE(l.likes_count, 0) as likes_count
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN likes l ON p.id = l.project_id
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

    // Добавляем сортировку
    if (sortField === 'likes_count') {
      sql += ` ORDER BY COALESCE(l.likes_count, 0) ${direction.toUpperCase()}`;
    } else if (sortField === 'project_date') {
      // Сортировка по дате создания проекта (год, месяц, день)
      sql += ` ORDER BY 
        CASE WHEN p.year IS NULL THEN 1 ELSE 0 END,
        p.year ${direction.toUpperCase()},
        CASE WHEN p.month IS NULL THEN 1 ELSE 0 END,
        p.month ${direction.toUpperCase()},
        CASE WHEN p.day IS NULL THEN 1 ELSE 0 END,
        p.day ${direction.toUpperCase()}`;
    } else {
      sql += ` ORDER BY p.${sortField} ${direction.toUpperCase()}`;
    }
    
    // Если сортируем не по sort_order, добавляем вторичную сортировку
    if (sortField !== 'sort_order' && sortField !== 'project_date') {
      sql += ', p.sort_order ASC';
    }

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

    const dbService = getDbService();

    let sql = `
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en,
             COALESCE(l.likes_count, 0) as likes_count
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN likes l ON p.id = l.project_id
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
      year,
      month,
      day,
      isAi = false,
      isNew = false,
      isInProgress = false,
      sortOrder = 0
    } = req.body;

    const dbService = getDbService();
    const telegramService = getTelegramService();

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
        image_path, link, category_id, year, month, day, is_ai, is_new, is_in_progress, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, titleRu, titleEn, descriptionRu, descriptionEn,
      imagePath, link, categoryId, year, month, day, isAi, isNew, isInProgress, sortOrder
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
router.put('/:id', requireAuth, sanitizeProject, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('PUT /api/projects/:id - начало обработки:', {
      projectId: id,
      updates: updates,
      user: req.user
    });

    const dbService = getDbService();
    const telegramService = getTelegramService();

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

    // Валидация только для обновляемых полей
    const errors = [];

    // Если обновляется название на русском
    if (updates.titleRu !== undefined) {
      if (!updates.titleRu || typeof updates.titleRu !== 'string' || !updates.titleRu.trim()) {
        errors.push('Название на русском языке обязательно');
      } else {
        const trimmed = updates.titleRu.trim();
        if (trimmed.length < 2) {
          errors.push('Название на русском должно содержать минимум 2 символа');
        } else if (trimmed.length > 100) {
          errors.push('Название на русском не должно превышать 100 символов');
        }
      }
    }

    // Если обновляется название на английском
    if (updates.titleEn !== undefined) {
      if (!updates.titleEn || typeof updates.titleEn !== 'string' || !updates.titleEn.trim()) {
        errors.push('Название на английском языке обязательно');
      } else {
        const trimmed = updates.titleEn.trim();
        if (trimmed.length < 2) {
          errors.push('Название на английском должно содержать минимум 2 символа');
        } else if (trimmed.length > 100) {
          errors.push('Название на английском не должно превышать 100 символов');
        }
      }
    }

    // Если обновляется описание на русском
    if (updates.descriptionRu !== undefined) {
      if (!updates.descriptionRu || typeof updates.descriptionRu !== 'string' || !updates.descriptionRu.trim()) {
        errors.push('Описание на русском языке обязательно');
      } else {
        const trimmed = updates.descriptionRu.trim();
        if (trimmed.length < 10) {
          errors.push('Описание на русском должно содержать минимум 10 символов');
        } else if (trimmed.length > 1000) {
          errors.push('Описание на русском не должно превышать 1000 символов');
        }
      }
    }

    // Если обновляется описание на английском
    if (updates.descriptionEn !== undefined) {
      if (!updates.descriptionEn || typeof updates.descriptionEn !== 'string' || !updates.descriptionEn.trim()) {
        errors.push('Описание на английском языке обязательно');
      } else {
        const trimmed = updates.descriptionEn.trim();
        if (trimmed.length < 10) {
          errors.push('Описание на английском должно содержать минимум 10 символов');
        } else if (trimmed.length > 1000) {
          errors.push('Описание на английском не должно превышать 1000 символов');
        }
      }
    }

    // Если есть ошибки валидации
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ошибки валидации данных',
          details: errors
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

    // Определяем, меняется ли категория
    const newCategoryId = updates.categoryId || existingProject.category_id;
    const isCategoryChanged = updates.categoryId && updates.categoryId !== existingProject.category_id;

    // Если категория меняется, генерируем новый ID
    let newProjectId = id;
    if (isCategoryChanged) {
      // Получаем все проекты для генерации нового ID
      const allProjects = await dbService.allQuery('SELECT id FROM projects');
      newProjectId = generateProjectId(newCategoryId, allProjects);
      
      console.log(`Смена категории: ${id} -> ${newProjectId} (категория: ${newCategoryId})`);
    }

    // Формируем SQL для обновления
    const allowedFields = [
      'title_ru', 'title_en', 'description_ru', 'description_en',
      'image_path', 'link', 'category_id', 'year', 'month', 'day', 'is_ai', 'is_new', 
      'is_in_progress', 'is_hidden', 'sort_order'
    ];

    // Ключи которые были переданы в оригинальном запросе (до sanitize)
    const originalKeys = req._originalKeys || new Set(Object.keys(updates));

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      // Пропускаем поля которые не были в оригинальном запросе (добавлены sanitize)
      if (!originalKeys.has(key)) continue;

      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0 && !isCategoryChanged) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_VALID_FIELDS',
          message: 'Нет валидных полей для обновления'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Если категория меняется, используем транзакцию для обновления всех связанных таблиц
    if (isCategoryChanged) {
      const db = dbService.getDb();

      // Хелперы для промисификации callback API
      const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
      });
      const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
      });
      const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
      });

      try {
        await dbRun('BEGIN TRANSACTION');

        // Обновляем ID проекта и категорию
        const projectFields = [...updateFields];
        const projectValues = [...updateValues];

        if (!projectFields.some(f => f.includes('category_id'))) {
          projectFields.push('category_id = ?');
          projectValues.push(newCategoryId);
        }
        projectFields.unshift('id = ?');
        projectValues.unshift(newProjectId);
        projectValues.pop(); // Убираем старый id из конца

        const sql = `UPDATE projects SET ${projectFields.join(', ')} WHERE id = ?`;
        projectValues.push(id);

        console.log('SQL обновления проекта:', sql, projectValues);
        await dbRun(sql, projectValues);

        // Обновляем лайки с обработкой конфликтов
        const existingLike = await dbGet('SELECT likes_count FROM likes WHERE project_id = ?', [newProjectId]);
        const oldLike = await dbGet('SELECT likes_count FROM likes WHERE project_id = ?', [id]);
        const oldCount = oldLike ? oldLike.likes_count : 0;

        if (existingLike) {
          const mergedCount = existingLike.likes_count + oldCount;
          await dbRun('UPDATE likes SET likes_count = ? WHERE project_id = ?', [mergedCount, newProjectId]);
          await dbRun('DELETE FROM likes WHERE project_id = ?', [id]);
        } else {
          await dbRun('UPDATE likes SET project_id = ? WHERE project_id = ?', [newProjectId, id]);
        }

        // Обновляем user_likes — удаляем старые (новые уже ссылается на новый id если были дубли)
        await dbRun('DELETE FROM user_likes WHERE project_id = ?', [id]);

        await dbRun('COMMIT');
        console.log('Транзакция завершена успешно:', id, '->', newProjectId);
      } catch (txErr) {
        console.error('Ошибка транзакции, откат:', txErr);
        try { await dbRun('ROLLBACK'); } catch (_) {}
        throw txErr;
      }
    } else {
      // Обычное обновление без смены ID
      updateValues.push(id);
      await dbService.runQuery(`
        UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?
      `, updateValues);
    }

    // Логируем активность
    await dbService.logActivity(
      req.user.userId,
      'UPDATE_PROJECT',
      'project',
      isCategoryChanged ? newProjectId : id,
      { ...updates, oldId: isCategoryChanged ? id : undefined, newId: isCategoryChanged ? newProjectId : undefined },
      req.ip,
      req.get('User-Agent')
    );

    // Отправляем уведомление в Telegram
    if (telegramService) {
      const notificationText = isCategoryChanged 
        ? `Проект перемещён в другую категорию (${id} -> ${newProjectId})`
        : 'Обновлен проект';
      await telegramService.sendActivityNotification(notificationText, {
        entityType: 'Проект',
        entityId: isCategoryChanged ? newProjectId : id,
        title: updates.titleRu || existingProject.title_ru
      });
    }

    // Получаем обновленный проект с новым ID
    const finalId = isCategoryChanged ? newProjectId : id;
    const updatedProject = await dbService.getQuery(`
      SELECT p.*, c.name_ru as category_name_ru, c.name_en as category_name_en
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [finalId]);

    res.json({
      success: true,
      data: updatedProject,
      moved: isCategoryChanged ? { from: id, to: newProjectId } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка обновления проекта:', error);
    console.error('Stack trace:', error.stack);
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

    const dbService = getDbService();
    const telegramService = getTelegramService();

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

    // Удаляем связанный файл изображения если он в /uploads
    if (existingProject.image_path && existingProject.image_path.startsWith('/uploads/')) {
      const fileService = getFileService();
      fileService.deleteFileByWebPath(existingProject.image_path);
    }

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