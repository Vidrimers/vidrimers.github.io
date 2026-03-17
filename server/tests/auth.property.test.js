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
});