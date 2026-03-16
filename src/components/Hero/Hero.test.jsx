import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageContext } from '../../context/LanguageContext';
import Hero from './Hero';

// Mock для изображения
vi.mock('../../assets/img/photo.jpg', () => ({
  default: '/mock-photo.jpg'
}));

const mockTranslations = {
  hero: {
    title: 'Привет! Я Ярослав',
    subtitle: 'Frontend-разработчик'
  }
};

const mockContextValue = {
  language: 'ru',
  translations: mockTranslations,
  changeLanguage: vi.fn()
};

const renderHeroWithContext = (contextValue = mockContextValue) => {
  return render(
    <LanguageContext.Provider value={contextValue}>
      <Hero />
    </LanguageContext.Provider>
  );
};

describe('Hero Component Responsiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderHeroWithContext();
    expect(screen.getByText('Привет! Я Ярослав')).toBeInTheDocument();
    expect(screen.getByText('Frontend-разработчик')).toBeInTheDocument();
  });

  it('has proper CSS classes for responsive design', () => {
    renderHeroWithContext();
    
    const heroSection = document.querySelector('section');
    expect(heroSection.className).toMatch(/hero/);
    
    const heroTitle = screen.getByText('Привет! Я Ярослав');
    expect(heroTitle.className).toMatch(/heroTitle/);
    
    const heroText = screen.getByText('Frontend-разработчик');
    expect(heroText.className).toMatch(/heroText/);
  });

  it('contains language switcher', () => {
    renderHeroWithContext();
    
    const rusLink = screen.getByText('РУС');
    const engLink = screen.getByText('АНГ');
    
    expect(rusLink).toBeInTheDocument();
    expect(engLink).toBeInTheDocument();
  });

  it('has hero photo with background image', () => {
    renderHeroWithContext();
    
    const heroPhoto = document.querySelector('[class*="heroPhoto"]');
    expect(heroPhoto).toBeInTheDocument();
    expect(heroPhoto).toHaveStyle('background-image: url(/mock-photo.jpg)');
  });

  it('has proper structure for mobile layout', () => {
    renderHeroWithContext();
    
    // Проверяем что есть все необходимые элементы для адаптивности
    const heroInner = document.querySelector('[class*="heroInner"]');
    const heroTop = document.querySelector('[class*="heroTop"]');
    const heroPhoto = document.querySelector('[class*="heroPhoto"]');
    
    expect(heroInner).toBeInTheDocument();
    expect(heroTop).toBeInTheDocument();
    expect(heroPhoto).toBeInTheDocument();
  });

  it('language switcher works correctly', () => {
    const mockChangeLanguage = vi.fn();
    const contextValue = {
      ...mockContextValue,
      changeLanguage: mockChangeLanguage
    };
    
    renderHeroWithContext(contextValue);
    
    const engLink = screen.getByText('АНГ');
    engLink.click();
    
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('displays correct language styling', () => {
    // Тест для русского языка
    renderHeroWithContext();
    
    const rusLink = screen.getByText('РУС');
    const engLink = screen.getByText('АНГ');
    
    expect(rusLink).toHaveStyle('color: rgb(0, 0, 0)'); // активный
    expect(engLink).toHaveStyle('color: rgb(130, 130, 130)'); // неактивный
  });

  it('displays correct language styling for English', () => {
    const englishContextValue = {
      ...mockContextValue,
      language: 'en',
      translations: {
        hero: {
          title: 'Hello! I am Yaroslav',
          subtitle: 'Frontend Developer'
        }
      }
    };
    
    renderHeroWithContext(englishContextValue);
    
    const rusLink = screen.getByText('РУС');
    const engLink = screen.getByText('АНГ');
    
    expect(rusLink).toHaveStyle('color: rgb(130, 130, 130)'); // неактивный
    expect(engLink).toHaveStyle('color: rgb(0, 0, 0)'); // активный
  });
});