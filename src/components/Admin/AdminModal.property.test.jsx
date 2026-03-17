import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import AdminModal from './AdminModal';

/**
 * Property-based тесты для модальных операций админской панели
 * Feature: admin-cms-system, Property 4: Content Management Modal Operations
 * Validates: Requirements 4.1, 4.2, 5.1, 5.2, 6.1, 7.1, 7.2, 8.1
 */

const mockTranslations = {
  hero: {
    title: 'Ярослав Ширяков',
    subtitle: 'Frontend разработчик'
  }
};

const mockContextValue = {
  language: 'ru',
  translations: mockTranslations,
  changeLanguage: vi.fn()
};

// Компонент-обертка для тестирования
const TestWrapper = ({ children }) => {
  return (
    <LanguageContext.Provider value={mockContextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

describe('Admin Modal Operations Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  /**
   * Property 4: Content Management Modal Operations
   * For any content section, modal operations should work correctly
   */
  it('Property 4: Modal operations work correctly for all configurations', () => {
    fc.assert(
      fc.property(
        // Генерируем валидные конфигурации модальных окон
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          size: fc.constantFrom('small', 'medium', 'large', 'fullscreen'),
          showCloseButton: fc.boolean(),
          isOpen: fc.boolean()
        }),
        (modalConfig) => {
          cleanup();
          
          const handleClose = vi.fn();

          const { unmount } = render(
            <TestWrapper>
              <AdminModal
                isOpen={modalConfig.isOpen}
                onClose={handleClose}
                title={modalConfig.title}
                size={modalConfig.size}
                showCloseButton={modalConfig.showCloseButton}
              >
                <div data-testid="modal-content">Test Content</div>
              </AdminModal>
            </TestWrapper>
          );

          try {
            if (modalConfig.isOpen) {
              // Модальное окно должно быть видимо
              const titleElement = screen.getByRole('heading', { level: 2 });
              expect(titleElement).toBeInTheDocument();
              // Используем более гибкую проверку для нормализованного текста
              expect(titleElement.textContent.trim()).toBe(modalConfig.title.trim());
              expect(screen.getByTestId('modal-content')).toBeInTheDocument();

              // Кнопка закрытия должна отображаться согласно конфигурации
              const closeButton = screen.queryByLabelText('Закрыть');
              if (modalConfig.showCloseButton) {
                expect(closeButton).toBeInTheDocument();
              } else {
                expect(closeButton).not.toBeInTheDocument();
              }

              // Проверяем размер модального окна
              const modal = titleElement.closest('[class*="modal"]');
              expect(modal).toBeInTheDocument();
              expect(modal.className).toContain(modalConfig.size);
            } else {
              // Модальное окно не должно быть видимо
              expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
            }
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4: Modal closes correctly with various interaction methods', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
          closeMethod: fc.constantFrom('closeButton', 'overlay', 'escape')
        }),
        (config) => {
          cleanup();
          
          const handleClose = vi.fn();

          const { unmount } = render(
            <TestWrapper>
              <AdminModal
                isOpen={true}
                onClose={handleClose}
                title={config.title}
                showCloseButton={true}
              >
                <div>Modal Content</div>
              </AdminModal>
            </TestWrapper>
          );

          try {
            // Проверяем, что модальное окно открыто
            const titleElement = screen.getByRole('heading', { level: 2 });
            expect(titleElement).toBeInTheDocument();
            expect(titleElement.textContent.trim()).toBe(config.title.trim());

            // Тестируем различные способы закрытия
            switch (config.closeMethod) {
              case 'closeButton':
                const closeButton = screen.getByLabelText('Закрыть');
                fireEvent.click(closeButton);
                break;
              case 'overlay':
                const overlay = titleElement.closest('[class*="overlay"]');
                fireEvent.click(overlay);
                break;
              case 'escape':
                fireEvent.keyDown(document, { key: 'Escape' });
                break;
            }

            // Проверяем, что обработчик закрытия был вызван
            expect(handleClose).toHaveBeenCalledTimes(1);
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 4: Modal accessibility features work correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 40 }).filter(s => s.trim().length > 0),
          hasContent: fc.boolean()
        }),
        (config) => {
          cleanup();
          
          const handleClose = vi.fn();

          const { unmount } = render(
            <TestWrapper>
              <AdminModal
                isOpen={true}
                onClose={handleClose}
                title={config.title}
              >
                {config.hasContent && <div role="main">Accessible Content</div>}
              </AdminModal>
            </TestWrapper>
          );

          try {
            // Проверяем доступность
            const titleElement = screen.getByRole('heading', { level: 2 });
            expect(titleElement).toBeInTheDocument();
            expect(titleElement.textContent.trim()).toBe(config.title.trim());

            const modal = titleElement.closest('[class*="modal"]');
            expect(modal).toBeInTheDocument();

            // Проверяем кнопку закрытия
            const closeButton = screen.getByLabelText('Закрыть');
            expect(closeButton).toBeInTheDocument();
            expect(closeButton).toHaveAttribute('aria-label', 'Закрыть');

            // Если есть контент, проверяем его доступность
            if (config.hasContent) {
              expect(screen.getByRole('main')).toBeInTheDocument();
            }
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 4: Modal renders with different content types', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
          contentType: fc.constantFrom('text', 'form', 'list', 'empty')
        }),
        (config) => {
          cleanup();
          
          const handleClose = vi.fn();
          
          let content;
          switch (config.contentType) {
            case 'text':
              content = <p>Some text content</p>;
              break;
            case 'form':
              content = <form><input type="text" /></form>;
              break;
            case 'list':
              content = <ul><li>Item 1</li><li>Item 2</li></ul>;
              break;
            case 'empty':
              content = null;
              break;
          }

          const { unmount } = render(
            <TestWrapper>
              <AdminModal
                isOpen={true}
                onClose={handleClose}
                title={config.title}
              >
                {content}
              </AdminModal>
            </TestWrapper>
          );

          try {
            // Модальное окно должно быть видимо
            const titleElement = screen.getByRole('heading', { level: 2 });
            expect(titleElement).toBeInTheDocument();
            expect(titleElement.textContent.trim()).toBe(config.title.trim());
            
            // Проверяем наличие контента в зависимости от типа
            switch (config.contentType) {
              case 'text':
                expect(screen.getByText('Some text content')).toBeInTheDocument();
                break;
              case 'form':
                expect(screen.getByRole('textbox')).toBeInTheDocument();
                break;
              case 'list':
                expect(screen.getByText('Item 1')).toBeInTheDocument();
                expect(screen.getByText('Item 2')).toBeInTheDocument();
                break;
              case 'empty':
                // Для пустого контента просто проверяем, что модальное окно рендерится
                expect(titleElement).toBeInTheDocument();
                break;
            }
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});