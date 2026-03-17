/**
 * API маршруты для управления контактной информацией
 */

const express = require('express');
const { getDatabase, getOne } = require('../services/databaseService');

const router = express.Router();

/**
 * GET /api/contacts - Получить контактную информацию
 */
router.get('/', async (req, res) => {
  let db;
  
  try {
    db = await getDatabase();
    
    const contacts = await getOne(db, 'SELECT * FROM contacts WHERE id = 1');
    
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
    
    const data = {
      id: contacts.id,
      email: contacts.email,
      telegram: contacts.telegram,
      linkedin: contacts.linkedin,
      github: contacts.github,
      otherLinks: otherLinks,
      updatedAt: contacts.updated_at
    };
    
    res.json({
      success: true,
      data: data
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
  } finally {
    if (db) {
      db.close();
    }
  }
});

module.exports = router;