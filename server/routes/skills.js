/**
 * API маршруты для управления навыками
 */

const express = require('express');
const { getDatabase, getAll, getOne } = require('../services/databaseService');

const router = express.Router();

/**
 * GET /api/skills - Получить все навыки
 */
router.get('/', async (req, res) => {
  let db;
  
  try {
    db = await getDatabase();
    
    const { 
      hidden = 'false',
      sort = 'sort_order',
      order = 'ASC'
    } = req.query;
    
    let sql = 'SELECT * FROM skills';
    const params = [];
    
    // Фильтрация по видимости
    if (hidden === 'false') {
      sql += ' WHERE is_hidden = 0';
    } else if (hidden === 'true') {
      sql += ' WHERE is_hidden = 1';
    }
    
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

module.exports = router;