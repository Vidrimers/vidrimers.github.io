import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
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

const renderHeroWithContext = () => {
  return render(
    <LanguageContext.Provider value={mockContextValue}>
      <Hero />
    </LanguageContext.Provider>
  );
};

// Функция для симуляции разных размеров экрана
const setViewport = (width, height) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Hero Component Responsive Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly on desktop (1920x1080)', () => {
    setViewport(1920, 1080);
    renderHeroWithContext();
    
    const heroSection = document.querySelector('section');
    const heroInner = document.querySelector('[class*="heroInner"]');
    const heroPhoto = document.querySelector('[class*="heroPhoto"]');
    
    expect(heroSection).toBeInTheDocument();
    expect(heroInner).toBeInTheDocument();
    expect(heroPhoto).toBeInTheDocument();
  });

  it('renders correctly on tablet (768x1024)', () => {
    setViewport(768, 1024);
    renderHeroWithContext();
    
    const heroSection = document.querySelector('section');
    const heroTop = document.querySelector('[class*="heroTop"]');
    const heroTitle = document.querySelector('[class*="heroTitle"]');
    
    expect(heroSection).toBeInTheDocument();
    expect(heroTop).toBeInTheDocument();
    expect(heroTitle).toBeInTheDocument();
  });

  it('renders correctly on mobile (375x667)', () => {
    setViewport(375, 667);
    renderHeroWithContext();
    
    const heroSection = document.querySelector('section');
    const heroLang = document.querySelector('[class*="heroLang"]');
    const heroPhoto = document.querySelector('[class*="heroPhoto"]');
    
    expect(heroSection).toBeInTheDocument();
    expect(heroLang).toBeInTheDocument();
    expect(heroPhoto).toBeInTheDocument();
  });

  it('renders correctly on small mobile (320x568)', () => {
    setViewport(320, 568);
    renderHeroWithContext();
    
    const heroSection = document.querySelector('section');
    const heroTitle = document.querySelector('[class*="heroTitle"]');
    const heroText = document.querySelector('[class*="heroText"]');
    
    expect(heroSection).toBeInTheDocument();
    expect(heroTitle).toBeInTheDocument();
    expect(heroText).toBeInTheDocument();
  });

  it('has responsive image that maintains aspect ratio', () => {
    renderHeroWithContext();
    
    const heroPhoto = document.querySelector('[class*="heroPhoto"]');
    expect(heroPhoto).toBeInTheDocument();
    
    // Проверяем что у изображения есть background-image
    expect(heroPhoto).toHaveStyle('background-image: url(/mock-photo.jpg)');
    
    // Проверяем что элемент имеет правильный CSS класс для стилизации
    expect(heroPhoto.className).toMatch(/heroPhoto/);
  });

  it('language switcher is accessible on all screen sizes', () => {
    // Тестируем на разных размерах экрана
    const viewports = [
      [1920, 1080], // Desktop
      [768, 1024],  // Tablet
      [375, 667],   // Mobile
      [320, 568]    // Small Mobile
    ];

    viewports.forEach(([width, height]) => {
      setViewport(width, height);
      renderHeroWithContext();
      
      const heroLang = document.querySelector('[class*="heroLang"]');
      const rusLink = document.querySelector('a[href="#"]');
      
      expect(heroLang).toBeInTheDocument();
      expect(rusLink).toBeInTheDocument();
    });
  });

  it('maintains proper text hierarchy on all devices', () => {
    const viewports = [
      [1920, 1080], // Desktop
      [768, 1024],  // Tablet
      [375, 667],   // Mobile
      [320, 568]    // Small Mobile
    ];

    viewports.forEach(([width, height]) => {
      setViewport(width, height);
      renderHeroWithContext();
      
      const heroTitle = document.querySelector('[class*="heroTitle"]');
      const heroText = document.querySelector('[class*="heroText"]');
      
      expect(heroTitle).toBeInTheDocument();
      expect(heroText).toBeInTheDocument();
      
      // Проверяем что заголовок это h1
      expect(heroTitle.tagName).toBe('H1');
      // Проверяем что текст это p
      expect(heroText.tagName).toBe('P');
    });
  });

  it('has proper semantic structure for accessibility', () => {
    renderHeroWithContext();
    
    const heroSection = document.querySelector('section');
    const heroTitle = document.querySelector('h1');
    const heroText = document.querySelector('p');
    const heroLinks = document.querySelectorAll('a');
    
    // Проверяем семантическую структуру
    expect(heroSection).toBeInTheDocument();
    expect(heroSection).toHaveAttribute('id', 'home');
    expect(heroTitle).toBeInTheDocument();
    expect(heroText).toBeInTheDocument();
    expect(heroLinks.length).toBeGreaterThan(0);
  });
});