/**
 * API маршруты для управления кошельками донатов
 */

const express = require('express');
const { getDbService } = require('../services');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/donate-wallets - Получить все кошельки (публичный)
 */
router.get('/', async (req, res) => {
  try {
    const dbService = getDbService();
    const includeHidden = req.query.includeHidden === 'true';

    const sql = includeHidden
      ? 'SELECT * FROM donate_wallets ORDER BY sort_order ASC'
      : 'SELECT * FROM donate_wallets WHERE is_hidden = 0 ORDER BY sort_order ASC';

    const wallets = await dbService.allQuery(sql);

    res.json({
      success: true,
      data: wallets.map(w => ({
        id: w.id,
        name: w.name,
        address: w.address,
        color: w.color,
        sortOrder: w.sort_order,
        isHidden: Boolean(w.is_hidden)
      }))
    });
  } catch (error) {
    console.error('Ошибка при получении кошельков:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WALLETS_FETCH_ERROR', message: 'Ошибка при получении кошельков' }
    });
  }
});

/**
 * POST /api/donate-wallets - Создать кошелёк (только для авторизованных)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const { name, address, color, sortOrder, isHidden } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Название кошелька обязательно' }
      });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Адрес кошелька обязателен' }
      });
    }

    // Определяем sort_order если не передан
    let order = sortOrder;
    if (order === undefined || order === null) {
      const last = await dbService.getQuery('SELECT MAX(sort_order) as max FROM donate_wallets');
      order = (last?.max ?? 0) + 1;
    }

    const result = await dbService.runQuery(
      'INSERT INTO donate_wallets (name, address, color, sort_order, is_hidden) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), address.trim(), color || '#888888', order, isHidden ? 1 : 0]
    );

    const created = await dbService.getQuery('SELECT * FROM donate_wallets WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: {
        id: created.id,
        name: created.name,
        address: created.address,
        color: created.color,
        sortOrder: created.sort_order,
        isHidden: Boolean(created.is_hidden)
      }
    });
  } catch (error) {
    console.error('Ошибка при создании кошелька:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WALLET_CREATE_ERROR', message: 'Ошибка при создании кошелька' }
    });
  }
});

/**
 * PUT /api/donate-wallets/reorder - Изменить порядок кошельков
 */
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const { wallets } = req.body;

    if (!Array.isArray(wallets)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATA', message: 'Ожидается массив wallets' }
      });
    }

    for (const item of wallets) {
      await dbService.runQuery(
        'UPDATE donate_wallets SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при изменении порядка кошельков:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WALLET_REORDER_ERROR', message: 'Ошибка при изменении порядка' }
    });
  }
});

/**
 * PUT /api/donate-wallets/:id - Обновить кошелёк
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const { id } = req.params;
    const { name, address, color, sortOrder, isHidden } = req.body;

    const existing = await dbService.getQuery('SELECT * FROM donate_wallets WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'WALLET_NOT_FOUND', message: 'Кошелёк не найден' }
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Название кошелька обязательно' }
      });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Адрес кошелька обязателен' }
      });
    }

    await dbService.runQuery(
      'UPDATE donate_wallets SET name = ?, address = ?, color = ?, sort_order = ?, is_hidden = ? WHERE id = ?',
      [
        name.trim(),
        address.trim(),
        color || existing.color,
        sortOrder ?? existing.sort_order,
        isHidden ? 1 : 0,
        id
      ]
    );

    const updated = await dbService.getQuery('SELECT * FROM donate_wallets WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        address: updated.address,
        color: updated.color,
        sortOrder: updated.sort_order,
        isHidden: Boolean(updated.is_hidden)
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении кошелька:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WALLET_UPDATE_ERROR', message: 'Ошибка при обновлении кошелька' }
    });
  }
});

/**
 * DELETE /api/donate-wallets/:id - Удалить кошелёк
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const dbService = getDbService();
    const { id } = req.params;

    const existing = await dbService.getQuery('SELECT id FROM donate_wallets WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'WALLET_NOT_FOUND', message: 'Кошелёк не найден' }
      });
    }

    await dbService.runQuery('DELETE FROM donate_wallets WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении кошелька:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WALLET_DELETE_ERROR', message: 'Ошибка при удалении кошелька' }
    });
  }
});

module.exports = router;
