/**
 * API маршруты для управления контактной информацией
 */

const express = require('express');
const { getDbService } = require('../services');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/contacts - Получить контактную информацию
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();
    const contacts = await dbService.getQuery('SELECT * FROM contacts WHERE id = 1');

    if (!contacts) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTACTS_NOT_FOUND',
          message: 'Контактная информация не найдена'
        }
      });
    }

    // Парсим JSON для дополнительных ссылок
    let otherLinks = {};
    try {
      if (contacts.other_links) {
        otherLinks = JSON.parse(contacts.other_links);
      }
    } catch (parseError) {
      console.warn('Ошибка парсинга other_links:', parseError.message);
    }

    res.json({
      success: true,
      data: {
        id: contacts.id,
        email: contacts.email,
        telegram: contacts.telegram,
        linkedin: contacts.linkedin,
        github: contacts.github,
        otherLinks,
        updatedAt: contacts.updated_at
      }
    });
  } catch (error) {
    console.error('Ошибка при получении контактной информации:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACTS_FETCH_ERROR',
        message: 'Ошибка при получении контактной информации',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/contacts - Обновить контактную информацию (только для авторизованных)
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const { email, telegram, linkedin, github, otherLinks } = req.body;

    // Валидация email если указан
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Некорректный формат email'
        }
      });
    }

    // Валидация URL для ссылок
    const urlFields = { telegram, linkedin, github };
    for (const [field, value] of Object.entries(urlFields)) {
      if (value && value.trim() && !value.startsWith('http') && !value.startsWith('https')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: `Некорректный формат URL для поля ${field}`
          }
        });
      }
    }

    const otherLinksJson = otherLinks ? JSON.stringify(otherLinks) : '{}';

    // Проверяем существует ли запись
    const existing = await dbService.getQuery('SELECT id FROM contacts WHERE id = 1');

    if (existing) {
      await dbService.runQuery(`
        UPDATE contacts 
        SET email = ?, telegram = ?, linkedin = ?, github = ?, other_links = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        email || null,
        telegram || null,
        linkedin || null,
        github || null,
        otherLinksJson
      ]);
    } else {
      await dbService.runQuery(`
        INSERT INTO contacts (id, email, telegram, linkedin, github, other_links)
        VALUES (1, ?, ?, ?, ?, ?)
      `, [
        email || null,
        telegram || null,
        linkedin || null,
        github || null,
        otherLinksJson
      ]);
    }

    const updated = await dbService.getQuery('SELECT * FROM contacts WHERE id = 1');

    let parsedOtherLinks = {};
    try {
      if (updated.other_links) {
        parsedOtherLinks = JSON.parse(updated.other_links);
      }
    } catch (e) {
      // игнорируем ошибку парсинга
    }

    res.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        telegram: updated.telegram,
        linkedin: updated.linkedin,
        github: updated.github,
        otherLinks: parsedOtherLinks,
        updatedAt: updated.updated_at
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении контактной информации:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTACTS_UPDATE_ERROR',
        message: 'Ошибка при обновлении контактной информации',
        details: error.message
      }
    });
  }
});

module.exports = router;
