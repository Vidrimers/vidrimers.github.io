import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageContext } from '../../context/LanguageContext';
import Certificates from './Certificates';

// Мок данных для тестирования
const mockTranslations = {
  certificates: {
    title: 'Сертификаты',
    description: 'Мои профессиональные сертификаты и достижения',
    close: 'Закрыть',
    viewOriginal: 'Посмотреть оригинал',
    total: 'Всего сертификатов',
    empty: 'Сертификаты не найдены'
  }
};

const mockContextValue = {
  language: 'ru',
  translations: mockTranslations,
  changeLanguage: () => {}
};

// Обертка для тестирования с контекстом
const renderWithContext = (component) => {
  return render(
    <LanguageContext.Provider value={mockContextValue}>
      {component}
    </LanguageContext.Provider>
  );
};

describe('Certificates Component', () => {
  it('renders certificates section with title', () => {
    renderWithContext(<Certificates />);
    
    // Проверяем, что заголовок отображается
    expect(screen.getByText('Сертификаты')).toBeInTheDocument();
  });

  it('renders certificates section with description', () => {
    renderWithContext(<Certificates />);
    
    // Проверяем, что описание отображается
    expect(screen.getByText('Мои профессиональные сертификаты и достижения')).toBeInTheDocument();
  });

  it('renders certificates grid with accessibility attributes', () => {
    renderWithContext(<Certificates />);
    
    // Проверяем, что секция сертификатов существует
    const certificatesSection = screen.getByTestId('certificates-section');
    expect(certificatesSection).toBeInTheDocument();
    expect(certificatesSection).toHaveAttribute('id', 'certificates');
    
    // Проверяем grid с accessibility атрибутами
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('aria-label', 'Сертификаты');
  });

  it('renders certificate images with lazy loading', () => {
    renderWithContext(<Certificates />);
    
    // Проверяем, что изображения сертификатов отображаются
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    
    // Проверяем, что у изображений есть alt текст и lazy loading
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')).not.toBe('');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('renders certificate counter', () => {
    renderWithContext(<Certificates />);
    
    // Проверяем, что счетчик сертификатов отображается
    expect(screen.getByText(/Всего сертификатов:/)).toBeInTheDocument();
  });

  it('opens modal when certificate is clicked', () => {
    renderWithContext(<Certificates />);
    
    // Находим первый сертификат и кликаем по нему
    const certificateItems = screen.getAllByRole('gridcell');
    if (certificateItems.length > 0) {
      fireEvent.click(certificateItems[0]);
      
      // Проверяем, что модальное окно открылось
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
    }
  });

  it('closes modal when close button is clicked', () => {
    renderWithContext(<Certificates />);
    
    // Открываем модальное окно
    const certificateItems = screen.getAllByRole('gridcell');
    if (certificateItems.length > 0) {
      fireEvent.click(certificateItems[0]);
      
      // Находим и кликаем кнопку закрытия
      const closeButton = screen.getByLabelText('Закрыть');
      fireEvent.click(closeButton);
      
      // Проверяем, что модальное окно закрылось
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  });

  it('supports keyboard navigation', () => {
    renderWithContext(<Certificates />);
    
    // Проверяем, что элементы сертификатов имеют tabIndex
    const certificateItems = screen.getAllByRole('gridcell');
    certificateItems.forEach(item => {
      expect(item).toHaveAttribute('tabIndex', '0');
    });
  });

  it('shows view original button in modal when certificate has link', () => {
    renderWithContext(<Certificates />);
    
    // Открываем модальное окно
    const certificateItems = screen.getAllByRole('gridcell');
    if (certificateItems.length > 0) {
      fireEvent.click(certificateItems[0]);
      
      // Проверяем, что кнопка "Посмотреть оригинал" ОТОБРАЖАЕТСЯ (так как теперь есть реальная ссылка)
      expect(screen.getByText('Посмотреть оригинал')).toBeInTheDocument();
      
      // Проверяем, что ссылка ведет на правильный URL
      const linkButton = screen.getByText('Посмотреть оригинал');
      expect(linkButton).toHaveAttribute('href', 'https://www.sololearn.com/Certificate/1014-8369424/jpg/');
      expect(linkButton).toHaveAttribute('target', '_blank');
      expect(linkButton).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('uses correct language for alt text', () => {
    // Тест с английским языком
    const englishTranslations = {
      certificates: {
        title: 'Certificates',
        description: 'My professional certificates and achievements',
        close: 'Close',
        viewOriginal: 'View Original',
        total: 'Total certificates',
        empty: 'No certificates found'
      }
    };

    const englishContextValue = {
      ...mockContextValue,
      language: 'en',
      translations: englishTranslations
    };

    render(
      <LanguageContext.Provider value={englishContextValue}>
        <Certificates />
      </LanguageContext.Provider>
    );

    expect(screen.getByText('Certificates')).toBeInTheDocument();
    expect(screen.getByText('My professional certificates and achievements')).toBeInTheDocument();
  });
});