/**
 * Сервис аутентификации для админской панели
 * Генерация кодов подтверждения и управление сессиями
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  constructor() {
    // Хранилище кодов подтверждения в памяти
    this.verificationCodes = new Map();
    
    // Секретный ключ для JWT (в продакшене должен быть в .env)
    this.jwtSecret = process.env.JWT_SECRET || 'admin-cms-secret-key-change-in-production';
    
    // Время жизни кода подтверждения (5 минут)
    this.codeExpirationTime = 5 * 60 * 1000;
    
    // Время жизни сессии (24 часа)
    this.sessionExpirationTime = 24 * 60 * 60 * 1000;

    // Blacklist инвалидированных токенов (logout)
    // Структура: Map<token, expiresAt> — храним до истечения JWT
    this.tokenBlacklist = new Map();
    
    // Очистка истекших кодов каждую минуту
    setInterval(() => {
      this.cleanupExpiredCodes();
    }, 60 * 1000);

    // Очистка blacklist каждые 30 минут (удаляем токены, которые уже истекли)
    setInterval(() => {
      this.cleanupBlacklist();
    }, 30 * 60 * 1000);
  }

  /**
   * Генерирует 6-значный код подтверждения
   * @returns {string} Код подтверждения
   */
  generateVerificationCode() {
    // Генерируем случайное 6-значное число
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Сохраняем код с временной меткой
    const expiresAt = Date.now() + this.codeExpirationTime;
    this.verificationCodes.set(code, {
      createdAt: Date.now(),
      expiresAt: expiresAt
    });
    
    return code;
  }

  /**
   * Проверяет корректность кода подтверждения
   * @param {string} inputCode - Введенный пользователем код
   * @returns {boolean} Результат проверки
   */
  verifyCode(inputCode) {
    if (!inputCode || typeof inputCode !== 'string') {
      return false;
    }

    const codeData = this.verificationCodes.get(inputCode);
    
    if (!codeData) {
      return false;
    }

    // Проверяем, не истек ли код
    if (Date.now() > codeData.expiresAt) {
      this.verificationCodes.delete(inputCode);
      return false;
    }

    // Удаляем использованный код
    this.verificationCodes.delete(inputCode);
    return true;
  }

  /**
   * Создает JWT сессию для администратора
   * @param {string} userId - ID пользователя (для админа всегда 'admin')
   * @returns {string} JWT токен
   */
  createSession(userId = 'admin') {
    const payload = {
      userId: userId,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.sessionExpirationTime) / 1000)
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Проверяет валидность JWT токена
   * Выполняет полную проверку: подпись, срок жизни, роль, blacklist
   * @param {string} token - JWT токен
   * @returns {object|null} Декодированный payload или null
   */
  validateSession(token) {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }

      // Проверяем blacklist — инвалидированные токены (logout)
      if (this.tokenBlacklist.has(token)) {
        return null;
      }

      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Дополнительная проверка роли
      if (decoded.role !== 'admin') {
        return null;
      }

      // Явная проверка истечения (jwt.verify уже делает это, но дублируем для надёжности)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Инвалидирует токен (logout) — добавляет в blacklist до истечения JWT
   * @param {string} token - JWT токен для инвалидации
   * @returns {boolean} Успешность операции
   */
  invalidateSession(token) {
    if (!token || typeof token !== 'string') return false;

    try {
      // Декодируем без верификации, чтобы получить exp даже для истекших токенов
      const decoded = jwt.decode(token);
      if (!decoded) return false;

      const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + this.sessionExpirationTime;
      this.tokenBlacklist.set(token, expiresAt);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Очищает истекшие токены из blacklist
   * @private
   */
  cleanupBlacklist() {
    const now = Date.now();
    for (const [token, expiresAt] of this.tokenBlacklist.entries()) {
      if (now > expiresAt) {
        this.tokenBlacklist.delete(token);
      }
    }
  }

  /**
   * Очищает истекшие коды подтверждения
   * @private
   */
  cleanupExpiredCodes() {
    const now = Date.now();
    for (const [code, data] of this.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        this.verificationCodes.delete(code);
      }
    }
  }

  /**
   * Получает статистику активных кодов (для отладки)
   * @returns {object} Статистика
   */
  getStats() {
    return {
      activeCodes: this.verificationCodes.size,
      codes: Array.from(this.verificationCodes.entries()).map(([code, data]) => ({
        code: code.substring(0, 2) + '****', // Маскируем код для безопасности
        createdAt: new Date(data.createdAt).toISOString(),
        expiresAt: new Date(data.expiresAt).toISOString(),
        isExpired: Date.now() > data.expiresAt
      }))
    };
  }
}

module.exports = AuthService;