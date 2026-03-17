/**
 * Property-based тесты для валидации контента
 * Feature: admin-cms-system, Property 6: Content Validation Consistency
 * Validates: Requirements 4.5, 5.4, 6.5, 7.5, 8.4, 11.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { validateProject, validateCategory, sanitizeProject, sanitizeCategory } from '../middleware/validation.js';

describe('Property 6: Content Validation Consistency', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: (code) => ({
        json: (data) => ({ statusCode: code, data })
      })
    };
    mockNext = () => {};
  });

  /**
   * Property 6: Content Validation Consistency
   * For any content form, validation should reject invalid data with specific 
   * error messages on both client and server side, and accept valid data for successful saving
   * Validates: Requirements 4.5, 5.4, 6.5, 7.5, 8.4, 11.1
   */
  describe('Property 6.1: Project validation consistency', () => {
    
    it('Property 6.1.1: Valid project data should pass validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.oneof(
              fc.constant('pet-1'),
              fc.constant('pet-2'),
              fc.constant('layout-1'),
              fc.constant('layout-5'),
              fc.constant('commercial-1')
            ),
            titleRu: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
            titleEn: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
            descriptionRu: fc.string({ minLength: 10, maxLength: 1000 }).filter(s => s.trim().length >= 10),
            descriptionEn: fc.string({ minLength: 10, maxLength: 1000 }).filter(s => s.trim().length >= 10),
            categoryId: fc.oneof(
              fc.constant('pet'),
              fc.constant('layout'),
              fc.constant('commercial')
            ),
            imagePath: fc.oneof(
              fc.constant('/images/test.jpg'),
              fc.constant('/uploads/project.png'),
              fc.constant('./assets/image.webp'),
              fc.constant(null),
              fc.constant(undefined)
            ),
            link: fc.oneof(
              fc.constant('https://example.com'),
              fc.constant('http://test.site'),
              fc.constant('https://github.com/user/repo'),
              fc.constant(null),
              fc.constant(undefined)
            ),
            isAi: fc.boolean(),
            isNew: fc.boolean(),
            isInProgress: fc.boolean(),
            isHidden: fc.boolean(),
            sortOrder: fc.integer({ min: 0, max: 100 })
          }),
          (validProjectData) => {
            mockReq.body = validProjectData;
            
            let validationPassed = true;
            let errorResponse = null;
            
            // Переопределяем mockRes для перехвата ошибок
            mockRes.status = (code) => ({
              json: (data) => {
                if (code >= 400) {
                  validationPassed = false;
                  errorResponse = data;
                }
                return { statusCode: code, data };
              }
            });
            
            // Запускаем валидацию
            validateProject(mockReq, mockRes, mockNext);
            
            // Валидные данные должны проходить валидацию
            expect(validationPassed).toBe(true);
            expect(errorResponse).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.1.2: Invalid project data should be rejected with specific errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Невалидные ID
            fc.record({
              id: fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.constant('invalid-id'),
                fc.constant('pet'),
                fc.constant('pet-'),
                fc.constant('wrongformat-1'),
                fc.string({ minLength: 21, maxLength: 50 }) // Слишком длинный
              ),
              titleRu: fc.constant('Валидное название'),
              titleEn: fc.constant('Valid title'),
              descriptionRu: fc.constant('Валидное описание проекта'),
              descriptionEn: fc.constant('Valid project description'),
              categoryId: fc.constant('pet')
            }),
            // Невалидные названия
            fc.record({
              id: fc.constant('pet-1'),
              titleRu: fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.constant('А'), // Слишком короткое
                fc.string({ minLength: 101, maxLength: 200 }) // Слишком длинное
              ),
              titleEn: fc.constant('Valid title'),
              descriptionRu: fc.constant('Валидное описание проекта'),
              descriptionEn: fc.constant('Valid project description'),
              categoryId: fc.constant('pet')
            }),
            // Невалидные описания
            fc.record({
              id: fc.constant('pet-1'),
              titleRu: fc.constant('Валидное название'),
              titleEn: fc.constant('Valid title'),
              descriptionRu: fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.constant('Короткое'), // Слишком короткое
                fc.string({ minLength: 1001, maxLength: 2000 }) // Слишком длинное
              ),
              descriptionEn: fc.constant('Valid project description'),
              categoryId: fc.constant('pet')
            }),
            // Невалидные ссылки
            fc.record({
              id: fc.constant('pet-1'),
              titleRu: fc.constant('Валидное название'),
              titleEn: fc.constant('Valid title'),
              descriptionRu: fc.constant('Валидное описание проекта'),
              descriptionEn: fc.constant('Valid project description'),
              categoryId: fc.constant('pet'),
              link: fc.oneof(
                fc.constant('invalid-url'),
                fc.constant('ftp://example.com'),
                fc.constant('javascript:alert(1)'),
                fc.constant('not-a-url')
              )
            }),
            // Невалидные пути к изображениям
            fc.record({
              id: fc.constant('pet-1'),
              titleRu: fc.constant('Валидное название'),
              titleEn: fc.constant('Valid title'),
              descriptionRu: fc.constant('Валидное описание проекта'),
              descriptionEn: fc.constant('Valid project description'),
              categoryId: fc.constant('pet'),
              imagePath: fc.oneof(
                fc.constant('/path/to/file.txt'),
                fc.constant('../../../etc/passwd'),
                fc.constant('image\\with\\backslashes.jpg'),
                fc.constant('/path/to/file.exe')
              )
            })
          ),
          (invalidProjectData) => {
            mockReq.body = invalidProjectData;
            
            let validationPassed = true;
            let errorResponse = null;
            
            // Переопределяем mockRes для перехвата ошибок
            mockRes.status = (code) => ({
              json: (data) => {
                if (code >= 400) {
                  validationPassed = false;
                  errorResponse = data;
                }
                return { statusCode: code, data };
              }
            });
            
            // Запускаем валидацию
            validateProject(mockReq, mockRes, mockNext);
            
            // Невалидные данные должны быть отклонены
            expect(validationPassed).toBe(false);
            expect(errorResponse).toBeTruthy();
            expect(errorResponse.success).toBe(false);
            expect(errorResponse.error).toBeTruthy();
            expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
            expect(Array.isArray(errorResponse.error.details)).toBe(true);
            expect(errorResponse.error.details.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.1.3: Project sanitization should clean and normalize data', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant('  PET-1  '), // С пробелами и заглавными
            titleRu: fc.string({ minLength: 2, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `  ${s}  `),
            titleEn: fc.string({ minLength: 2, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `  ${s}  `),
            descriptionRu: fc.string({ minLength: 10, maxLength: 50 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `  ${s}  `),
            descriptionEn: fc.string({ minLength: 10, maxLength: 50 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `  ${s}  `),
            categoryId: fc.constant('  PET  '), // С пробелами и заглавными
            link: fc.constant('  https://example.com  '),
            imagePath: fc.constant('  /path/to/image.jpg  '),
            sortOrder: fc.oneof(
              fc.constant('5'), // Строка вместо числа
              fc.constant('10.5'), // Дробное число
              fc.constant(null),
              fc.constant(undefined)
            ),
            isAi: fc.oneof(
              fc.constant('true'), // Строка вместо boolean
              fc.constant('false'),
              fc.constant(1),
              fc.constant(0),
              fc.constant(null)
            )
          }),
          (dirtyData) => {
            mockReq.body = { ...dirtyData };
            
            // Создаем mock для next, который сохраняет результат
            let sanitizedData = null;
            const captureNext = () => {
              sanitizedData = mockReq.body;
            };
            
            // Импортируем sanitizeProject напрямую
            const { sanitizeProject } = require('../middleware/validation.js');
            sanitizeProject(mockReq, mockRes, captureNext);
            
            // Проверяем, что данные были санитизированы
            expect(sanitizedData).toBeTruthy();
            
            // ID должен быть приведен к нижнему регистру и обрезан
            expect(sanitizedData.id).toBe('pet-1');
            
            // Строки должны быть обрезаны и санитизированы
            expect(sanitizedData.titleRu.trim()).toBe(dirtyData.titleRu.trim());
            expect(sanitizedData.titleEn.trim()).toBe(dirtyData.titleEn.trim());
            expect(sanitizedData.categoryId).toBe('pet');
            expect(sanitizedData.link).toBe('https://example.com');
            expect(sanitizedData.imagePath).toBe('/path/to/image.jpg');
            
            // Числа должны быть приведены к правильному типу
            expect(typeof sanitizedData.sortOrder).toBe('number');
            expect(sanitizedData.sortOrder).toBeGreaterThanOrEqual(0);
            
            // Булевы значения должны быть приведены к boolean
            expect(typeof sanitizedData.isAi).toBe('boolean');
            expect(typeof sanitizedData.isNew).toBe('boolean');
            expect(typeof sanitizedData.isInProgress).toBe('boolean');
            expect(typeof sanitizedData.isHidden).toBe('boolean');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.2: Category validation consistency', () => {
    
    it('Property 6.2.1: Valid category data should pass validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.oneof(
              fc.constant('pet'),
              fc.constant('layout'),
              fc.constant('commercial'),
              fc.constant('web-design'),
              fc.constant('mobile-apps')
            ),
            nameRu: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            nameEn: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            sortOrder: fc.integer({ min: 0, max: 100 }),
            isHidden: fc.boolean()
          }),
          (validCategoryData) => {
            mockReq.body = validCategoryData;
            
            let validationPassed = true;
            let errorResponse = null;
            
            mockRes.status = (code) => ({
              json: (data) => {
                if (code >= 400) {
                  validationPassed = false;
                  errorResponse = data;
                }
                return { statusCode: code, data };
              }
            });
            
            validateCategory(mockReq, mockRes, mockNext);
            
            expect(validationPassed).toBe(true);
            expect(errorResponse).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.2.2: Invalid category data should be rejected with specific errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Невалидные ID
            fc.record({
              id: fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.constant('A'), // Слишком короткий
                fc.constant('Invalid ID'), // Пробелы
                fc.constant('invalid_id'), // Подчеркивания
                fc.string({ minLength: 21, maxLength: 50 }) // Слишком длинный
              ),
              nameRu: fc.constant('Валидное название'),
              nameEn: fc.constant('Valid name')
            }),
            // Невалидные названия
            fc.record({
              id: fc.constant('valid-id'),
              nameRu: fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.constant('А'), // Слишком короткое
                fc.string({ minLength: 51, maxLength: 100 }) // Слишком длинное
              ),
              nameEn: fc.constant('Valid name')
            }),
            // Невалидный порядок сортировки
            fc.record({
              id: fc.constant('valid-id'),
              nameRu: fc.constant('Валидное название'),
              nameEn: fc.constant('Valid name'),
              sortOrder: fc.oneof(
                fc.constant(-1), // Отрицательное число
                fc.constant(-10),
                fc.constant('invalid') // Не число
              )
            })
          ),
          (invalidCategoryData) => {
            mockReq.body = invalidCategoryData;
            
            let validationPassed = true;
            let errorResponse = null;
            
            mockRes.status = (code) => ({
              json: (data) => {
                if (code >= 400) {
                  validationPassed = false;
                  errorResponse = data;
                }
                return { statusCode: code, data };
              }
            });
            
            validateCategory(mockReq, mockRes, mockNext);
            
            expect(validationPassed).toBe(false);
            expect(errorResponse).toBeTruthy();
            expect(errorResponse.success).toBe(false);
            expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
            expect(Array.isArray(errorResponse.error.details)).toBe(true);
            expect(errorResponse.error.details.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.2.3: Category sanitization should clean and normalize data', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant('  VALID-ID  '), // С пробелами и заглавными
            nameRu: fc.string({ minLength: 2, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `  ${s}  `),
            nameEn: fc.string({ minLength: 2, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `  ${s}  `),
            sortOrder: fc.oneof(
              fc.constant('15'), // Строка
              fc.constant('20.7'), // Дробное
              fc.constant(null)
            ),
            isHidden: fc.oneof(
              fc.constant('true'), // Строка
              fc.constant(1), // Число
              fc.constant(null)
            )
          }),
          (dirtyData) => {
            mockReq.body = { ...dirtyData };
            
            let sanitizedData = null;
            const captureNext = () => {
              sanitizedData = mockReq.body;
            };
            
            const { sanitizeCategory } = require('../middleware/validation.js');
            sanitizeCategory(mockReq, mockRes, captureNext);
            
            expect(sanitizedData).toBeTruthy();
            
            // ID должен быть приведен к нижнему регистру и обрезан
            expect(sanitizedData.id).toBe('valid-id');
            
            // Строки должны быть обрезаны и санитизированы
            expect(sanitizedData.nameRu.trim()).toBe(dirtyData.nameRu.trim());
            expect(sanitizedData.nameEn.trim()).toBe(dirtyData.nameEn.trim());
            
            // Числа и булевы значения должны быть приведены к правильному типу
            expect(typeof sanitizedData.sortOrder).toBe('number');
            expect(typeof sanitizedData.isHidden).toBe('boolean');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.3: XSS Protection and HTML Sanitization', () => {
    
    it('Property 6.3.1: Malicious HTML should be sanitized in project descriptions', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('<script>alert("xss")</script>Описание проекта'),
            fc.constant('Описание с <img src="x" onerror="alert(1)"> картинкой'),
            fc.constant('<iframe src="javascript:alert(1)"></iframe>'),
            fc.constant('Текст с <a href="javascript:void(0)" onclick="alert(1)">ссылкой</a>'),
            fc.constant('<div style="background:url(javascript:alert(1))">Текст</div>'),
            fc.constant('Описание с <strong>жирным</strong> и <em>курсивом</em> текстом'), // Разрешенные теги
            fc.constant('Текст с <a href="https://example.com">безопасной ссылкой</a>')
          ),
          (htmlContent) => {
            const projectData = {
              id: 'pet-1',
              titleRu: 'Тестовый проект',
              titleEn: 'Test Project',
              descriptionRu: htmlContent,
              descriptionEn: 'Valid description',
              categoryId: 'pet'
            };
            
            mockReq.body = projectData;
            
            let sanitizedData = null;
            const captureNext = () => {
              sanitizedData = mockReq.body;
            };
            
            const { sanitizeProject } = require('../middleware/validation.js');
            sanitizeProject(mockReq, mockRes, captureNext);
            
            expect(sanitizedData).toBeTruthy();
            
            // Проверяем, что опасные теги удалены
            expect(sanitizedData.descriptionRu).not.toContain('<script>');
            expect(sanitizedData.descriptionRu).not.toContain('<iframe>');
            expect(sanitizedData.descriptionRu).not.toContain('javascript:');
            expect(sanitizedData.descriptionRu).not.toContain('onerror=');
            expect(sanitizedData.descriptionRu).not.toContain('onclick=');
            
            // Проверяем, что безопасные теги сохранены (если они были)
            if (htmlContent.includes('<strong>') && !htmlContent.includes('script')) {
              expect(sanitizedData.descriptionRu).toContain('<strong>');
            }
            if (htmlContent.includes('<em>') && !htmlContent.includes('script')) {
              expect(sanitizedData.descriptionRu).toContain('<em>');
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.3.2: Category names should be completely stripped of HTML', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('<script>alert("xss")</script>Категория'),
            fc.constant('Категория с <b>жирным</b> текстом'),
            fc.constant('<div>Обернутая категория</div>'),
            fc.constant('Категория с <a href="#">ссылкой</a>'),
            fc.constant('<img src="x">Категория')
          ),
          (htmlContent) => {
            const categoryData = {
              id: 'test-category',
              nameRu: htmlContent,
              nameEn: 'Test Category'
            };
            
            mockReq.body = categoryData;
            
            let sanitizedData = null;
            const captureNext = () => {
              sanitizedData = mockReq.body;
            };
            
            const { sanitizeCategory } = require('../middleware/validation.js');
            sanitizeCategory(mockReq, mockRes, captureNext);
            
            expect(sanitizedData).toBeTruthy();
            
            // В названиях категорий HTML теги должны быть полностью удалены
            expect(sanitizedData.nameRu).not.toContain('<');
            expect(sanitizedData.nameRu).not.toContain('>');
            expect(sanitizedData.nameRu).not.toContain('script');
            
            // Текстовое содержимое должно остаться
            expect(sanitizedData.nameRu.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.4: Validation Error Message Consistency', () => {
    
    it('Property 6.4.1: All validation errors should have consistent structure', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Различные типы невалидных данных
            fc.record({ id: fc.constant('') }), // Пустой ID
            fc.record({ titleRu: fc.constant('') }), // Пустое название
            fc.record({ descriptionRu: fc.constant('') }), // Пустое описание
            fc.record({ categoryId: fc.constant('') }), // Пустая категория
            fc.record({ link: fc.constant('invalid-url') }), // Невалидная ссылка
            fc.record({ sortOrder: fc.constant(-1) }) // Невалидный порядок
          ),
          (invalidData) => {
            // Дополняем минимально необходимыми полями для прохождения других проверок
            const completeData = {
              id: 'pet-1',
              titleRu: 'Валидное название',
              titleEn: 'Valid title',
              descriptionRu: 'Валидное описание проекта',
              descriptionEn: 'Valid project description',
              categoryId: 'pet',
              ...invalidData // Перезаписываем невалидными данными
            };
            
            mockReq.body = completeData;
            
            let errorResponse = null;
            mockRes.status = (code) => ({
              json: (data) => {
                if (code >= 400) {
                  errorResponse = data;
                }
                return { statusCode: code, data };
              }
            });
            
            validateProject(mockReq, mockRes, mockNext);
            
            if (errorResponse) {
              // Проверяем структуру ошибки
              expect(errorResponse).toBeTruthy();
              expect(errorResponse.success).toBe(false);
              expect(errorResponse.error).toBeTruthy();
              expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
              expect(errorResponse.error.message).toBeTruthy();
              expect(Array.isArray(errorResponse.error.details)).toBe(true);
              expect(errorResponse.error.details.length).toBeGreaterThan(0);
              expect(errorResponse.timestamp).toBeTruthy();
              
              // Каждая ошибка должна быть строкой
              errorResponse.error.details.forEach(error => {
                expect(typeof error).toBe('string');
                expect(error.length).toBeGreaterThan(0);
              });
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.5: Type Coercion and Data Normalization', () => {
    
    it('Property 6.5.1: Numeric and boolean fields should be properly coerced', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant('pet-1'),
            titleRu: fc.constant('Тестовый проект'),
            titleEn: fc.constant('Test Project'),
            descriptionRu: fc.constant('Описание тестового проекта'),
            descriptionEn: fc.constant('Test project description'),
            categoryId: fc.constant('pet'),
            sortOrder: fc.oneof(
              fc.constant('42'), // Строка с числом
              fc.constant('0'), // Строка с нулем
              fc.constant(''), // Пустая строка
              fc.constant(null), // null
              fc.constant(undefined), // undefined
              fc.constant('15.7'), // Дробное число как строка
              fc.constant('invalid') // Невалидная строка
            ),
            isAi: fc.oneof(
              fc.constant('true'), // Строка 'true'
              fc.constant('false'), // Строка 'false'
              fc.constant('1'), // Строка '1'
              fc.constant('0'), // Строка '0'
              fc.constant(1), // Число 1
              fc.constant(0), // Число 0
              fc.constant(''), // Пустая строка
              fc.constant(null), // null
              fc.constant(undefined), // undefined
              fc.constant('yes'), // Произвольная строка
              fc.constant([]) // Массив
            ),
            isNew: fc.boolean(),
            isInProgress: fc.boolean(),
            isHidden: fc.boolean()
          }),
          (mixedTypeData) => {
            mockReq.body = { ...mixedTypeData };
            
            let sanitizedData = null;
            const captureNext = () => {
              sanitizedData = mockReq.body;
            };
            
            const { sanitizeProject } = require('../middleware/validation.js');
            sanitizeProject(mockReq, mockRes, captureNext);
            
            expect(sanitizedData).toBeTruthy();
            
            // sortOrder должен быть числом или 0 по умолчанию
            expect(typeof sanitizedData.sortOrder).toBe('number');
            expect(sanitizedData.sortOrder).toBeGreaterThanOrEqual(0);
            
            // Все булевы поля должны быть boolean
            expect(typeof sanitizedData.isAi).toBe('boolean');
            expect(typeof sanitizedData.isNew).toBe('boolean');
            expect(typeof sanitizedData.isInProgress).toBe('boolean');
            expect(typeof sanitizedData.isHidden).toBe('boolean');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});