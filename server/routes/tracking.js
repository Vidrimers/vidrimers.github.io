const express = require('express');
const { getDbService, getTelegramService } = require('../services');

const router = express.Router();

// Кеш геолокации (ip -> country)
const geoCache = new Map();

// Получение страны по IP (через ip-api.com, бесплатный)
async function getCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return 'Локальная сеть';
  }
  if (geoCache.has(ip)) return geoCache.get(ip);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    const country = data.country || 'Неизвестно';
    geoCache.set(ip, country);
    return country;
  } catch {
    geoCache.set(ip, 'Неизвестно');
    return 'Неизвестно';
  }
}

// POST /api/track/visit — логирование визита
router.post('/visit', async (req, res) => {
  try {
    const { path: visitPath, visitorId, browser, os, isAdmin } = req.body;
    const vid = visitorId || 'unknown';

    // Полностью пропускаем исключённых и админов
    if (isAdmin || (await isVisitorExcluded(vid))) {
      return res.json({ ok: true });
    }

    const dbService = getDbService();
    await dbService.runQuery(
      'INSERT INTO visits (ip, country, user_agent, path) VALUES (?, ?, ?, ?)',
      [vid, `${browser || ''} / ${os || ''}`, (req.headers['user-agent'] || '').slice(0, 200), visitPath || '/']
    );

    // Telegram
    const existing = await dbService.getQuery(
      'SELECT COUNT(*) as cnt FROM visits WHERE ip = ? AND id != (SELECT MAX(id) FROM visits WHERE ip = ?)',
      [vid, vid]
    );
    const telegramService = getTelegramService();
    if (telegramService) {
      const isNew = existing && existing.cnt === 0;
      const label = isNew ? '🌐 Новый посетитель' : '🔄 Повторный визит';
      const visitorName = await getVisitorName(vid);
      const lines = [
        `Браузер: ${browser || '?'}`,
        `ОС: ${os || '?'}`
      ];
      if (visitorName) lines.push(`Специальное имя: ${visitorName}`);
      await telegramService.sendActivityNotification(label, {
        entityType: 'Посетитель',
        entityId: vid,
        body: lines.join('\n')
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка трекинга визита:', error.message);
    res.json({ ok: true });
  }
});

// POST /api/track/click — логирование клика по ссылке
router.post('/click', async (req, res) => {
  try {
    const { type, entityId, linkUrl, visitorId, isAdmin } = req.body;
    const vid = visitorId || 'unknown';

    // Полностью пропускаем исключённых и админов
    if (isAdmin || (await isVisitorExcluded(vid))) {
      return res.json({ ok: true });
    }

    const dbService = getDbService();

    // Подтягиваем название проекта
    let entityName = '';
    if (entityId && type === 'project') {
      const project = await dbService.getQuery('SELECT title_ru FROM projects WHERE id = ?', [entityId]);
      entityName = project ? project.title_ru : entityId;
    }

    await dbService.runQuery(
      'INSERT INTO link_clicks (type, entity_id, entity_name, link_url, ip, country) VALUES (?, ?, ?, ?, ?, ?)',
      [type || 'project', entityId || null, entityName, linkUrl || '', vid, '']
    );

    // Telegram
    const telegramService = getTelegramService();
    if (telegramService && entityId) {
      const visitorName = await getVisitorName(vid);
      const label = type === 'donate' ? '💰 Donate нажат' : `🔗 ${entityName || entityId} открыт`;
      const lines = [];
      if (visitorName) lines.push(`Специальное имя: ${visitorName}`);
      await telegramService.sendActivityNotification(label, {
        entityType: type,
        entityId,
        body: lines.length > 0 ? lines.join('\n') : undefined
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка трекинга клика:', error.message);
    res.json({ ok: true });
  }
});

// GET /api/track/stats — статистика для админки
router.get('/stats', async (req, res) => {
  try {
    const dbService = getDbService();

    const totalVisits = (await dbService.getQuery('SELECT COUNT(*) as c FROM visits')).c;
    const uniqueVisitors = (await dbService.getQuery('SELECT COUNT(DISTINCT ip) as c FROM visits')).c;
    const totalClicks = (await dbService.getQuery('SELECT COUNT(*) as c FROM link_clicks')).c;
    const totalLikes = (await dbService.getQuery('SELECT COUNT(*) as c FROM user_likes')).c;
    const donateClicks = (await dbService.getQuery("SELECT COUNT(*) as c FROM link_clicks WHERE type = 'donate'")).c;

    // Браузеры
    const browsers = await dbService.allQuery(
      "SELECT country as browser, COUNT(*) as cnt FROM visits WHERE country LIKE '%/%' GROUP BY country ORDER BY cnt DESC LIMIT 10"
    );

    // Топ проектов по кликам
    const topProjects = await dbService.allQuery(
      "SELECT entity_id, entity_name, COUNT(*) as cnt FROM link_clicks WHERE type = 'project' AND entity_id IS NOT NULL GROUP BY entity_id ORDER BY cnt DESC LIMIT 10"
    );

    // Последние визиты
    const recentVisits = await dbService.allQuery(
      'SELECT ip as visitor_id, country as browser_info, path, created_at FROM visits ORDER BY created_at DESC LIMIT 30'
    );

    // Лайки по посетителям
    const likesByVisitor = await dbService.allQuery(
      "SELECT u.project_id, u.ip, p.title_ru FROM user_likes u LEFT JOIN projects p ON u.project_id = p.id WHERE u.ip != '' ORDER BY u.ip"
    );

    const visitorLikes = {};
    for (const row of likesByVisitor) {
      if (!visitorLikes[row.ip]) visitorLikes[row.ip] = [];
      visitorLikes[row.ip].push(row.title_ru || row.project_id);
    }

    res.json({
      totalVisits,
      uniqueVisitors,
      totalClicks,
      totalLikes,
      donateClicks,
      browsers: browsers || [],
      topProjects: (topProjects || []).map(p => ({ project_id: p.entity_id, name: p.entity_name || p.entity_id, count: p.cnt })),
      recentVisits: recentVisits || [],
      visitorLikes: Object.entries(visitorLikes).map(([visitorId, projects]) => ({
        visitorId,
        projects
      }))
    });
  } catch (error) {
    console.error('Ошибка статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Исключённые посетители (не получают Telegram) =====

// GET /api/track/excluded — список исключённых
router.get('/excluded', async (req, res) => {
  try {
    const dbService = getDbService();
    const list = await dbService.allQuery('SELECT * FROM excluded_visitors ORDER BY created_at DESC');
    res.json(list || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/track/excluded — добавить
router.post('/excluded', async (req, res) => {
  try {
    const { visitorId, name } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'visitorId обязателен' });
    const dbService = getDbService();
    await dbService.runQuery(
      'INSERT OR REPLACE INTO excluded_visitors (visitor_id, name) VALUES (?, ?)',
      [visitorId.trim(), (name || '').trim()]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/track/excluded/:id — обновить
router.put('/excluded/:id', async (req, res) => {
  try {
    const { visitorId, name } = req.body;
    const { id } = req.params;
    const dbService = getDbService();
    await dbService.runQuery(
      'UPDATE excluded_visitors SET visitor_id = ?, name = ? WHERE id = ?',
      [(visitorId || '').trim(), (name || '').trim(), id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/track/excluded/:id — удалить
router.delete('/excluded/:id', async (req, res) => {
  try {
    const dbService = getDbService();
    await dbService.runQuery('DELETE FROM excluded_visitors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Проверка: исключён ли visitorId
function isVisitorExcluded(visitorId) {
  return new Promise(async (resolve) => {
    try {
      const dbService = getDbService();
      const row = await dbService.getQuery('SELECT id FROM excluded_visitors WHERE visitor_id = ?', [visitorId]);
      resolve(!!row);
    } catch {
      resolve(false);
    }
  });
}

// Получить имя по visitorId (из named_visitors)
function getVisitorName(visitorId) {
  return new Promise(async (resolve) => {
    try {
      const dbService = getDbService();
      const row = await dbService.getQuery('SELECT name FROM named_visitors WHERE visitor_id = ?', [visitorId]);
      resolve(row ? row.name : '');
    } catch {
      resolve('');
    }
  });
}

// ===== Именованные посетители =====

router.get('/named', async (req, res) => {
  try {
    const dbService = getDbService();
    const list = await dbService.allQuery('SELECT * FROM named_visitors ORDER BY created_at DESC');
    res.json(list || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/named', async (req, res) => {
  try {
    const { visitorId, name } = req.body;
    if (!visitorId || !name) return res.status(400).json({ error: 'visitorId и name обязательны' });
    const dbService = getDbService();
    await dbService.runQuery(
      'INSERT OR REPLACE INTO named_visitors (visitor_id, name) VALUES (?, ?)',
      [visitorId.trim(), name.trim()]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/named/:id', async (req, res) => {
  try {
    const { visitorId, name } = req.body;
    const { id } = req.params;
    const dbService = getDbService();
    await dbService.runQuery(
      'UPDATE named_visitors SET visitor_id = ?, name = ? WHERE id = ?',
      [(visitorId || '').trim(), (name || '').trim(), id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/named/:id', async (req, res) => {
  try {
    const dbService = getDbService();
    await dbService.runQuery('DELETE FROM named_visitors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
