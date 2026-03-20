/**
 * Property-based тесты для системы безопасности
 * Feature: admin-cms-system
 * Property 15: Security Validation Comprehensive
 * Validates: Requirements 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import DOMPurify from 'isomorphic-dompurify';
import {
  createRateLimiter,
  generateCsrfToken,
  validateCsrfToken,
  csrfProtection,
  getRateLimitStore,
  getCsrfTokenStore,
  CSRF_TOKEN_TTL
} from '../middleware/security.js';
import FileService, { checkMagicBytes } from '../services/fileService.js';
import { sanitizeProject, sanitizeCategory } from '../middleware/validation.js';

// ─── Вспомогательные функции ─────────────────────────────────────────────────

/**
 * Создаёт mock Express req/res/next для тестирования middleware
 */
function createMockReqRes(overrides = {}) {
  const req = {
    method: 'POST',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    headers: {},
    body: {},
    ...overrides
  };
  const responses = [];
  const res = {
    status: (code) => ({
      json: (data) => { responses.push({ code, data }); return { code, data }; }
    }),
    set: () => {},
    _responses: responses
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, wasNextCalled: () => nextCalled, getResponses: () => responses };
}

// ─── Property 15: Security Validation Comprehensive ──────────────────────────

describe('Property 15: Security Validation Comprehensive', () => {

  // ── 15.1: XSS защита (Requirement 11.2) ────────────────────────────────────

  describe('Property 15.1: XSS Protection — HTML Sanitization (Req 11.2)', () => {

    it('Property 15.1.1: Опасные теги удаляются из rich text контента', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('<script>alert("xss")</script>Текст'),
            fc.constant('<img src=x onerror=alert(1)>'),
            fc.constant('<iframe src="javascript:alert(1)"></iframe>'),
            fc.constant('<svg onload=alert(1)>'),
            fc.constant('<a href="javascript:void(0)" onclick="alert(1)">click</a>'),
            fc.constant('<div style="background:url(javascript:alert(1))">x</div>'),
            fc.constant('Нормальный текст без тегов'),
            fc.constant('<strong>Жирный</strong> и <em>курсив</em>'),
            fc.constant('<a href="https://example.com">Безопасная ссылка</a>')
          ),
          (htmlInput) => {
            // Санитизация с разрешёнными тегами (как в about.js)
            const sanitized = DOMPurify.sanitize(htmlInput, {
              ALLOWED_TAGS: ['a', 'strong', 'em', 'b', 'i', 'br', 'p', 'span'],
              ALLOWED_ATTR: ['href', 'target', 'rel']
            });

            // Опасные конструкции должны быть удалены
            expect(sanitized).not.toContain('<script');
            expect(sanitized).not.toContain('<iframe');
            expect(sanitized).not.toContain('<svg');
            expect(sanitized).not.toContain('onerror=');
            expect(sanitized).not.toContain('onclick=');
            expect(sanitized).not.toContain('javascript:');
            expect(sanitized).not.toContain('onload=');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.1.2: Безопасные теги сохраняются после санитизации', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Генерируем только ASCII буквы и цифры — без спецсимволов HTML
            text: fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/),
            tag: fc.oneof(
              fc.constant('strong'),
              fc.constant('em'),
              fc.constant('b'),
              fc.constant('i')
            )
          }),
          ({ text, tag }) => {
            const html = `<${tag}>${text}</${tag}>`;
            const sanitized = DOMPurify.sanitize(html, {
              ALLOWED_TAGS: ['a', 'strong', 'em', 'b', 'i', 'br', 'p', 'span'],
              ALLOWED_ATTR: ['href', 'target', 'rel']
            });

            // Безопасный тег должен остаться в выводе
            expect(sanitized).toContain(`<${tag}>`);
            // Текст (без спецсимволов) должен присутствовать без изменений
            expect(sanitized).toContain(text);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.1.3: Названия категорий полностью очищаются от HTML', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('<script>alert(1)</script>Категория'),
            fc.constant('<b>Жирная</b> категория'),
            fc.constant('<div>Обёрнутая</div>'),
            fc.constant('Обычная категория'),
            fc.constant('<img src=x>Категория')
          ),
          (htmlInput) => {
            const req = { body: { id: 'test', nameRu: htmlInput, nameEn: 'Test' } };
            let sanitized = null;
            sanitizeCategory(req, {}, () => { sanitized = req.body; });

            expect(sanitized).not.toBeNull();
            // Названия категорий — ALLOWED_TAGS: [] — никаких тегов
            expect(sanitized.nameRu).not.toContain('<');
            expect(sanitized.nameRu).not.toContain('>');
            expect(sanitized.nameRu).not.toContain('script');
            expect(sanitized.nameRu.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.1.4: Произвольный HTML в полях проекта санитизируется', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (randomInput) => {
            const req = {
              body: {
                id: 'pet-1',
                titleRu: randomInput,
                titleEn: randomInput,
                descriptionRu: randomInput,
                descriptionEn: randomInput,
                categoryId: 'pet'
              }
            };
            let sanitized = null;
            sanitizeProject(req, {}, () => { sanitized = req.body; });

            expect(sanitized).not.toBeNull();
            // Заголовки — ALLOWED_TAGS: [] — никаких тегов
            expect(sanitized.titleRu).not.toContain('<script');
            expect(sanitized.titleRu).not.toContain('onerror=');
            expect(sanitized.titleEn).not.toContain('<script');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── 15.2: Валидация файлов (Requirement 11.3) ──────────────────────────────

  describe('Property 15.2: File Security Validation (Req 11.3)', () => {

    it('Property 15.2.1: Файлы с неразрешёнными MIME-типами отклоняются', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('application/javascript'),
            fc.constant('text/html'),
            fc.constant('application/x-php'),
            fc.constant('application/octet-stream'),
            fc.constant('text/plain'),
            fc.constant('application/pdf'),
            fc.constant('video/mp4'),
            fc.constant('audio/mpeg')
          ),
          (mimetype) => {
            const fileService = new FileService();
            const result = fileService.validateFile({
              mimetype,
              size: 1024,
              originalname: 'test.jpg'
            });

            expect(result.valid).toBe(false);
            expect(result.error).toBeTruthy();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.2.2: Разрешённые типы изображений проходят валидацию', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ mimetype: fc.constant('image/jpeg'), ext: fc.constant('.jpg') }),
            fc.record({ mimetype: fc.constant('image/png'), ext: fc.constant('.png') }),
            fc.record({ mimetype: fc.constant('image/webp'), ext: fc.constant('.webp') }),
            fc.record({ mimetype: fc.constant('image/gif'), ext: fc.constant('.gif') }),
            fc.record({ mimetype: fc.constant('image/svg+xml'), ext: fc.constant('.svg') })
          ),
          ({ mimetype, ext }) => {
            const fileService = new FileService();
            const result = fileService.validateFile({
              mimetype,
              size: 1024 * 100, // 100KB
              originalname: `image${ext}`
            });

            expect(result.valid).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.2.3: Файлы превышающие 5MB отклоняются', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 }),
          (oversizedBytes) => {
            const fileService = new FileService();
            const result = fileService.validateFile({
              mimetype: 'image/jpeg',
              size: oversizedBytes,
              originalname: 'large.jpg'
            });

            expect(result.valid).toBe(false);
            expect(result.error).toContain('5 MB');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.2.4: Path traversal в именах файлов отклоняется', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('../../../etc/passwd'),
            fc.constant('..\\..\\windows\\system32'),
            fc.constant('/etc/passwd'),
            fc.constant('path/to/file.jpg'),
            fc.constant('path\\to\\file.jpg')
          ),
          (dangerousName) => {
            const fileService = new FileService();
            const result = fileService.validateFile({
              mimetype: 'image/jpeg',
              size: 1024,
              originalname: dangerousName
            });

            expect(result.valid).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.2.5: Magic bytes проверка отклоняет файлы с поддельным расширением', () => {
      // Создаём буфер с сигнатурой PNG, но заявляем JPEG
      const pngMagic = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const jpegResult = checkMagicBytes(pngMagic, 'image/jpeg');
      expect(jpegResult.valid).toBe(false);

      // Правильный JPEG magic bytes
      const jpegMagic = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const jpegOk = checkMagicBytes(jpegMagic, 'image/jpeg');
      expect(jpegOk.valid).toBe(true);

      // PNG с правильными magic bytes
      const pngOk = checkMagicBytes(pngMagic, 'image/png');
      expect(pngOk.valid).toBe(true);
    });

    it('Property 15.2.6: Magic bytes проверка для GIF и WebP', () => {
      // GIF magic bytes: 47 49 46 38
      const gifMagic = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(checkMagicBytes(gifMagic, 'image/gif').valid).toBe(true);
      expect(checkMagicBytes(gifMagic, 'image/png').valid).toBe(false);

      // WebP: RIFF....WEBP
      const webpMagic = Buffer.alloc(12);
      webpMagic.write('RIFF', 0, 'ascii');
      webpMagic.writeUInt32LE(100, 4);
      webpMagic.write('WEBP', 8, 'ascii');
      expect(checkMagicBytes(webpMagic, 'image/webp').valid).toBe(true);
      expect(checkMagicBytes(webpMagic, 'image/jpeg').valid).toBe(false);
    });
  });

  // ── 15.3: Rate Limiting (Requirement 11.4) ─────────────────────────────────

  describe('Property 15.3: Rate Limiting (Req 11.4)', () => {

    beforeEach(() => {
      // Очищаем store перед каждым тестом
      getRateLimitStore().clear();
    });

    it('Property 15.3.1: Запросы в пределах лимита проходят', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (maxRequests) => {
            getRateLimitStore().clear();
            const limiter = createRateLimiter({ windowMs: 60000, max: maxRequests });

            let passedCount = 0;
            let blockedCount = 0;

            for (let i = 0; i < maxRequests; i++) {
              const { req, res, next, wasNextCalled } = createMockReqRes({ ip: `10.0.0.${i % 255 + 1}` });
              // Используем один IP для проверки лимита
              req.ip = '192.168.1.100';
              limiter(req, res, next);
              if (wasNextCalled()) passedCount++;
              else blockedCount++;
            }

            // Все запросы в пределах лимита должны пройти
            expect(passedCount).toBe(maxRequests);
            expect(blockedCount).toBe(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 15.3.2: Запросы сверх лимита блокируются с кодом 429', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (maxRequests, extraRequests) => {
            getRateLimitStore().clear();
            const limiter = createRateLimiter({ windowMs: 60000, max: maxRequests });
            const testIp = '10.10.10.10';

            // Исчерпываем лимит
            for (let i = 0; i < maxRequests; i++) {
              const { req, res, next } = createMockReqRes({ ip: testIp });
              limiter(req, res, next);
            }

            // Дополнительные запросы должны быть заблокированы
            for (let i = 0; i < extraRequests; i++) {
              const { req, res, next, wasNextCalled, getResponses } = createMockReqRes({ ip: testIp });
              limiter(req, res, next);

              expect(wasNextCalled()).toBe(false);
              const responses = getResponses();
              expect(responses.length).toBeGreaterThan(0);
              expect(responses[0].code).toBe(429);
              expect(responses[0].data.error.code).toBe('RATE_LIMIT_EXCEEDED');
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 15.3.3: Разные IP имеют независимые счётчики', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (maxRequests) => {
            getRateLimitStore().clear();
            const limiter = createRateLimiter({ windowMs: 60000, max: maxRequests });

            const ip1 = '1.1.1.1';
            const ip2 = '2.2.2.2';

            // Исчерпываем лимит для ip1
            for (let i = 0; i < maxRequests; i++) {
              const { req, res, next } = createMockReqRes({ ip: ip1 });
              limiter(req, res, next);
            }

            // ip2 должен всё ещё проходить
            const { req, res, next, wasNextCalled } = createMockReqRes({ ip: ip2 });
            limiter(req, res, next);
            expect(wasNextCalled()).toBe(true);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 15.3.4: Ответ 429 содержит Retry-After и корректную структуру', () => {
      getRateLimitStore().clear();
      const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
      const testIp = '99.99.99.99';

      // Первый запрос — проходит
      const first = createMockReqRes({ ip: testIp });
      limiter(first.req, first.res, first.next);
      expect(first.wasNextCalled()).toBe(true);

      // Второй запрос — блокируется
      const second = createMockReqRes({ ip: testIp });
      let retryAfterSet = false;
      second.res.set = (header) => { if (header === 'Retry-After') retryAfterSet = true; };
      limiter(second.req, second.res, second.next);

      expect(second.wasNextCalled()).toBe(false);
      expect(retryAfterSet).toBe(true);
      const responses = second.getResponses();
      expect(responses[0].code).toBe(429);
      expect(responses[0].data.success).toBe(false);
      expect(typeof responses[0].data.error.retryAfter).toBe('number');
    });
  });

  // ── 15.4: CSRF защита (Requirement 11.5) ───────────────────────────────────

  describe('Property 15.4: CSRF Protection (Req 11.5)', () => {

    beforeEach(() => {
      getCsrfTokenStore().clear();
    });

    it('Property 15.4.1: Сгенерированный CSRF токен проходит валидацию', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (ip) => {
            getCsrfTokenStore().clear();
            const token = generateCsrfToken(ip);

            expect(typeof token).toBe('string');
            expect(token.length).toBe(64); // 32 bytes hex = 64 chars
            expect(token).toMatch(/^[0-9a-f]+$/);

            const isValid = validateCsrfToken(token, ip);
            expect(isValid).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.4.2: Случайные строки не проходят CSRF валидацию', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 100 }),
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('fake-csrf-token'),
            fc.constant('00000000000000000000000000000000')
          ),
          (fakeToken) => {
            getCsrfTokenStore().clear();
            const isValid = validateCsrfToken(fakeToken, '127.0.0.1');
            expect(isValid).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 15.4.3: Истекший CSRF токен отклоняется', () => {
      getCsrfTokenStore().clear();
      const token = generateCsrfToken('127.0.0.1');

      // Искусственно делаем токен истекшим
      const store = getCsrfTokenStore();
      const data = store.get(token);
      data.createdAt = Date.now() - CSRF_TOKEN_TTL - 1000;

      const isValid = validateCsrfToken(token, '127.0.0.1');
      expect(isValid).toBe(false);
      // Истекший токен должен быть удалён из store
      expect(store.has(token)).toBe(false);
    });

    it('Property 15.4.4: Каждый вызов generateCsrfToken создаёт уникальный токен', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          (count) => {
            getCsrfTokenStore().clear();
            const tokens = new Set();

            for (let i = 0; i < count; i++) {
              tokens.add(generateCsrfToken('127.0.0.1'));
            }

            // Все токены должны быть уникальными
            expect(tokens.size).toBe(count);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 15.4.5: GET запросы не требуют CSRF токена', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('GET'),
            fc.constant('HEAD'),
            fc.constant('OPTIONS')
          ),
          (method) => {
            getCsrfTokenStore().clear();
            const { req, res, next, wasNextCalled } = createMockReqRes({ method });
            // Нет токена в заголовках
            csrfProtection(req, res, next);
            expect(wasNextCalled()).toBe(true);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 15.4.6: POST/PUT/DELETE без CSRF токена отклоняются с кодом 403', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('POST'),
            fc.constant('PUT'),
            fc.constant('DELETE')
          ),
          (method) => {
            getCsrfTokenStore().clear();
            const { req, res, next, wasNextCalled, getResponses } = createMockReqRes({ method });
            // Нет токена
            csrfProtection(req, res, next);

            expect(wasNextCalled()).toBe(false);
            const responses = getResponses();
            expect(responses[0].code).toBe(403);
            expect(responses[0].data.error.code).toBe('CSRF_TOKEN_INVALID');
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 15.4.7: POST с валидным CSRF токеном в заголовке проходит', () => {
      getCsrfTokenStore().clear();

      const ip = '127.0.0.1';
      const token = generateCsrfToken(ip);

      const { req, res, next, wasNextCalled } = createMockReqRes({
        method: 'POST',
        ip,
        headers: { 'x-csrf-token': token }
      });

      csrfProtection(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it('Property 15.4.8: POST с валидным CSRF токеном в теле запроса проходит', () => {
      getCsrfTokenStore().clear();

      const ip = '127.0.0.1';
      const token = generateCsrfToken(ip);

      const { req, res, next, wasNextCalled } = createMockReqRes({
        method: 'POST',
        ip,
        body: { csrfToken: token }
      });

      csrfProtection(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });
  });

});
