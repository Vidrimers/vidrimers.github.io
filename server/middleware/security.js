/**
 * Middleware безопасности: rate limiting и CSRF защита
 * Requirements: 11.4, 11.5
 */

const crypto = require('crypto');

// ─── Rate Limiter ────────────────────────────────────────────────────────────

/**
 * Хранилище счётчиков запросов в памяти
 * Структура: Map<ip, { count, resetAt }>
 */
const rateLimitStore = new Map();

/**
 * Очистка устаревших записей каждые 5 минут
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Создаёт middleware rate limiting
 * @param {{ windowMs: number, max: number, message?: string }} options
 * @returns {Function} Express middleware
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 60, message = 'Слишком много запросов' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      // Новое окно
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Rate limiter для auth эндпоинтов: 5 запросов в минуту на IP
 */
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Слишком много попыток аутентификации. Попробуйте через минуту'
});

/**
 * Rate limiter для общих API эндпоинтов: 100 запросов в минуту на IP
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Слишком много запросов к API. Попробуйте через минуту'
});

/**
 * Rate limiter для загрузки файлов: 10 загрузок в минуту на IP
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Слишком много загрузок файлов. Попробуйте через минуту'
});

// ─── CSRF Protection ─────────────────────────────────────────────────────────

/**
 * Хранилище CSRF токенов: Map<token, { createdAt, ip }>
 * Токен живёт 1 час
 */
const csrfTokenStore = new Map();
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 час

/**
 * Очистка устаревших CSRF токенов каждые 30 минут
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokenStore.entries()) {
    if (now > data.createdAt + CSRF_TOKEN_TTL) {
      csrfTokenStore.delete(token);
    }
  }
}, 30 * 60 * 1000);

/**
 * Генерирует новый CSRF токен
 * @param {string} ip - IP адрес клиента
 * @returns {string} CSRF токен
 */
function generateCsrfToken(ip) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokenStore.set(token, { createdAt: Date.now(), ip });
  return token;
}

/**
 * Проверяет CSRF токен
 * @param {string} token - Токен из запроса
 * @param {string} ip - IP адрес клиента
 * @returns {boolean}
 */
function validateCsrfToken(token, ip) {
  if (!token || typeof token !== 'string') return false;

  const data = csrfTokenStore.get(token);
  if (!data) return false;

  // Проверяем срок жизни
  if (Date.now() > data.createdAt + CSRF_TOKEN_TTL) {
    csrfTokenStore.delete(token);
    return false;
  }

  return true;
}

/**
 * GET /api/auth/csrf-token — эндпоинт для получения CSRF токена
 * Используется клиентом перед выполнением мутирующих операций
 */
function csrfTokenEndpoint(req, res) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const token = generateCsrfToken(ip);
  res.json({
    success: true,
    data: { csrfToken: token },
    timestamp: new Date().toISOString()
  });
}

/**
 * Middleware проверки CSRF токена для мутирующих запросов (POST/PUT/DELETE)
 * Токен передаётся в заголовке X-CSRF-Token или в теле запроса как csrfToken
 */
function csrfProtection(req, res, next) {
  // GET и HEAD запросы не требуют CSRF защиты
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

  if (!validateCsrfToken(token, ip)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Недействительный или отсутствующий CSRF токен'
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Получить текущее состояние rate limit store (для тестов)
 * @returns {Map}
 */
function getRateLimitStore() {
  return rateLimitStore;
}

/**
 * Получить текущее состояние CSRF token store (для тестов)
 * @returns {Map}
 */
function getCsrfTokenStore() {
  return csrfTokenStore;
}

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  csrfProtection,
  csrfTokenEndpoint,
  generateCsrfToken,
  validateCsrfToken,
  getRateLimitStore,
  getCsrfTokenStore,
  CSRF_TOKEN_TTL
};
