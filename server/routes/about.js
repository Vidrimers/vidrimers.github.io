/**
 * API маршруты для управления контентом "Обо мне"
 */

const express = require('express');
const { getDatabase, getOne } = require('../services/databaseService');

const router = express.Router();

/**
 * GET /api/about - Получить контент "Обо мне"
 */
router.get('/', async (req, res) => {
  let db;
  
  try {
    db = await getDatabase();
    
    const aboutContent = await getOne(db, 'SELECT * FROM about_content WHERE id = 1');
    
    if (!aboutContent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ABOUT_CONTENT_NOT_FOUND',
          message: 'Контент "Обо мне" не найден'
        }
      });
    }
    
    // Преобразуем контент в массивы параграфов для совместимости с фронтендом
    const data = {
      id: aboutContent.id,
      contentRu: aboutContent.content_ru.split('\n\n'),
      contentEn: aboutContent.content_en.split('\n\n'),
      updatedAt: aboutContent.updated_at
    };
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Ошибка при получении контента "Обо мне":', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ABOUT_FETCH_ERROR',
        message: 'Ошибка при получении контента "Обо мне"',
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