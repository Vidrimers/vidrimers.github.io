/**
 * Роуты для аутентификации администратора
 */

const express = require('express');
const { getAuthService } = require('../middleware/auth');
const TelegramService = require('../services/telegramService');

const router = express.Router();

// Инициализируем сервисы
let authService;
let telegramService;

try {
  authService = getAuthService();
  telegramService = new TelegramService();
} catch (error) {
  console.warn('⚠️ Telegram сервис не настроен:', error.message);
  telegramService = null;
}

/**
 * POST /api/auth/request-code
 * Генерирует и отправляет код подтверждения
 */
router.post('/request-code', async (req, res) => {
  try {
    // Генерируем код подтверждения
    const verificationCode = authService.generateVerificationCode();
    
    // Отправляем код в Telegram (если настроен)
    let telegramSent = false;
    if (telegramService) {
      telegramSent = await telegramService.sendVerificationCode(verificationCode);
    }

    // Логируем попытку запроса кода
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    console.log('🔐 Запрос кода подтверждения:', {
      ...clientInfo,
      telegramSent
    });

    res.json({
      success: true,
      data: {
        message: 'Код подтверждения сгенерирован',
        telegramSent: telegramSent,
        // В development режиме можем возвращать код для тестирования
        ...(process.env.NODE_ENV === 'development' && { 
          code: verificationCode 
        })
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка генерации кода:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CODE_GENERATION_ERROR',
        message: 'Ошибка генерации кода подтверждения'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify-code
 * Проверяет код подтверждения и создает сессию
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Код подтверждения обязателен'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Проверяем код
    const isValidCode = authService.verifyCode(code);

    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      code: code
    };

    if (!isValidCode) {
      // Отправляем уведомление о неудачной попытке
      if (telegramService) {
        await telegramService.sendFailedLoginNotification(clientInfo);
      }

      console.log('❌ Неудачная попытка входа:', clientInfo);

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CODE',
          message: 'Неверный или истекший код подтверждения'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Создаем сессию
    const sessionToken = authService.createSession('admin');

    // Отправляем уведомление об успешном входе
    if (telegramService) {
      await telegramService.sendLoginNotification(clientInfo);
    }

    console.log('✅ Успешный вход в админ-панель:', {
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent?.substring(0, 50) + '...'
    });

    res.json({
      success: true,
      data: {
        token: sessionToken,
        message: 'Аутентификация успешна',
        expiresIn: '24h'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка проверки кода:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Ошибка проверки кода подтверждения'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/validate-session
 * Проверяет валидность текущей сессии
 */
router.post('/validate-session', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Токен обязателен'
        },
        timestamp: new Date().toISOString()
      });
    }

    const decoded = authService.validateSession(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Недействительная сессия'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        userId: decoded.userId,
        role: decoded.role,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка валидации сессии:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации сессии'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/logout
 * Выход из системы (инвалидация токена на клиенте)
 */
router.post('/logout', (req, res) => {
  try {
    // В JWT нет возможности инвалидировать токен на сервере без blacklist
    // Поэтому просто возвращаем успешный ответ
    // Клиент должен удалить токен из localStorage/sessionStorage
    
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    console.log('🚪 Выход из админ-панели:', clientInfo);

    // Отправляем уведомление о выходе в Telegram
    if (telegramService) {
      telegramService.sendLogoutNotification(clientInfo);
    }

    res.json({
      success: true,
      data: {
        message: 'Выход выполнен успешно'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка выхода:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Ошибка выхода из системы'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/stats
 * Получает статистику аутентификации (только для разработки)
 */
router.get('/stats', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Эндпоинт не найден'
        }
      });
    }

    const stats = authService.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Ошибка получения статистики'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;