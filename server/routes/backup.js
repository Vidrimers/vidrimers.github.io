const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ROOT_DIR = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT_DIR, 'database', 'vidrimers.db');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

// POST /api/backup — создать бэкап
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `vidrimers_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUPS_DIR, filename);

    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    console.log(`✓ Бэкап создан: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

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

    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.db'));

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

    // Токен может быть в заголовке или query (для window.open)
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const AuthService = require('../services/authService');
    const authService = new AuthService();
    if (!authService.validateSession(token)) {
      return res.status(401).json({ error: 'Недействительный токен' });
    }

    if (!/^[a-zA-Z0-9_-]+\.db$/.test(filename)) {
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

    if (!/^[a-zA-Z0-9_-]+\.db$/.test(filename)) {
      return res.status(400).json({ error: 'Неверное имя файла' });
    }

    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Файл бэкапа не найден' });
    }

    // Создаём бэкап текущей БД перед восстановлением
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const beforeRestoreFilename = `vidrimers_before_restore_${timestamp}.db`;
    const beforeRestorePath = path.join(BACKUPS_DIR, beforeRestoreFilename);

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    fs.copyFileSync(DB_PATH, beforeRestorePath);

    // Восстанавливаем
    fs.copyFileSync(backupPath, DB_PATH);

    console.log(`✓ БД восстановлена из ${filename}. Бэкап перед восстановлением: ${beforeRestoreFilename}`);

    res.json({
      success: true,
      message: 'БД успешно восстановлена',
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

    if (!/^[a-zA-Z0-9_-]+\.db$/.test(filename)) {
      return res.status(400).json({ error: 'Неверное имя файла' });
    }

    // Запрет удаления текущей БД
    if (filename === path.basename(DB_PATH)) {
      return res.status(400).json({ error: 'Нельзя удалить текущую БД' });
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

module.exports = router;
