/**
 * API маршруты для управления навыками
 */

const express = require('express');
const { getDatabase, getAll, getOne, runQuery } = require('../services/databaseService');
const { authenticateAdmin } = require('../middleware/auth');
const { validateSkill, sanitizeSkill } = require('../middleware/validation');

const router = express.Router();

/**
 * GET /api/skills - Получить все навыки
 */
router.get('/', async (req, res) => {
  let db;
  
  try {
    db = await getDatabase();
    
    const { 
      includeHidden = 'false',
      sort = 'sort_order',
      order = 'ASC'
    } = req.query;
    
    let sql = 'SELECT * FROM skills';
    const params = [];
    
    // Фильтрация по видимости
    if (includeHidden === 'false') {
      sql += ' WHERE is_hidden = 0';
    } else if (includeHidden === 'true') {
      sql += ' WHERE is_hidden = 1';
    }
    // Если includeHidden не указан или 'all', показываем все навыки
    
    // Сортировка
    const allowedSortFields = ['id', 'name_ru', 'name_en', 'sort_order', 'created_at'];
    const allowedOrder = ['ASC', 'DESC'];
    
    if (allowedSortFields.includes(sort) && allowedOrder.includes(order.toUpperCase())) {
      sql += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      sql += ' ORDER BY sort_order ASC';
    }
    
    const skills = await getAll(db, sql, params);
    
    res.json({
      success: true,
      data: skills,
      count: skills.length
    });
    
  } catch (error) {
    console.error('Ошибка при получении навыков:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILLS_FETCH_ERROR',
        message: 'Ошибка при получении навыков',
        details: error.message
      }
    });
  } finally {
    if (db) {
      db.close();
    }
  }
});

/**
 * GET /api/skills/:id - Получить навык по ID
 */
router.get('/:id', async (req, res) => {
  let db;
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SKILL_ID',
          message: 'Некорректный ID навыка'
        }
      });
    }
    
    db = await getDatabase();
    
    const skill = await getOne(db, 'SELECT * FROM skills WHERE id = ?', [parseInt(id)]);
    
    if (!skill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Навык не найден'
        }
      });
    }
    
    res.json({
      success: true,
      data: skill
    });
    
  } catch (error) {
    console.error('Ошибка при получении навыка:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_FETCH_ERROR',
        message: 'Ошибка при получении навыка',
        details: error.message
      }
    });
  } finally {
    if (db) {
      db.close();
    }
  }
});

/**
 * POST /api/skills - Создать новый навык
 */
router.post('/', authenticateAdmin, validateSkill, async (req, res) => {
  let db;
  
  try {
    db = await getDatabase();
    
    // Санитизируем данные
    const skillData = sanitizeSkill(req.body);
    
    // Проверяем уникальность названий
    const existingRu = await getOne(db, 'SELECT id FROM skills WHERE name_ru = ?', [skillData.name_ru]);
    if (existingRu) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SKILL_NAME_RU_EXISTS',
          message: 'Навык с таким названием на русском уже существует'
        }
      });
    }
    
    const existingEn = await getOne(db, 'SELECT id FROM skills WHERE name_en = ?', [skillData.name_en]);
    if (existingEn) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SKILL_NAME_EN_EXISTS',
          message: 'Навык с таким названием на английском уже существует'
        }
      });
    }
    
    // Если sort_order не указан, устанавливаем следующий доступный
    if (skillData.sort_order === undefined || skillData.sort_order === null) {
      const maxOrder = await getOne(db, 'SELECT MAX(sort_order) as max_order FROM skills');
      skillData.sort_order = (maxOrder.max_order || 0) + 1;
    }
    
    // Создаем навык
    const result = await runQuery(db, `
      INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
      VALUES (?, ?, ?, ?, ?)
    `, [
      skillData.name_ru,
      skillData.name_en,
      skillData.icon_path,
      skillData.sort_order,
      skillData.is_hidden ? 1 : 0
    ]);
    
    // Получаем созданный навык
    const newSkill = await getOne(db, 'SELECT * FROM skills WHERE id = ?', [result.lastID]);
    
    res.status(201).json({
      success: true,
      data: newSkill
    });
    
  } catch (error) {
    console.error('Ошибка при создании навыка:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_CREATE_ERROR',
        message: 'Ошибка при создании навыка',
        details: error.message
      }
    });
  } finally {
    if (db) {
      db.close();
    }
  }
});

/**
 * PUT /api/skills/:id - Обновить навык
 */
router.put('/:id', authenticateAdmin, validateSkill, async (req, res) => {
  let db;
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SKILL_ID',
          message: 'Некорректный ID навыка'
        }
      });
    }
    
    db = await getDatabase();
    
    // Проверяем, существует ли навык
    const existingSkill = await getOne(db, 'SELECT * FROM skills WHERE id = ?', [parseInt(id)]);
    if (!existingSkill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Навык не найден'
        }
      });
    }
    
    // Санитизируем данные
    const skillData = sanitizeSkill(req.body);
    
    // Проверяем уникальность названий (исключая текущий навык)
    if (skillData.name_ru && skillData.name_ru !== existingSkill.name_ru) {
      const existingRu = await getOne(db, 'SELECT id FROM skills WHERE name_ru = ? AND id != ?', [skillData.name_ru, parseInt(id)]);
      if (existingRu) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SKILL_NAME_RU_EXISTS',
            message: 'Навык с таким названием на русском уже существует'
          }
        });
      }
    }
    
    if (skillData.name_en && skillData.name_en !== existingSkill.name_en) {
      const existingEn = await getOne(db, 'SELECT id FROM skills WHERE name_en = ? AND id != ?', [skillData.name_en, parseInt(id)]);
      if (existingEn) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SKILL_NAME_EN_EXISTS',
            message: 'Навык с таким названием на английском уже существует'
          }
        });
      }
    }
    
    // Подготавливаем данные для обновления
    const updateFields = [];
    const updateValues = [];
    
    if (skillData.name_ru !== undefined) {
      updateFields.push('name_ru = ?');
      updateValues.push(skillData.name_ru);
    }
    
    if (skillData.name_en !== undefined) {
      updateFields.push('name_en = ?');
      updateValues.push(skillData.name_en);
    }
    
    if (skillData.icon_path !== undefined) {
      updateFields.push('icon_path = ?');
      updateValues.push(skillData.icon_path);
    }
    
    if (skillData.sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      updateValues.push(skillData.sort_order);
    }
    
    if (skillData.is_hidden !== undefined) {
      updateFields.push('is_hidden = ?');
      updateValues.push(skillData.is_hidden ? 1 : 0);
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(parseInt(id));
    
    // Обновляем навык
    await runQuery(db, `
      UPDATE skills 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    // Получаем обновленный навык
    const updatedSkill = await getOne(db, 'SELECT * FROM skills WHERE id = ?', [parseInt(id)]);
    
    res.json({
      success: true,
      data: updatedSkill
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении навыка:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_UPDATE_ERROR',
        message: 'Ошибка при обновлении навыка',
        details: error.message
      }
    });
  } finally {
    if (db) {
      db.close();
    }
  }
});

/**
 * DELETE /api/skills/:id - Удалить навык
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  let db;
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SKILL_ID',
          message: 'Некорректный ID навыка'
        }
      });
    }
    
    db = await getDatabase();
    
    // Проверяем, существует ли навык
    const existingSkill = await getOne(db, 'SELECT * FROM skills WHERE id = ?', [parseInt(id)]);
    if (!existingSkill) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Навык не найден'
        }
      });
    }
    
    // Удаляем навык
    await runQuery(db, 'DELETE FROM skills WHERE id = ?', [parseInt(id)]);
    
    res.json({
      success: true,
      message: 'Навык успешно удален'
    });
    
  } catch (error) {
    console.error('Ошибка при удалении навыка:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILL_DELETE_ERROR',
        message: 'Ошибка при удалении навыка',
        details: error.message
      }
    });
  } finally {
    if (db) {
      db.close();
    }
  }
});

/**
 * PUT /api/skills/reorder - Изменить порядок навыков
 */
router.put('/reorder', authenticateAdmin, async (req, res) => {
  let db;
  
  try {
    const { skills } = req.body;
    
    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SKILLS_DATA',
          message: 'Некорректные данные навыков'
        }
      });
    }
    
    db = await getDatabase();
    
    // Обновляем порядок для каждого навыка
    for (const skill of skills) {
      if (!skill.id || skill.sort_order === undefined) {
        continue;
      }
      
      await runQuery(db, 
        'UPDATE skills SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [skill.sort_order, skill.id]
      );
    }
    
    res.json({
      success: true,
      message: 'Порядок навыков успешно обновлен'
    });
    
  } catch (error) {
    console.error('Ошибка при изменении порядка навыков:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SKILLS_REORDER_ERROR',
        message: 'Ошибка при изменении порядка навыков',
        details: error.message
      }
    });
  } finally {
    if (db) {
      db.close();
    }
  }
});

module.exports = router;