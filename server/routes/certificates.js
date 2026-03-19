/**
 * API маршруты для управления сертификатами
 */

const express = require('express');
const { getDbService } = require('../services');
const { requireAuth } = require('../middleware/auth');
const { validateCertificate, sanitizeCertificate } = require('../middleware/validation');

const router = express.Router();

/**
 * GET /api/certificates - Получить все сертификаты
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();

    const {
      includeHidden = 'false',
      sort = 'sort_order',
      order = 'ASC',
      limit,
      offset = 0
    } = req.query;

    let sql = 'SELECT * FROM certificates';
    const params = [];

    // Фильтрация по видимости
    if (includeHidden === 'false') {
      sql += ' WHERE is_hidden = 0';
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

    const certificates = await dbService.allQuery(sql, params);

    res.json({
      success: true,
      data: certificates,
      count: certificates.length
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
  }
});

/**
 * PUT /api/certificates/reorder - Изменить порядок сертификатов
 * Должен быть ПЕРЕД /:id чтобы Express не воспринял "reorder" как ID
 */
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { certificates } = req.body;

    if (!Array.isArray(certificates)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Ожидается массив сертификатов'
        }
      });
    }

    const dbService = getDbService();

    for (const cert of certificates) {
      if (!cert.id || cert.sort_order === undefined) continue;

      await dbService.runQuery(
        'UPDATE certificates SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [cert.sort_order, cert.id]
      );
    }

    res.json({
      success: true,
      message: 'Порядок сертификатов успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка при изменении порядка сертификатов:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATES_REORDER_ERROR',
        message: 'Ошибка при изменении порядка сертификатов',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/certificates/:id - Получить сертификат по ID
 */
router.get('/:id', async (req, res) => {
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

    const dbService = getDbService();
    const certificate = await dbService.getQuery('SELECT * FROM certificates WHERE id = ?', [parseInt(id)]);

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
  }
});

/**
 * POST /api/certificates - Создать новый сертификат
 */
router.post('/', requireAuth, validateCertificate, async (req, res) => {
  try {
    const dbService = getDbService();
    const certData = sanitizeCertificate(req.body);

    // Если sort_order не указан — ставим следующий
    if (certData.sort_order === undefined || certData.sort_order === null) {
      const maxOrder = await dbService.getQuery('SELECT MAX(sort_order) as max_order FROM certificates');
      certData.sort_order = (maxOrder?.max_order || 0) + 1;
    }

    const result = await dbService.runQuery(`
      INSERT INTO certificates (title_ru, title_en, description_ru, description_en, image_path, link, date_issued, sort_order, is_hidden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      certData.title_ru || null,
      certData.title_en || null,
      certData.description_ru || null,
      certData.description_en || null,
      certData.image_path,
      certData.link || null,
      certData.date_issued || null,
      certData.sort_order,
      certData.is_hidden ? 1 : 0
    ]);

    const newCert = await dbService.getQuery('SELECT * FROM certificates WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: newCert
    });

  } catch (error) {
    console.error('Ошибка при создании сертификата:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATE_CREATE_ERROR',
        message: 'Ошибка при создании сертификата',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/certificates/:id - Обновить сертификат
 */
router.put('/:id', requireAuth, validateCertificate, async (req, res) => {
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

    const dbService = getDbService();

    const existing = await dbService.getQuery('SELECT * FROM certificates WHERE id = ?', [parseInt(id)]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: 'Сертификат не найден'
        }
      });
    }

    const certData = sanitizeCertificate(req.body);

    const updateFields = [];
    const updateValues = [];

    if (certData.title_ru !== undefined) { updateFields.push('title_ru = ?'); updateValues.push(certData.title_ru); }
    if (certData.title_en !== undefined) { updateFields.push('title_en = ?'); updateValues.push(certData.title_en); }
    if (certData.description_ru !== undefined) { updateFields.push('description_ru = ?'); updateValues.push(certData.description_ru); }
    if (certData.description_en !== undefined) { updateFields.push('description_en = ?'); updateValues.push(certData.description_en); }
    if (certData.image_path !== undefined) { updateFields.push('image_path = ?'); updateValues.push(certData.image_path); }
    if (certData.link !== undefined) { updateFields.push('link = ?'); updateValues.push(certData.link); }
    if (certData.date_issued !== undefined) { updateFields.push('date_issued = ?'); updateValues.push(certData.date_issued); }
    if (certData.sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(certData.sort_order); }
    if (certData.is_hidden !== undefined) { updateFields.push('is_hidden = ?'); updateValues.push(certData.is_hidden ? 1 : 0); }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(parseInt(id));

    await dbService.runQuery(
      `UPDATE certificates SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updated = await dbService.getQuery('SELECT * FROM certificates WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('Ошибка при обновлении сертификата:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATE_UPDATE_ERROR',
        message: 'Ошибка при обновлении сертификата',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/certificates/:id - Удалить сертификат
 */
router.delete('/:id', requireAuth, async (req, res) => {
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

    const dbService = getDbService();

    const existing = await dbService.getQuery('SELECT * FROM certificates WHERE id = ?', [parseInt(id)]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: 'Сертификат не найден'
        }
      });
    }

    await dbService.runQuery('DELETE FROM certificates WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Сертификат успешно удален'
    });

  } catch (error) {
    console.error('Ошибка при удалении сертификата:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATE_DELETE_ERROR',
        message: 'Ошибка при удалении сертификата',
        details: error.message
      }
    });
  }
});

module.exports = router;
