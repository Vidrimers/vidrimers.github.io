/**
 * API маршруты для управления контентом "Обо мне"
 */

const express = require('express');
const DOMPurify = require('isomorphic-dompurify');
const { getDbService } = require('../services');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/about - Получить контент "Обо мне"
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();
    const aboutContent = await dbService.getQuery('SELECT * FROM about_content WHERE id = 1');

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
      rawContentRu: aboutContent.content_ru,
      rawContentEn: aboutContent.content_en,
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
  }
});

/**
 * PUT /api/about - Обновить контент "Обо мне" (только для авторизованных)
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const { contentRu, contentEn } = req.body;

    // Валидация обязательных полей
    if (!contentRu || typeof contentRu !== 'string' || !contentRu.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Контент на русском языке обязателен'
        }
      });
    }

    if (!contentEn || typeof contentEn !== 'string' || !contentEn.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Контент на английском языке обязателен'
        }
      });
    }

    const dbService = getDbService();

    // Санитизация rich text контента — разрешаем безопасные теги форматирования
    const allowedTags = ['a', 'strong', 'em', 'b', 'i', 'br', 'p', 'span'];
    const allowedAttr = ['href', 'target', 'rel'];
    const sanitizedRu = DOMPurify.sanitize(contentRu.trim(), {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttr
    });
    const sanitizedEn = DOMPurify.sanitize(contentEn.trim(), {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttr
    });

    // Проверяем существование записи
    const existing = await dbService.getQuery('SELECT id FROM about_content WHERE id = 1');

    if (existing) {
      // Обновляем существующую запись
      await dbService.runQuery(
        `UPDATE about_content 
         SET content_ru = ?, content_en = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = 1`,
        [sanitizedRu, sanitizedEn]
      );
    } else {
      // Создаём запись если её нет
      await dbService.runQuery(
        `INSERT INTO about_content (id, content_ru, content_en) VALUES (1, ?, ?)`,
        [sanitizedRu, sanitizedEn]
      );
    }

    // Возвращаем обновлённые данные
    const updated = await dbService.getQuery('SELECT * FROM about_content WHERE id = 1');

    res.json({
      success: true,
      data: {
        id: updated.id,
        contentRu: updated.content_ru.split('\n\n'),
        contentEn: updated.content_en.split('\n\n'),
        rawContentRu: updated.content_ru,
        rawContentEn: updated.content_en,
        updatedAt: updated.updated_at
      }
    });

  } catch (error) {
    console.error('Ошибка при обновлении контента "Обо мне":', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ABOUT_UPDATE_ERROR',
        message: 'Ошибка при обновлении контента "Обо мне"',
        details: error.message
      }
    });
  }
});

module.exports = router;
