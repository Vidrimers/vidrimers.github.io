/**
 * Middleware для проверки аутентификации администратора
 */

const AuthService = require('../services/authService');

// Создаем единственный экземпляр AuthService
const authService = new AuthService();

/**
 * Middleware для проверки JWT токена администратора
 * @param {object} req - Express request
 * @param {object} res - Express response  
 * @param {function} next - Express next function
 */
function requireAuth(req, res, next) {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Токен аутентификации отсутствует'
        }
      });
    }

    const token = authHeader.substring(7); // Убираем 'Bearer '
    
    // Проверяем токен
    const decoded = authService.validateSession(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Недействительный токен аутентификации'
        }
      });
    }

    // Добавляем информацию о пользователе в request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    console.error('Ошибка проверки аутентификации:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Ошибка проверки аутентификации'
      }
    });
  }
}

/**
 * Middleware для опциональной проверки аутентификации
 * Не блокирует запрос, но добавляет информацию о пользователе если токен валиден
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = authService.validateSession(token);
      
      if (decoded) {
        req.user = {
          userId: decoded.userId,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp
        };
      }
    }

    next();
  } catch (error) {
    // При ошибке просто продолжаем без аутентификации
    next();
  }
}

/**
 * Получает экземпляр AuthService для использования в роутах
 * @returns {AuthService} Экземпляр сервиса аутентификации
 */
function getAuthService() {
  return authService;
}

module.exports = {
  requireAuth,
  optionalAuth,
  getAuthService
};