/**
 * API маршруты для управления сертификатами
 */

const express = require('express');
const { getDatabase, getAll, getOne } = require('../services/databaseService');

const router = express.Router();

/**
 * GET /api/certificates - Получить все сертификаты
 */
router.get('/', async (req, res) => {
  let db;
  
  try {
    db = await getDatabase();
    
    const { 
      hidden = 'false',
      sort = 'sort_order',
      order = 'ASC',
      limit,
      offset = 0
    } = req.query;
    
    let sql = 'SELECT * FROM certificates';
    const params = [];
    
    // Фильтрация по видимости
    if (hidden === 'false') {
      sql += ' WHERE is_hidden = 0';
    } else if (hidden === 'true') {
      sql += ' WHERE is_hidden = 1';
    }
    
    // Сортировка
    const allowedSortFields = ['id', 'title_ru', 'title_en', 'sort_order', 'date_issued', 'created_at'];
    const allowedOrder = ['ASC', 'DESC'];
    
    if (allowedSortFields.includes(sort) && allowedOrder.includes(order.toUpperCase())) {
      sql += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      sql += ' ORDER BY sort_order ASC';
    }
    
    // Пагинация
    if (limit && !isNaN(parseInt(limit))) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
    }
    
    const certificates = await getAll(db, sql, params);
    
    // Получаем общее количество для пагинации
    let totalCount = certificates.length;
    if (limit) {
      const countSql = hidden === 'false' ? 
        'SELECT COUNT(*) as count FROM certificates WHERE is_hidden = 0' :
        hidden === 'true' ?
        'SELECT COUNT(*) as count FROM certificates WHERE is_hidden = 1' :
        'SELECT COUNT(*) as count FROM certificates';
      
      const countResult = await getOne(db, countSql);
      totalCount = countResult.count;
    }
    
    res.json({
      success: true,
      data: certificates,
      count: certificates.length,
      total: totalCount,
      pagination: limit ? {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + certificates.length < totalCount
      } : null
    });
    
  } catch (error) {
    console.error('Ошибка при получении сертификатов:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATES_FETCH_ERROR',
        message: 'Ошибка при получении сертификатов',
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
 * GET /api/certificates/:id - Получить сертификат по ID
 */
router.get('/:id', async (req, res) => {
  let db;
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CERTIFICATE_ID',
          message: 'Некорректный ID сертификата'
        }
      });
    }
    
    db = await getDatabase();
    
    const certificate = await getOne(db, 'SELECT * FROM certificates WHERE id = ?', [parseInt(id)]);
    
    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: 'Сертификат не найден'
        }
      });
    }
    
    res.json({
      success: true,
      data: certificate
    });
    
  } catch (error) {
    console.error('Ошибка при получении сертификата:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATE_FETCH_ERROR',
        message: 'Ошибка при получении сертификата',
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