/**
 * Property-based тесты для rich text редактора раздела "Обо мне"
 * Feature: admin-cms-system, Property 17: Rich Text Editor Functionality
 * Validates: Requirements 4.9, 6.3, 6.6
 *
 * Тесты проверяют:
 * - Корректное разбиение контента на параграфы (разделитель \n\n)
 * - Сохранение структуры параграфов при сохранении и загрузке
 * - Вставку ссылок в формате [текст](url)
 * - Валидацию обязательных полей (contentRu, contentEn)
 * - Round-trip: сохранение → загрузка возвращает эквивалентные данные
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// ─── Вспомогательные функции (дублируют логику компонента и роута) ───────────

/**
 * Разбивает raw-строку на параграфы (как делает роут /api/about)
 */
const splitToParagraphs = (raw) =>
  raw.split('\n\n').map(p => p.trim()).filter(Boolean);

/**
 * Объединяет параграфы обратно в raw-строку
 */
const joinParagraphs = (paragraphs) => paragraphs.join('\n\n');

/**
 * Вставляет текст в позицию курсора (логика из RichTextToolbar)
 */
const insertAtCursor = (text, cursorStart, cursorEnd, before, after = '') => {
  const selected = text.substring(cursorStart, cursorEnd);
  const newText =
    text.substring(0, cursorStart) +
    before +
    selected +
    after +
    text.substring(cursorEnd);
  const newCursor = cursorStart + before.length + selected.length + after.length;
  return { newText, newCursor };
};

/**
 * Вставляет markdown-ссылку вокруг выделенного текста
 */
const insertLink = (text, cursorStart, cursorEnd, url) => {
  const selected = text.substring(cursorStart, cursorEnd) || 'текст ссылки';
  const linkMarkup = `[${selected}](${url})`;
  const newText =
    text.substring(0, cursorStart) +
    linkMarkup +
    text.substring(cursorEnd);
  return newText;
};

/**
 * Валидация контента (дублирует логику роута PUT /api/about)
 */
const validateAboutContent = ({ contentRu, contentEn }) => {
  const errors = [];
  if (!contentRu || typeof contentRu !== 'string' || !contentRu.trim()) {
    errors.push('Контент на русском языке обязателен');
  }
  if (!contentEn || typeof contentEn !== 'string' || !contentEn.trim()) {
    errors.push('Контент на английском языке обязателен');
  }
  return errors;
};

/**
 * Симулирует round-trip: сохранение в БД и загрузку обратно
 * БД хранит raw-строку, API возвращает массив параграфов + rawContent
 */
const simulateRoundTrip = (contentRu, contentEn) => {
  // Сохраняем (trim как в роуте)
  const storedRu = contentRu.trim();
  const storedEn = contentEn.trim();

  // Загружаем (как делает GET /api/about)
  return {
    rawContentRu: storedRu,
    rawContentEn: storedEn,
    contentRu: splitToParagraphs(storedRu),
    contentEn: splitToParagraphs(storedEn)
  };
};

// ─── Генераторы ───────────────────────────────────────────────────────────────

// Генератор непустого текста параграфа:
// - без \n (чтобы не создавать лишних разделителей)
// - без ведущих/хвостовых пробелов (splitToParagraphs делает trim)
const paragraphText = fc
  .stringMatching(/^[^\n]{1,200}$/)
  .filter(s => s.trim().length > 0 && s === s.trim());

// Генератор массива параграфов (1–5 штук)
const paragraphsArray = fc.array(paragraphText, { minLength: 1, maxLength: 5 });

// Генератор raw-контента из параграфов
const rawContent = paragraphsArray.map(ps => ps.join('\n\n'));

// Генератор валидного URL без ')' в конце (иначе ломается markdown-паттерн [текст](url))
const validUrl = fc.oneof(
  fc.constant('https://example.com'),
  fc.constant('https://github.com/user/repo'),
  fc.constant('https://music.yandex.ru/users/test/playlists/1'),
  fc.webUrl().filter(url => !url.includes(')'))
);

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('Property 17: Rich Text Editor Functionality', () => {

  /**
   * Property 17.1: Разбивка на параграфы
   * Для любого набора параграфов: join → split должен вернуть исходный массив
   * Validates: Requirement 6.6 (сохранение структуры параграфов)
   */
  it('Property 17.1: Paragraph split/join round-trip preserves structure', () => {
    fc.assert(
      fc.property(paragraphsArray, (paragraphs) => {
        const raw = joinParagraphs(paragraphs);
        const restored = splitToParagraphs(raw);

        // Количество параграфов должно совпадать
        expect(restored.length).toBe(paragraphs.length);

        // Содержимое каждого параграфа должно совпадать (с учётом trim)
        for (let i = 0; i < paragraphs.length; i++) {
          expect(restored[i]).toBe(paragraphs[i].trim());
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.2: Пустые строки между параграфами не создают лишних параграфов
   * Validates: Requirement 6.6
   */
  it('Property 17.2: Extra blank lines between paragraphs are normalized', () => {
    fc.assert(
      fc.property(
        paragraphsArray,
        fc.integer({ min: 2, max: 5 }), // количество \n между параграфами
        (paragraphs, newlines) => {
          // Соединяем с произвольным количеством переносов
          const separator = '\n'.repeat(newlines);
          const raw = paragraphs.join(separator);

          // splitToParagraphs должен вернуть непустые параграфы
          const result = splitToParagraphs(raw);
          expect(result.length).toBeGreaterThanOrEqual(1);

          // Ни один параграф не должен быть пустым
          for (const p of result) {
            expect(p.trim().length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.3: Вставка ссылки сохраняет остальной текст
   * Validates: Requirement 6.3 (поддержка вставки ссылок)
   */
  it('Property 17.3: Link insertion preserves surrounding text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.integer({ min: 0, max: 9 }),   // начало выделения
        fc.integer({ min: 1, max: 5 }),    // длина выделения
        validUrl,
        (text, selStart, selLen, url) => {
          const selEnd = Math.min(selStart + selLen, text.length);
          const actualStart = Math.min(selStart, text.length);

          const result = insertLink(text, actualStart, selEnd, url);

          // Результат должен содержать URL
          expect(result).toContain(url);

          // Результат должен содержать markdown-формат ссылки
          expect(result).toMatch(/\[.+?\]\(https?:\/\/.+?\)/);

          // Текст до выделения должен сохраниться
          expect(result.startsWith(text.substring(0, actualStart))).toBe(true);

          // Текст после выделения должен сохраниться
          expect(result.endsWith(text.substring(selEnd))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.4: insertAtCursor не теряет символы
   * Validates: Requirement 4.9 (rich text editing)
   */
  it('Property 17.4: insertAtCursor preserves all original characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 80 }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (text, rawStart, rawLen, before, after) => {
          const start = Math.min(rawStart, text.length);
          const end = Math.min(start + rawLen, text.length);
          const selected = text.substring(start, end);

          const { newText } = insertAtCursor(text, start, end, before, after);

          // Новый текст должен содержать before и after
          expect(newText).toContain(before);

          // Выделенный текст должен присутствовать между before и after
          if (selected.length > 0) {
            expect(newText).toContain(before + selected + after);
          }

          // Текст до курсора должен сохраниться
          expect(newText.startsWith(text.substring(0, start))).toBe(true);

          // Текст после курсора должен сохраниться
          expect(newText.endsWith(text.substring(end))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.5: Валидация отклоняет пустой контент
   * Validates: Requirement 6.5 (валидация контента перед сохранением)
   */
  it('Property 17.5: Validation rejects empty or missing content', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant(null),
          fc.constant(undefined)
        ),
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (badRu, badEn) => {
          const errors = validateAboutContent({ contentRu: badRu, contentEn: badEn });
          expect(errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 17.6: Валидация принимает непустой контент
   * Validates: Requirement 6.5
   */
  it('Property 17.6: Validation accepts valid non-empty content', () => {
    fc.assert(
      fc.property(rawContent, rawContent, (ru, en) => {
        const errors = validateAboutContent({ contentRu: ru, contentEn: en });
        expect(errors.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.7: Round-trip сохранение → загрузка сохраняет данные
   * Validates: Requirement 6.3, 6.6 (точность предпросмотра и структура)
   *
   * Примечание: роут делает trim() всего контента перед сохранением,
   * поэтому сравниваем параграфы через splitToParagraphs, а не raw-строки напрямую.
   */
  it('Property 17.7: Save/load round-trip preserves content', () => {
    fc.assert(
      fc.property(rawContent, rawContent, (ru, en) => {
        const loaded = simulateRoundTrip(ru, en);

        // rawContent должен совпадать с trim исходного
        expect(loaded.rawContentRu).toBe(ru.trim());
        expect(loaded.rawContentEn).toBe(en.trim());

        // Массив параграфов должен быть непустым
        expect(loaded.contentRu.length).toBeGreaterThan(0);
        expect(loaded.contentEn.length).toBeGreaterThan(0);

        // Параграфы из загруженных данных должны совпадать с параграфами из trim-версии
        const expectedRu = splitToParagraphs(ru.trim());
        const expectedEn = splitToParagraphs(en.trim());
        expect(loaded.contentRu).toEqual(expectedRu);
        expect(loaded.contentEn).toEqual(expectedEn);

        // Восстановленный raw из параграфов должен совпадать с сохранённым
        const restoredRu = joinParagraphs(loaded.contentRu);
        const restoredEn = joinParagraphs(loaded.contentEn);
        expect(restoredRu).toBe(loaded.rawContentRu);
        expect(restoredEn).toBe(loaded.rawContentEn);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.8: Счётчик параграфов соответствует реальному количеству
   * Validates: Requirement 6.6
   */
  it('Property 17.8: Paragraph count is consistent with content', () => {
    fc.assert(
      fc.property(paragraphsArray, (paragraphs) => {
        const raw = joinParagraphs(paragraphs);
        const count = splitToParagraphs(raw).length;

        // Счётчик должен совпадать с количеством непустых параграфов
        const expectedCount = paragraphs.filter(p => p.trim().length > 0).length;
        expect(count).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17.9: Markdown-ссылки имеют корректный формат
   * Validates: Requirement 6.3
   *
   * Примечание: текст ссылки не должен содержать ']' — это спецсимвол markdown.
   */
  it('Property 17.9: Inserted links always have valid markdown format', () => {
    fc.assert(
      fc.property(
        // Фильтруем текст: без ']' и '[' — спецсимволов markdown
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(']') && !s.includes('[')),
        validUrl,
        (linkText, url) => {
          const text = `Начало ${linkText} конец`;
          const start = 'Начало '.length;
          const end = start + linkText.length;

          const result = insertLink(text, start, end, url);
          const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/;
          const match = result.match(linkPattern);

          expect(match).not.toBeNull();
          expect(match[1]).toBe(linkText); // текст ссылки
          expect(match[2]).toBe(url);       // URL ссылки
        }
      ),
      { numRuns: 100 }
    );
  });
});
