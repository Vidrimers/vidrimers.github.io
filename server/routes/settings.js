/**
 * Роуты для управления настройками сайта
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDbService } = require('../services');

const router = express.Router();

/**
 * GET /api/settings
 * Получает настройки сайта
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();
    
    // Получаем настройки из базы данных
    const settings = await dbService.getOne('SELECT * FROM site_settings WHERE id = 1');
    
    // Если настроек нет, возвращаем дефолтные
    const defaultSettings = {
      portfolio_sort_order: 'sort_order', // По умолчанию сортировка по sort_order
      portfolio_sort_direction: 'asc'
    };
    
    res.json({
      success: true,
      data: settings || defaultSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_FETCH_ERROR',
        message: 'Ошибка получения настроек'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/settings
 * Обновляет настройки сайта (только для админа)
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const { portfolioSortOrder, portfolioSortDirection } = req.body;
    
    const dbService = getDbService();
    
    // Валидация
    const validSortOrders = ['sort_order', 'created_at', 'project_date', 'likes_count', 'title_ru'];
    const validDirections = ['asc', 'desc'];
    
    if (portfolioSortOrder && !validSortOrders.includes(portfolioSortOrder)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SORT_ORDER',
          message: 'Недопустимый тип сортировки'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (portfolioSortDirection && !validDirections.includes(portfolioSortDirection)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SORT_DIRECTION',
          message: 'Недопустимое направление сортировки'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Проверяем, есть ли уже настройки
    const existingSettings = await dbService.getOne('SELECT * FROM site_settings WHERE id = 1');
    
    if (existingSettings) {
      // Обновляем существующие настройки по одному полю
      if (portfolioSortOrder !== undefined) {
        await dbService.runQuery(
          'UPDATE site_settings SET portfolio_sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
          [portfolioSortOrder]
        );
      }
      
      if (portfolioSortDirection !== undefined) {
        await dbService.runQuery(
          'UPDATE site_settings SET portfolio_sort_direction = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
          [portfolioSortDirection]
        );
      }
    } else {
      // Создаем новые настройки
      await dbService.runQuery(`
        INSERT INTO site_settings (
          id, portfolio_sort_order, portfolio_sort_direction
        ) VALUES (1, ?, ?)
      `, [
        portfolioSortOrder || 'sort_order',
        portfolioSortDirection || 'asc'
      ]);
    }

    // Получаем обновленные настройки
    const updatedSettings = await dbService.getOne('SELECT * FROM site_settings WHERE id = 1');

    res.json({
      success: true,
      data: updatedSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_UPDATE_ERROR',
        message: 'Ошибка обновления настроек'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;