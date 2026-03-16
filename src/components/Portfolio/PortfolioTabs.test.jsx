import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PortfolioTabs from './PortfolioTabs';
import { LanguageContext } from '../../context/LanguageContext';

// Мок переводов
const mockTranslations = {
  portfolio: {
    tabs: {
      pet: 'Собственные проекты',
      layout: 'Учебные проекты'
    }
  }
};

const mockLanguageContext = {
  translations: mockTranslations,
  language: 'ru',
  changeLanguage: vi.fn()
};

const renderWithContext = (component) => {
  return render(
    <LanguageContext.Provider value={mockLanguageContext}>
      {component}
    </LanguageContext.Provider>
  );
};

describe('PortfolioTabs', () => {
  it('должен отображать табы с правильными названиями', () => {
    const mockOnCategoryChange = vi.fn();
    
    renderWithContext(
      <PortfolioTabs 
        activeCategory="pet" 
        onCategoryChange={mockOnCategoryChange} 
      />
    );
    
    expect(screen.getByText('Собственные проекты')).toBeInTheDocument();
    expect(screen.getByText('Учебные проекты')).toBeInTheDocument();
  });
  
  it('должен подсвечивать активный таб', () => {
    const mockOnCategoryChange = vi.fn();
    
    renderWithContext(
      <PortfolioTabs 
        activeCategory="pet" 
        onCategoryChange={mockOnCategoryChange} 
      />
    );
    
    const petTab = screen.getByText('Собственные проекты');
    const layoutTab = screen.getByText('Учебные проекты');
    
    // Проверяем, что активный таб содержит класс tabsItemActive (с хешем CSS Modules)
    expect(petTab.className).toContain('tabsItemActive');
    expect(layoutTab.className).not.toContain('tabsItemActive');
  });
  
  it('должен вызывать onCategoryChange при клике на таб', () => {
    const mockOnCategoryChange = vi.fn();
    
    renderWithContext(
      <PortfolioTabs 
        activeCategory="pet" 
        onCategoryChange={mockOnCategoryChange} 
      />
    );
    
    const layoutTab = screen.getByText('Учебные проекты');
    fireEvent.click(layoutTab);
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('layout');
  });
});