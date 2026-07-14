const express = require('express');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ROOT_DIR = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT_DIR, 'database', 'vidrimers.db');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Рекурсивно добавляем папку в ZIP
function addDirToZip(zip, dirPath, zipBasePath) {
  if (!fs.existsSync(dirPath)) return;
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const zipPath = path.join(zipBasePath, item).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDirToZip(zip, fullPath, zipPath);
    } else {
      zip.addLocalFile(fullPath, path.dirname(zipPath));
    }
  }
}

// Рекурсивно удаляем папку
function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
}

// POST /api/backup — создать ZIP-бэкап
router.post('/', requireAuth, async (req, res) => {
  try {
    ensureDir(BACKUPS_DIR);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `vidrimers_backup_${timestamp}.zip`;
    const backupPath = path.join(BACKUPS_DIR, filename);

    const zip = new AdmZip();

    // Добавляем БД
    if (fs.existsSync(DB_PATH)) {
      zip.addLocalFile(DB_PATH, '', 'vidrimers.db');
    }

    // Добавляем uploads/
    if (fs.existsSync(UPLOADS_DIR)) {
      addDirToZip(zip, UPLOADS_DIR, 'uploads');
    }

    zip.writeZip(backupPath);

    const stats = fs.statSync(backupPath);
    console.log(`✓ ZIP-бэкап создан: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

    res.json({
      success: true,
      filename,
      size: stats.size,
      timestamp: new Date().toISOString(),
      message: 'Бэкап успешно создан'
    });
  } catch (error) {
    console.error('Ошибка создания бэкапа:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/backup/list — список бэкапов
router.get('/list', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json([]);
    }

    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.zip'));

    const backups = files.map(file => {
      const filePath = path.join(BACKUPS_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        sizeFormatted: stats.size < 1024 * 1024
          ? (stats.size / 1024).toFixed(1) + ' KB'
          : (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        created: stats.mtime.toISOString(),
        createdFormatted: stats.mtime.toLocaleString('ru-RU')
      };
    }).sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json(backups);
  } catch (error) {
    console.error('Ошибка получения списка бэкапов:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backup/download/:filename — скачать бэкап
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;

    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const AuthService = require('../services/authService');
    const authService = new AuthService();
    if (!authService.validateSession(token)) {
      return res.status(401).json({ error: 'Недействительный токен' });
    }

    if (!/^[a-zA-Z0-9_-]+\.zip$/.test(filename)) {
      return res.status(400).json({ error: 'Неверное имя файла' });
    }

    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    res.download(backupPath, filename);
  } catch (error) {
    console.error('Ошибка скачивания бэкапа:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backup/restore — восстановить из бэкапа
router.post('/restore', requireAuth, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Имя файла не указано' });
    }

    if (!/^[a-zA-Z0-9_-]+\.zip$/.test(filename)) {
      return res.status(400).json({ error: 'Неверное имя файла' });
    }

    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Файл бэкапа не найден' });
    }

    ensureDir(BACKUPS_DIR);

    // Создаём бэкап текущего состояния перед восстановлением
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const beforeRestoreFilename = `vidrimers_before_restore_${timestamp}.zip`;
    const beforeRestorePath = path.join(BACKUPS_DIR, beforeRestoreFilename);

    const preZip = new AdmZip();
    if (fs.existsSync(DB_PATH)) {
      preZip.addLocalFile(DB_PATH, '', 'vidrimers.db');
    }
    if (fs.existsSync(UPLOADS_DIR)) {
      addDirToZip(preZip, UPLOADS_DIR, 'uploads');
    }
    preZip.writeZip(beforeRestorePath);
    console.log(`✓ Бэкап перед восстановлением: ${beforeRestoreFilename}`);

    // Распаковываем бэкап
    const zip = new AdmZip(backupPath);
    const entries = zip.getEntries();

    for (const entry of entries) {
      const entryName = entry.entryName;

      if (entryName === 'vidrimers.db') {
        // Замена БД
        const dbDir = path.dirname(DB_PATH);
        ensureDir(dbDir);
        zip.extractEntryTo(entryName, dbDir, true, true);
        // Переименовываем обратно (extractEntryTo может создать с другим именем)
        const extractedPath = path.join(dbDir, 'vidrimers.db');
        if (fs.existsSync(extractedPath)) {
          fs.copyFileSync(extractedPath, DB_PATH);
        }
      } else if (entryName.startsWith('uploads/')) {
        // Распаковка uploads
        const targetPath = path.join(ROOT_DIR, entryName);
        const targetDir = path.dirname(targetPath);
        ensureDir(targetDir);
        zip.extractEntryTo(entryName, ROOT_DIR, true, true);
      }
    }

    console.log(`✓ БД и uploads восстановлены из ${filename}`);

    res.json({
      success: true,
      message: 'БД и uploads успешно восстановлены',
      restored_from: filename,
      backup_created: beforeRestoreFilename
    });
  } catch (error) {
    console.error('Ошибка восстановления БД:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/backup/:filename — удалить бэкап
router.delete('/:filename', requireAuth, (req, res) => {
  try {
    const { filename } = req.params;

    if (!/^[a-zA-Z0-9_-]+\.zip$/.test(filename)) {
      return res.status(400).json({ error: 'Неверное имя файла' });
    }

    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    fs.unlinkSync(backupPath);
    console.log(`✓ Бэкап удалён: ${filename}`);

    res.json({ success: true, message: 'Бэкап удалён' });
  } catch (error) {
    console.error('Ошибка удаления бэкапа:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backup/stats — статистика БД
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { getDbService } = require('../services');
    const dbService = getDbService();

    const dbSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;

    let uploadsSize = 0;
    let uploadsFiles = 0;
    function calcDirSize(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) calcDirSize(full);
        else { uploadsSize += stat.size; uploadsFiles++; }
      }
    }
    calcDirSize(UPLOADS_DIR);

    const tables = ['projects', 'categories', 'skills', 'certificates', 'likes', 'user_likes', 'activity_logs', 'site_settings'];
    const stats = {};
    for (const table of tables) {
      try {
        const row = await dbService.getQuery(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = row ? row.count : 0;
      } catch { stats[table] = 0; }
    }

    res.json({
      dbSize,
      dbSizeFormatted: (dbSize / 1024).toFixed(1) + ' KB',
      uploadsSize,
      uploadsSizeFormatted: (uploadsSize / 1024).toFixed(1) + ' KB',
      uploadsFiles,
      tables: stats
    });
  } catch (error) {
    console.error('Ошибка статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backup/orphans — список orphan-изображений
router.get('/orphans', requireAuth, async (req, res) => {
  try {
    const { getDbService } = require('../services');
    const dbService = getDbService();

    // Собираем все пути из БД
    const usedPaths = new Set();

    const projects = await dbService.allQuery('SELECT image_path FROM projects WHERE image_path LIKE "/uploads/%"');
    (projects || []).forEach(p => { if (p.image_path) usedPaths.add(p.image_path); });

    const skills = await dbService.allQuery('SELECT icon_path FROM skills WHERE icon_path LIKE "/uploads/%"');
    (skills || []).forEach(s => { if (s.icon_path) usedPaths.add(s.icon_path); });

    const certs = await dbService.allQuery('SELECT image_path FROM certificates WHERE image_path LIKE "/uploads/%"');
    (certs || []).forEach(c => { if (c.image_path) usedPaths.add(c.image_path); });

    // Сканируем uploads/
    const orphans = [];
    function scanDir(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { scanDir(full); continue; }
        const webPath = full.replace(ROOT_DIR, '').replace(/\\/g, '/');
        if (!usedPaths.has(webPath)) {
          orphans.push({ path: webPath, size: stat.size, sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB' });
        }
      }
    }
    scanDir(UPLOADS_DIR);

    res.json(orphans);
  } catch (error) {
    console.error('Ошибка поиска orphan:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/backup/orphans — удалить orphan-изображения
router.delete('/orphans', requireAuth, async (req, res) => {
  try {
    const { getDbService } = require('../services');
    const dbService = getDbService();

    const usedPaths = new Set();
    const projects = await dbService.allQuery('SELECT image_path FROM projects WHERE image_path LIKE "/uploads/%"');
    (projects || []).forEach(p => { if (p.image_path) usedPaths.add(p.image_path); });
    const skills = await dbService.allQuery('SELECT icon_path FROM skills WHERE icon_path LIKE "/uploads/%"');
    (skills || []).forEach(s => { if (s.icon_path) usedPaths.add(s.icon_path); });
    const certs = await dbService.allQuery('SELECT image_path FROM certificates WHERE image_path LIKE "/uploads/%"');
    (certs || []).forEach(c => { if (c.image_path) usedPaths.add(c.image_path); });

    let deleted = 0;
    function scanAndDelete(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { scanAndDelete(full); continue; }
        const webPath = full.replace(ROOT_DIR, '').replace(/\\/g, '/');
        if (!usedPaths.has(webPath)) {
          fs.unlinkSync(full);
          deleted++;
        }
      }
    }
    scanAndDelete(UPLOADS_DIR);

    console.log(`✓ Удалено orphan-изображений: ${deleted}`);
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Ошибка удаления orphan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/backup/logs — логи активности
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { getDbService } = require('../services');
    const dbService = getDbService();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const logs = await dbService.allQuery(
      'SELECT id, user_id, action, entity_type, entity_id, details, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    res.json(logs || []);
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
