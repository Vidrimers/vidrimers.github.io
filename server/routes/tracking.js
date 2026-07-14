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

// GET /api/track/visit — логирование визита (вызывается клиентом при загрузке)
router.post('/visit', async (req, res) => {
  try {
    // Приоритет: X-Real-IP > X-Forwarded-For > remoteAddress
    const rawIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = rawIp.split(',')[0].trim(); // X-Forwarded-For может содержать несколько IP
    const country = await getCountry(ip);
    const { path: visitPath } = req.body;

    const dbService = getDbService();
    await dbService.runQuery(
      'INSERT INTO visits (ip, country, user_agent, path) VALUES (?, ?, ?, ?)',
      [ip, country, (req.headers['user-agent'] || '').slice(0, 200), visitPath || '/']
    );

    // Telegram: новый или повторный IP
    const existing = await dbService.getQuery(
      'SELECT COUNT(*) as cnt FROM visits WHERE ip = ? AND id != (SELECT MAX(id) FROM visits WHERE ip = ?)',
      [ip, ip]
    );
    const telegramService = getTelegramService();
    if (telegramService && ip !== '127.0.0.1' && ip !== '::1') {
      const isNew = existing && existing.cnt === 0;
      const label = isNew ? '🌐 Новый посетитель' : '🔄 Повторный визит';
      await telegramService.sendActivityNotification(label, {
        entityType: 'IP',
        entityId: ip,
        title: `${country} — ${visitPath || '/'}`
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка трекинга визита:', error.message);
    res.json({ ok: true }); // Не блокируем клиента
  }
});

// POST /api/track/click — логирование клика по ссылке
router.post('/click', async (req, res) => {
  try {
    const rawIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = rawIp.split(',')[0].trim();
    const country = await getCountry(ip);
    const { type, entityId, linkUrl } = req.body;

    const dbService = getDbService();

    // Подтягиваем название проекта из БД
    let entityName = '';
    if (entityId && type === 'project') {
      const project = await dbService.getQuery('SELECT title_ru FROM projects WHERE id = ?', [entityId]);
      entityName = project ? project.title_ru : entityId;
    }

    await dbService.runQuery(
      'INSERT INTO link_clicks (type, entity_id, entity_name, link_url, ip, country) VALUES (?, ?, ?, ?, ?, ?)',
      [type || 'project', entityId || null, entityName, linkUrl || '', ip, country]
    );

    // Telegram: клик по проекту
    const telegramService = getTelegramService();
    if (telegramService && entityId) {
      const label = type === 'donate' ? '💰 Donate нажат' : `🔗 ${entityName || entityId} открыт`;
      await telegramService.sendActivityNotification(label, {
        entityType: type,
        entityId,
        title: `${country} — ${ip}`
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
    const uniqueIps = (await dbService.getQuery('SELECT COUNT(DISTINCT ip) as c FROM visits')).c;
    const totalClicks = (await dbService.getQuery('SELECT COUNT(*) as c FROM link_clicks')).c;
    const totalLikes = (await dbService.getQuery('SELECT COUNT(*) as c FROM user_likes')).c;
    const donateClicks = (await dbService.getQuery("SELECT COUNT(*) as c FROM link_clicks WHERE type = 'donate'")).c;

    const topCountries = await dbService.allQuery(
      'SELECT country, COUNT(*) as cnt FROM visits WHERE country != \'\' GROUP BY country ORDER BY cnt DESC LIMIT 10'
    );

    const topProjects = await dbService.allQuery(
      "SELECT entity_id, entity_name, COUNT(*) as cnt FROM link_clicks WHERE type = 'project' AND entity_id IS NOT NULL GROUP BY entity_id ORDER BY cnt DESC LIMIT 10"
    );

    const recentVisits = await dbService.allQuery(
      'SELECT ip, country, path, created_at FROM visits ORDER BY created_at DESC LIMIT 30'
    );

    const likesByIp = await dbService.allQuery(
      "SELECT u.project_id, u.ip, u.country, p.title_ru FROM user_likes u LEFT JOIN projects p ON u.project_id = p.id WHERE u.ip != '' ORDER BY u.ip"
    );

    // Группируем лайки по IP
    const ipLikes = {};
    for (const row of likesByIp) {
      if (!ipLikes[row.ip]) ipLikes[row.ip] = { country: row.country, projects: [] };
      ipLikes[row.ip].projects.push(row.title_ru || row.project_id);
    }

    res.json({
      totalVisits,
      uniqueIps,
      totalClicks,
      totalLikes,
      donateClicks,
      topCountries: topCountries || [],
      topProjects: (topProjects || []).map(p => ({ project_id: p.entity_id, name: p.entity_name || p.entity_id, count: p.cnt })),
      recentVisits: recentVisits || [],
      likesByIp: Object.entries(ipLikes).map(([ip, data]) => ({
        ip,
        country: data.country,
        projects: data.projects
      }))
    });
  } catch (error) {
    console.error('Ошибка статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
