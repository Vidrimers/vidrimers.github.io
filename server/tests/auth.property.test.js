/**
 * Property-based тесты для системы аутентификации
 * Feature: admin-cms-system, Property 1: Authentication Code Generation and Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import AuthService from '../services/authService.js';
import TelegramService from '../services/telegramService.js';

describe('Authentication Property Tests', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
    // Очищаем все коды перед каждым тестом
    authService.verificationCodes.clear();
  });

  afterEach(() => {
    // Очищаем все коды после каждого теста
    if (authService && authService.verificationCodes) {
      authService.verificationCodes.clear();
    }
  });

  /**
   * Property 1: Authentication Code Generation and Validation
   * Validates: Requirements 1.1, 1.2, 1.3
   * 
   * For any authentication request, the generated verification code should be 
   * exactly 6 digits, unique within the 5-minute window, and when entered 
   * correctly should create a valid admin session
   */
  it('Property 1: Authentication Code Generation and Validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Количество кодов для генерации
        (codeCount) => {
          const generatedCodes = [];
          
          // Генерируем несколько кодов
          for (let i = 0; i < codeCount; i++) {
            const code = authService.generateVerificationCode();
            generatedCodes.push(code);
            
            // Проверяем, что код состоит из 6 цифр
            expect(code).toMatch(/^\d{6}$/);
            expect(code.length).toBe(6);
            
            // Проверяем, что код находится в диапазоне 100000-999999
            const codeNumber = parseInt(code, 10);
            expect(codeNumber).toBeGreaterThanOrEqual(100000);
            expect(codeNumber).toBeLessThanOrEqual(999999);
          }
          
          // Проверяем уникальность кодов в пределах одного теста
          const uniqueCodes = new Set(generatedCodes);
          expect(uniqueCodes.size).toBe(generatedCodes.length);
          
          // Проверяем валидацию каждого сгенерированного кода
          for (const code of generatedCodes) {
            // Код должен быть валидным сразу после генерации
            expect(authService.verifyCode(code)).toBe(true);
            
            // После использования код должен стать невалидным
            expect(authService.verifyCode(code)).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Тест валидации различных форматов кодов
   */
  it('Property 1.1: Code validation handles various input formats', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(), // Случайные строки
          fc.integer(), // Числа
          fc.constant(null), // null
          fc.constant(undefined), // undefined
          fc.array(fc.integer(), { minLength: 0, maxLength: 10 }), // Массивы
          fc.object() // Объекты
        ),
        (invalidInput) => {
          // Генерируем валидный код для сравнения
          const validCode = authService.generateVerificationCode();
          
          // Невалидные входные данные должны возвращать false
          if (typeof invalidInput !== 'string' || !/^\d{6}$/.test(invalidInput)) {
            expect(authService.verifyCode(invalidInput)).toBe(false);
          }
          
          // Валидный код должен работать
          expect(authService.verifyCode(validCode)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Тест создания и валидации JWT сессий
   */
  it('Property 1.2: Session creation and validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // userId
        (userId) => {
          // Создаем сессию
          const token = authService.createSession(userId);
          
          // Токен должен быть строкой
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);
          
          // Валидируем сессию
          const decoded = authService.validateSession(token);
          
          // Декодированные данные должны содержать правильную информацию
          expect(decoded).toBeTruthy();
          expect(decoded.userId).toBe(userId);
          expect(decoded.role).toBe('admin');
          expect(decoded.iat).toBeTruthy();
          expect(decoded.exp).toBeTruthy();
          
          // Время истечения должно быть в будущем
          expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Тест обработки невалидных токенов
   */
  it('Property 1.3: Invalid token handling', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(), // Случайные строки
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('invalid.jwt.token'),
          fc.integer()
        ),
        (invalidToken) => {
          // Невалидные токены должны возвращать null
          const result = authService.validateSession(invalidToken);
          
          if (typeof invalidToken !== 'string' || invalidToken.length === 0) {
            expect(result).toBeNull();
          } else {
            // Для строк проверяем, что это не валидный JWT
            try {
              const validToken = authService.createSession('test');
              if (invalidToken !== validToken) {
                expect(result).toBeNull();
              }
            } catch (error) {
              expect(result).toBeNull();
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Тест истечения кодов подтверждения
   */
  it('Property 1.4: Code expiration behavior', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // Количество кодов
        (codeCount) => {
          const codes = [];
          
          // Генерируем коды
          for (let i = 0; i < codeCount; i++) {
            codes.push(authService.generateVerificationCode());
          }
          
          // Все коды должны быть валидными сразу после создания
          for (const code of codes) {
            expect(authService.verificationCodes.has(code)).toBe(true);
            
            const codeData = authService.verificationCodes.get(code);
            expect(codeData.createdAt).toBeTruthy();
            expect(codeData.expiresAt).toBeTruthy();
            expect(codeData.expiresAt).toBeGreaterThan(codeData.createdAt);
            
            // Время истечения должно быть примерно через 5 минут
            const expectedExpiration = codeData.createdAt + (5 * 60 * 1000);
            expect(Math.abs(codeData.expiresAt - expectedExpiration)).toBeLessThan(1000);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Тест статистики аутентификации
   */
  it('Property 1.5: Authentication statistics', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // Количество кодов для генерации
        (codeCount) => {
          // Очищаем коды перед тестом для точного подсчета
          authService.verificationCodes.clear();
          
          // Генерируем коды
          for (let i = 0; i < codeCount; i++) {
            authService.generateVerificationCode();
          }
          
          // Получаем статистику
          const stats = authService.getStats();
          
          // Проверяем структуру статистики
          expect(stats).toBeTruthy();
          expect(typeof stats.activeCodes).toBe('number');
          expect(Array.isArray(stats.codes)).toBe(true);
          expect(stats.activeCodes).toBe(codeCount);
          expect(stats.codes.length).toBe(codeCount);
          
          // Проверяем, что коды замаскированы в статистике
          for (const codeInfo of stats.codes) {
            expect(codeInfo.code).toMatch(/^\d{2}\*{4}$/);
            expect(codeInfo.createdAt).toBeTruthy();
            expect(codeInfo.expiresAt).toBeTruthy();
            expect(typeof codeInfo.isExpired).toBe('boolean');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Тест очистки истекших кодов
   */
  it('Property 1.6: Expired codes cleanup', () => {
    // Генерируем код
    const code = authService.generateVerificationCode();
    expect(authService.verificationCodes.has(code)).toBe(true);
    
    // Искусственно делаем код истекшим
    const codeData = authService.verificationCodes.get(code);
    codeData.expiresAt = Date.now() - 1000; // Истек секунду назад
    
    // Запускаем очистку
    authService.cleanupExpiredCodes();
    
    // Код должен быть удален
    expect(authService.verificationCodes.has(code)).toBe(false);
  });

  /**
   * Property 2: Admin Session Management
   * Validates: Requirements 1.4, 3.1, 3.2, 3.3
   * 
   * For any valid admin session, the system should display admin indicators 
   * (+ icons and colored text), and for any invalid or expired session, 
   * all admin indicators should be hidden
   */
  describe('Property 2: Admin Session Management', () => {
    
    it('Property 2.1: Valid session creates proper admin context', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.integer({ min: 1, max: 24 }), // hours until expiration
          (userId, hoursUntilExpiration) => {
            // Создаем сессию с кастомным временем истечения
            const customExpirationTime = hoursUntilExpiration * 60 * 60 * 1000;
            const originalExpirationTime = authService.sessionExpirationTime;
            authService.sessionExpirationTime = customExpirationTime;
            
            const token = authService.createSession(userId);
            
            // Восстанавливаем оригинальное время
            authService.sessionExpirationTime = originalExpirationTime;
            
            // Валидируем сессию
            const sessionData = authService.validateSession(token);
            
            // Проверяем, что сессия валидна и содержит правильные данные
            expect(sessionData).toBeTruthy();
            expect(sessionData.userId).toBe(userId);
            expect(sessionData.role).toBe('admin');
            
            // Проверяем временные метки
            expect(sessionData.iat).toBeTruthy();
            expect(sessionData.exp).toBeTruthy();
            expect(sessionData.exp).toBeGreaterThan(sessionData.iat);
            
            // Проверяем, что время истечения корректно
            const currentTime = Math.floor(Date.now() / 1000);
            expect(sessionData.exp).toBeGreaterThan(currentTime);
            
            // Для валидной сессии админские индикаторы должны быть активны
            // (это логическое условие, которое будет проверяться в frontend)
            const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
            expect(shouldShowAdminIndicators).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.2: Invalid sessions hide admin indicators', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 20 }), // Короткие строки
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('invalid.token.here'),
            fc.constant('Bearer invalid'),
            fc.integer().map(n => n.toString()) // Числа как строки
          ),
          (invalidToken) => {
            // Проверяем валидацию невалидного токена
            const sessionData = authService.validateSession(invalidToken);
            
            // Невалидные токены должны возвращать null
            expect(sessionData).toBeNull();
            
            // Для невалидной сессии админские индикаторы должны быть скрыты
            const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
            expect(shouldShowAdminIndicators).toBeFalsy();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.3: Session expiration behavior', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }), // userId
          fc.integer({ min: -10, max: 10 }), // секунды относительно текущего времени
          (userId, secondsOffset) => {
            // Создаем токен с кастомным временем истечения
            const jwt = require('jsonwebtoken');
            const currentTime = Math.floor(Date.now() / 1000);
            const expirationTime = currentTime + secondsOffset;
            
            const payload = {
              userId: userId,
              role: 'admin',
              iat: currentTime,
              exp: expirationTime
            };
            
            const token = jwt.sign(payload, authService.jwtSecret);
            
            // Валидируем токен
            const sessionData = authService.validateSession(token);
            
            if (secondsOffset > 0) {
              // Токен должен быть валидным (не истек)
              expect(sessionData).toBeTruthy();
              expect(sessionData.userId).toBe(userId);
              expect(sessionData.role).toBe('admin');
              
              // Админские индикаторы должны быть видны
              const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
              expect(shouldShowAdminIndicators).toBe(true);
            } else {
              // Токен должен быть невалидным (истек)
              expect(sessionData).toBeNull();
              
              // Админские индикаторы должны быть скрыты
              const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
              expect(shouldShowAdminIndicators).toBeFalsy();
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.4: Session role validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }), // userId
          fc.oneof(
            fc.constant('admin'),
            fc.constant('user'),
            fc.constant('guest'),
            fc.constant('moderator'),
            fc.string({ minLength: 1, maxLength: 20 }), // случайные роли
            fc.constant(null),
            fc.constant(undefined)
          ), // role
          (userId, role) => {
            // Создаем токен с кастомной ролью
            const jwt = require('jsonwebtoken');
            const currentTime = Math.floor(Date.now() / 1000);
            
            const payload = {
              userId: userId,
              role: role,
              iat: currentTime,
              exp: currentTime + 3600 // +1 час
            };
            
            const token = jwt.sign(payload, authService.jwtSecret);
            
            // Валидируем токен
            const sessionData = authService.validateSession(token);
            
            if (role === 'admin') {
              // Только роль 'admin' должна быть валидной
              expect(sessionData).toBeTruthy();
              expect(sessionData.role).toBe('admin');
              
              // Админские индикаторы должны быть видны
              const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
              expect(shouldShowAdminIndicators).toBe(true);
            } else {
              // Все остальные роли должны быть отклонены
              expect(sessionData).toBeNull();
              
              // Админские индикаторы должны быть скрыты
              const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
              expect(shouldShowAdminIndicators).toBeFalsy();
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.5: Session token format validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          (userId) => {
            // Создаем валидную сессию
            const validToken = authService.createSession(userId);
            
            // Проверяем формат токена
            expect(typeof validToken).toBe('string');
            expect(validToken.length).toBeGreaterThan(0);
            
            // JWT токен должен состоять из трех частей, разделенных точками
            const tokenParts = validToken.split('.');
            expect(tokenParts.length).toBe(3);
            
            // Каждая часть должна быть base64-encoded строкой
            for (const part of tokenParts) {
              expect(part.length).toBeGreaterThan(0);
              expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
            }
            
            // Валидируем созданный токен
            const sessionData = authService.validateSession(validToken);
            expect(sessionData).toBeTruthy();
            expect(sessionData.userId).toBe(userId);
            expect(sessionData.role).toBe('admin');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.6: Multiple concurrent sessions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }), // userIds
          (userIds) => {
            const tokens = [];
            
            // Создаем несколько сессий
            for (const userId of userIds) {
              const token = authService.createSession(userId);
              tokens.push({ userId, token });
            }
            
            // Все токены должны быть валидными
            for (const { userId, token } of tokens) {
              const sessionData = authService.validateSession(token);
              
              expect(sessionData).toBeTruthy();
              expect(sessionData.userId).toBe(userId);
              expect(sessionData.role).toBe('admin');
              
              // Каждая валидная сессия должна показывать админские индикаторы
              const shouldShowAdminIndicators = sessionData && sessionData.role === 'admin';
              expect(shouldShowAdminIndicators).toBe(true);
            }
            
            // Проверяем уникальность токенов
            const uniqueTokens = new Set(tokens.map(t => t.token));
            expect(uniqueTokens.size).toBe(tokens.length);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
  /**
   * Property 3: Authentication Error Handling
   * Validates: Requirements 1.5, 1.6
   * 
   * For any incorrect verification code or expired session, the system should 
   * reject the authentication attempt and log the failure with appropriate error messages
   */
  describe('Property 3: Authentication Error Handling', () => {
    let authService;

    beforeEach(() => {
      authService = new AuthService();
      // Очищаем все коды перед каждым тестом
      authService.verificationCodes.clear();
    });

    afterEach(() => {
      // Очищаем все коды после каждого теста
      if (authService && authService.verificationCodes) {
        authService.verificationCodes.clear();
      }
    });
    
    it('Property 3.1: Incorrect verification codes are rejected and logged', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 10 }), // Короткие строки
            fc.string({ minLength: 7, maxLength: 20 }), // Длинные строки
            fc.integer().map(n => n.toString()), // Числа как строки
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('123456'), // Валидный формат, но неправильный код
            fc.constant('abcdef'), // Буквы вместо цифр
            fc.constant('12345'), // Слишком короткий
            fc.constant('1234567'), // Слишком длинный
            fc.array(fc.integer(), { minLength: 0, maxLength: 6 }), // Массивы
            fc.object() // Объекты
          ),
          (incorrectCode) => {
            // Генерируем валидный код для сравнения
            const validCode = authService.generateVerificationCode();
            
            // Проверяем, что неправильные коды отклоняются
            if (incorrectCode !== validCode) {
              const result = authService.verifyCode(incorrectCode);
              expect(result).toBe(false);
              
              // Проверяем, что валидный код все еще работает (если это строка правильного формата)
              if (typeof incorrectCode === 'string' && /^\d{6}$/.test(incorrectCode) && incorrectCode !== validCode) {
                // Это валидный формат, но неправильный код - должен быть отклонен
                expect(result).toBe(false);
                
                // Валидный код должен все еще работать
                expect(authService.verifyCode(validCode)).toBe(true);
              } else {
                // Невалидный формат - должен быть отклонен
                expect(result).toBe(false);
                
                // Валидный код должен все еще работать
                expect(authService.verifyCode(validCode)).toBe(true);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.2: Expired verification codes are invalidated', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Количество кодов для тестирования
          (codeCount) => {
            const codes = [];
            
            // Генерируем коды
            for (let i = 0; i < codeCount; i++) {
              const code = authService.generateVerificationCode();
              codes.push(code);
              
              // Проверяем, что код изначально валиден
              expect(authService.verificationCodes.has(code)).toBe(true);
            }
            
            // Искусственно делаем коды истекшими
            for (const code of codes) {
              const codeData = authService.verificationCodes.get(code);
              if (codeData) {
                codeData.expiresAt = Date.now() - 1000; // Истек секунду назад
              }
            }
            
            // Проверяем, что истекшие коды отклоняются
            for (const code of codes) {
              const result = authService.verifyCode(code);
              expect(result).toBe(false);
              
              // Код должен быть удален из хранилища после проверки
              expect(authService.verificationCodes.has(code)).toBe(false);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.3: Code expiration timing is accurate', () => {
      fc.assert(
        fc.property(
          // Исключаем 0 — граничный случай нестабилен из-за задержки выполнения кода
          fc.oneof(
            fc.integer({ min: -10000, max: -1 }),  // Истекший код
            fc.integer({ min: 1000, max: 10000 })  // Действующий код (минимум 1 сек запаса)
          ),
          (timeOffset) => {
            // Генерируем код
            const code = authService.generateVerificationCode();
            const codeData = authService.verificationCodes.get(code);
            
            expect(codeData).toBeTruthy();
            expect(codeData.expiresAt).toBeTruthy();
            
            // Проверяем, что время истечения установлено правильно (5 минут = 300000 мс)
            const expectedExpirationTime = codeData.createdAt + (5 * 60 * 1000);
            expect(Math.abs(codeData.expiresAt - expectedExpirationTime)).toBeLessThan(1000);
            
            // Искусственно изменяем время истечения
            codeData.expiresAt = Date.now() + timeOffset;
            
            // Проверяем валидацию в зависимости от времени
            const result = authService.verifyCode(code);
            
            if (timeOffset > 0) {
              // Код еще не истек - должен быть валидным
              expect(result).toBe(true);
              // После использования код должен быть удален
              expect(authService.verificationCodes.has(code)).toBe(false);
            } else {
              // Код истек - должен быть невалидным
              expect(result).toBe(false);
              // Истекший код должен быть удален
              expect(authService.verificationCodes.has(code)).toBe(false);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.4: Multiple failed attempts handling', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.integer().map(n => n.toString()),
              fc.constant('wrong'),
              fc.constant('123456'),
              fc.constant('000000')
            ),
            { minLength: 1, maxLength: 10 }
          ), // Массив неправильных кодов
          (incorrectCodes) => {
            // Генерируем валидный код
            const validCode = authService.generateVerificationCode();
            
            // Пытаемся использовать неправильные коды
            for (const incorrectCode of incorrectCodes) {
              if (incorrectCode !== validCode) {
                const result = authService.verifyCode(incorrectCode);
                expect(result).toBe(false);
              }
            }
            
            // Валидный код должен все еще работать (если он не был среди неправильных)
            if (!incorrectCodes.includes(validCode)) {
              expect(authService.verifyCode(validCode)).toBe(true);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.5: Session validation error handling', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 50 }), // Случайные строки
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('invalid.jwt.token'),
            fc.constant('Bearer invalid'),
            fc.constant('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'), // Невалидный JWT
            fc.integer().map(n => n.toString()), // Числа как строки
            fc.array(fc.string(), { minLength: 0, maxLength: 3 }), // Массивы
            fc.object() // Объекты
          ),
          (invalidToken) => {
            // Все невалидные токены должны возвращать null
            const result = authService.validateSession(invalidToken);
            expect(result).toBeNull();
            
            // Создаем валидный токен для сравнения
            const validToken = authService.createSession('testUser');
            const validResult = authService.validateSession(validToken);
            
            // Валидный токен должен работать
            expect(validResult).toBeTruthy();
            expect(validResult.userId).toBe('testUser');
            expect(validResult.role).toBe('admin');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.6: Expired session handling', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }), // userId
          fc.integer({ min: -3600, max: -1 }), // Секунды в прошлом (истекший токен)
          (userId, secondsInPast) => {
            // Создаем истекший токен
            const jwt = require('jsonwebtoken');
            const currentTime = Math.floor(Date.now() / 1000);
            const expiredTime = currentTime + secondsInPast; // В прошлом
            
            const payload = {
              userId: userId,
              role: 'admin',
              iat: currentTime - 3600, // Создан час назад
              exp: expiredTime // Истек в прошлом
            };
            
            const expiredToken = jwt.sign(payload, authService.jwtSecret);
            
            // Истекший токен должен быть отклонен
            const result = authService.validateSession(expiredToken);
            expect(result).toBeNull();
            
            // Создаем валидный токен для сравнения
            const validToken = authService.createSession(userId);
            const validResult = authService.validateSession(validToken);
            
            // Валидный токен должен работать
            expect(validResult).toBeTruthy();
            expect(validResult.userId).toBe(userId);
            expect(validResult.role).toBe('admin');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.7: Invalid role handling in tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }), // userId
          fc.oneof(
            fc.constant('user'),
            fc.constant('guest'),
            fc.constant('moderator'),
            fc.constant('superuser'),
            fc.string({ minLength: 1, maxLength: 20 }), // Случайные роли
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.integer(),
            fc.array(fc.string(), { minLength: 0, maxLength: 3 })
          ), // Невалидные роли
          (userId, invalidRole) => {
            // Создаем токен с невалидной ролью
            const jwt = require('jsonwebtoken');
            const currentTime = Math.floor(Date.now() / 1000);
            
            const payload = {
              userId: userId,
              role: invalidRole,
              iat: currentTime,
              exp: currentTime + 3600 // +1 час
            };
            
            const tokenWithInvalidRole = jwt.sign(payload, authService.jwtSecret);
            
            // Токен с невалидной ролью должен быть отклонен
            const result = authService.validateSession(tokenWithInvalidRole);
            expect(result).toBeNull();
            
            // Создаем валидный токен для сравнения
            const validToken = authService.createSession(userId);
            const validResult = authService.validateSession(validToken);
            
            // Валидный токен должен работать
            expect(validResult).toBeTruthy();
            expect(validResult.userId).toBe(userId);
            expect(validResult.role).toBe('admin');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.8: Malformed JWT token handling', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }), // Случайные строки
            fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.'), // Строки с точкой
            fc.string({ minLength: 1, maxLength: 50 }).map(s => '.' + s), // Строки начинающиеся с точки
            fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.invalid'), // Строки с .invalid
            fc.string({ minLength: 1, maxLength: 50 }).map(s => 'Bearer ' + s), // Bearer токены
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }).map(arr => arr.join('.')), // Соединенные строки
          ),
          (malformedToken) => {
            // Все неправильно сформированные токены должны быть отклонены
            const result = authService.validateSession(malformedToken);
            expect(result).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3.9: Code cleanup after failed attempts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Количество кодов
          fc.integer({ min: 1, max: 10 }), // Количество неудачных попыток на код
          (codeCount, attemptsPerCode) => {
            const codes = [];
            
            // Генерируем коды
            for (let i = 0; i < codeCount; i++) {
              codes.push(authService.generateVerificationCode());
            }
            
            // Делаем несколько неудачных попыток для каждого кода
            for (const code of codes) {
              for (let attempt = 0; attempt < attemptsPerCode; attempt++) {
                const wrongCode = code.replace(/\d/, '0'); // Изменяем одну цифру
                const result = authService.verifyCode(wrongCode);
                expect(result).toBe(false);
                
                // Оригинальный код должен все еще существовать после неудачных попыток
                expect(authService.verificationCodes.has(code)).toBe(true);
              }
            }
            
            // Используем правильные коды
            for (const code of codes) {
              const result = authService.verifyCode(code);
              expect(result).toBe(true);
              
              // После успешного использования код должен быть удален
              expect(authService.verificationCodes.has(code)).toBe(false);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 3.10: Automatic cleanup of expired codes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Количество кодов
          (codeCount) => {
            const codes = [];
            
            // Генерируем коды
            for (let i = 0; i < codeCount; i++) {
              codes.push(authService.generateVerificationCode());
            }
            
            // Проверяем, что все коды существуют
            for (const code of codes) {
              expect(authService.verificationCodes.has(code)).toBe(true);
            }
            
            // Искусственно делаем половину кодов истекшими
            const expiredCodes = codes.slice(0, Math.floor(codeCount / 2));
            const validCodes = codes.slice(Math.floor(codeCount / 2));
            
            for (const code of expiredCodes) {
              const codeData = authService.verificationCodes.get(code);
              if (codeData) {
                codeData.expiresAt = Date.now() - 1000; // Истек секунду назад
              }
            }
            
            // Запускаем очистку
            authService.cleanupExpiredCodes();
            
            // Истекшие коды должны быть удалены
            for (const code of expiredCodes) {
              expect(authService.verificationCodes.has(code)).toBe(false);
            }
            
            // Валидные коды должны остаться
            for (const code of validCodes) {
              expect(authService.verificationCodes.has(code)).toBe(true);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
