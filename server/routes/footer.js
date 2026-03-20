/**
 * API маршруты для управления текстами футера
 */

const express = require('express');
const { getDbService } = require('../services');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Дефолтные значения на случай если таблица пустая
const DEFAULTS = {
  title_ru: 'Контакты',
  title_en: 'Contacts',
  text_ru: 'Связаться со мной можно по данным ссылочкам',
  text_en: 'You can contact me through these links',
  send_message_ru: 'Отправить сообщение',
  send_message_en: 'Send message',
  find_me_ru: 'Найти меня можно',
  find_me_en: 'You can find me',
  on_social_ru: 'В линкедине и телеграме',
  on_social_en: 'On LinkedIn and Telegram',
  thanks_ru: 'СПАСИБО :-)',
  thanks_en: 'THANK YOU :-)',
  donate_ru: 'Донатная',
  donate_en: 'Donate'
};

const formatRow = (row) => ({
  ru: {
    title: row.title_ru,
    text: row.text_ru,
    sendMessage: row.send_message_ru,
    findMe: row.find_me_ru,
    onSocial: row.on_social_ru,
    thanks: row.thanks_ru,
    donate: row.donate_ru
  },
  en: {
    title: row.title_en,
    text: row.text_en,
    sendMessage: row.send_message_en,
    findMe: row.find_me_en,
    onSocial: row.on_social_en,
    thanks: row.thanks_en,
    donate: row.donate_en
  },
  updatedAt: row.updated_at
});

/**
 * GET /api/footer - Получить тексты футера (публичный)
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();
    const row = await dbService.getQuery('SELECT * FROM footer_content WHERE id = 1');

    if (!row) {
      return res.json({ success: true, data: formatRow({ ...DEFAULTS, updated_at: null }) });
    }

    res.json({ success: true, data: formatRow(row) });
  } catch (error) {
    console.error('Ошибка при получении текстов футера:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FOOTER_FETCH_ERROR', message: 'Ошибка при получении текстов футера' }
    });
  }
});

/**
 * PUT /api/footer - Обновить тексты футера (только для авторизованных)
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const { ru, en } = req.body;

    if (!ru || !en) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATA', message: 'Ожидаются объекты ru и en' }
      });
    }

    const existing = await dbService.getQuery('SELECT id FROM footer_content WHERE id = 1');

    if (existing) {
      await dbService.runQuery(`
        UPDATE footer_content SET
          title_ru = ?, title_en = ?,
          text_ru = ?, text_en = ?,
          send_message_ru = ?, send_message_en = ?,
          find_me_ru = ?, find_me_en = ?,
          on_social_ru = ?, on_social_en = ?,
          thanks_ru = ?, thanks_en = ?,
          donate_ru = ?, donate_en = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        ru.title || DEFAULTS.title_ru, en.title || DEFAULTS.title_en,
        ru.text || DEFAULTS.text_ru, en.text || DEFAULTS.text_en,
        ru.sendMessage || DEFAULTS.send_message_ru, en.sendMessage || DEFAULTS.send_message_en,
        ru.findMe || DEFAULTS.find_me_ru, en.findMe || DEFAULTS.find_me_en,
        ru.onSocial || DEFAULTS.on_social_ru, en.onSocial || DEFAULTS.on_social_en,
        ru.thanks || DEFAULTS.thanks_ru, en.thanks || DEFAULTS.thanks_en,
        ru.donate || DEFAULTS.donate_ru, en.donate || DEFAULTS.donate_en
      ]);
    } else {
      await dbService.runQuery(`
        INSERT INTO footer_content (id, title_ru, title_en, text_ru, text_en, send_message_ru, send_message_en, find_me_ru, find_me_en, on_social_ru, on_social_en, thanks_ru, thanks_en, donate_ru, donate_en)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ru.title || DEFAULTS.title_ru, en.title || DEFAULTS.title_en,
        ru.text || DEFAULTS.text_ru, en.text || DEFAULTS.text_en,
        ru.sendMessage || DEFAULTS.send_message_ru, en.sendMessage || DEFAULTS.send_message_en,
        ru.findMe || DEFAULTS.find_me_ru, en.findMe || DEFAULTS.find_me_en,
        ru.onSocial || DEFAULTS.on_social_ru, en.onSocial || DEFAULTS.on_social_en,
        ru.thanks || DEFAULTS.thanks_ru, en.thanks || DEFAULTS.thanks_en,
        ru.donate || DEFAULTS.donate_ru, en.donate || DEFAULTS.donate_en
      ]);
    }

    const updated = await dbService.getQuery('SELECT * FROM footer_content WHERE id = 1');
    res.json({ success: true, data: formatRow(updated) });
  } catch (error) {
    console.error('Ошибка при обновлении текстов футера:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FOOTER_UPDATE_ERROR', message: 'Ошибка при обновлении текстов футера' }
    });
  }
});

module.exports = router;
