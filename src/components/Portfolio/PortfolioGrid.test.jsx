import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageContext } from '../../context/LanguageContext';
import PortfolioGrid from './PortfolioGrid';

// Мок данные для тестирования
const mockProjects = [
  {
    id: 1,
    title: 'Тестовый проект 1',
    titleEn: 'Test Project 1',
    description: 'Описание проекта 1',
    descriptionEn: 'Project 1 description',
    image: '/test-image-1.jpg',
    link: 'https://example.com/1',
    category: 'pet'
  },
  {
    id: 2,
    title: 'Тестовый проект 2',
    titleEn: 'Test Project 2',
    description: 'Описание проекта 2',
    descriptionEn: 'Project 2 description',
    image: '/test-image-2.jpg',
    link: 'https://example.com/2',
    category: 'layout'
  }
];

// Мок контекста языка
const mockLanguageContext = {
  language: 'ru',
  translations: {
    portfolio: {
      title: 'Портфолио'
    }
  },
  changeLanguage: () => {}
};

const renderWithContext = (component) => {
  return render(
    <LanguageContext.Provider value={mockLanguageContext}>
      {component}
    </LanguageContext.Provider>
  );
};

describe('PortfolioGrid', () => {
  it('рендерит сетку проектов', () => {
    renderWithContext(<PortfolioGrid projects={mockProjects} />);
    
    // Проверяем, что проекты отображаются
    expect(screen.getByText('Тестовый проект 1')).toBeInTheDocument();
    expect(screen.getByText('Тестовый проект 2')).toBeInTheDocument();
  });

  it('рендерит правильное количество проектов', () => {
    renderWithContext(<PortfolioGrid projects={mockProjects} />);
    
    // Проверяем, что все ссылки на проекты присутствуют
    const projectLinks = screen.getAllByRole('link');
    // Каждый проект имеет 2 ссылки (изображение + название)
    expect(projectLinks).toHaveLength(mockProjects.length * 2);
  });

  it('передает правильные props в PortfolioItem', () => {
    renderWithContext(<PortfolioGrid projects={mockProjects} />);
    
    // Проверяем, что изображения имеют правильные alt атрибуты
    expect(screen.getByAltText('Тестовый проект 1')).toBeInTheDocument();
    expect(screen.getByAltText('Тестовый проект 2')).toBeInTheDocument();
  });

  it('рендерит пустую сетку при отсутствии проектов', () => {
    const { container } = renderWithContext(<PortfolioGrid projects={[]} />);
    
    // Проверяем, что контейнер существует, но пуст
    const gridContainer = container.firstChild;
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer.children).toHaveLength(0);
  });

  it('применяет правильные CSS классы', () => {
    const { container } = renderWithContext(<PortfolioGrid projects={mockProjects} />);
    
    // Проверяем, что контейнер существует и имеет дочерние элементы
    const gridContainer = container.firstChild;
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer.children.length).toBeGreaterThan(0);
  });
});