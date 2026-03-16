import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageContext } from '../../context/LanguageContext';
import PortfolioItem from './PortfolioItem';

const mockProject = {
  id: 1,
  title: 'НПП Полет',
  titleEn: 'NPP Polet',
  description: 'Сайт сделан на основе оригинального, но устаревшего сайта',
  descriptionEn: 'The site is based on the original, but outdated site',
  image: '/assets/img/portfolio/npppolet.jpg',
  link: 'https://vidrimers.github.io/portfolio.npppolet/',
  category: 'pet'
};

const mockContextValue = {
  language: 'ru',
  translations: {},
  changeLanguage: vi.fn()
};

const renderPortfolioItemWithContext = (project = mockProject, contextValue = mockContextValue) => {
  return render(
    <LanguageContext.Provider value={contextValue}>
      <PortfolioItem project={project} />
    </LanguageContext.Provider>
  );
};

describe('PortfolioItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderPortfolioItemWithContext();
    expect(screen.getByText('НПП Полет')).toBeInTheDocument();
    expect(screen.getByText('Сайт сделан на основе оригинального, но устаревшего сайта')).toBeInTheDocument();
  });

  it('displays Russian content when language is ru', () => {
    renderPortfolioItemWithContext();
    
    expect(screen.getByText(mockProject.title)).toBeInTheDocument();
    expect(screen.getByText(mockProject.description)).toBeInTheDocument();
    expect(screen.queryByText(mockProject.titleEn)).not.toBeInTheDocument();
    expect(screen.queryByText(mockProject.descriptionEn)).not.toBeInTheDocument();
  });

  it('displays English content when language is en', () => {
    const englishContextValue = {
      ...mockContextValue,
      language: 'en'
    };
    
    renderPortfolioItemWithContext(mockProject, englishContextValue);
    
    expect(screen.getByText(mockProject.titleEn)).toBeInTheDocument();
    expect(screen.getByText(mockProject.descriptionEn)).toBeInTheDocument();
    expect(screen.queryByText(mockProject.title)).not.toBeInTheDocument();
    expect(screen.queryByText(mockProject.description)).not.toBeInTheDocument();
  });

  it('renders image with correct src and alt attributes', () => {
    renderPortfolioItemWithContext();
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', mockProject.image);
    expect(image).toHaveAttribute('alt', mockProject.title);
  });

  it('renders links with correct href and target attributes', () => {
    renderPortfolioItemWithContext();
    
    const links = screen.getAllByRole('link');
    
    // Должно быть 2 ссылки: одна на изображении, одна на тексте
    expect(links).toHaveLength(2);
    
    links.forEach(link => {
      expect(link).toHaveAttribute('href', mockProject.link);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('has proper CSS classes applied', () => {
    renderPortfolioItemWithContext();
    
    // Проверяем основные CSS классы
    const itemContainer = document.querySelector('[class*="item"]');
    const imageLink = document.querySelector('[class*="link"]');
    const image = document.querySelector('[class*="image"]');
    const textLink = document.querySelector('[class*="textLink"]');
    const description = document.querySelector('[class*="description"]');
    
    expect(itemContainer).toBeInTheDocument();
    expect(imageLink).toBeInTheDocument();
    expect(image).toBeInTheDocument();
    expect(textLink).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    renderPortfolioItemWithContext();
    
    const imageLink = screen.getAllByRole('link')[0];
    expect(imageLink).toHaveAttribute('aria-label', `Открыть проект ${mockProject.title}`);
  });

  it('handles project without English translations gracefully', () => {
    const projectWithoutEn = {
      ...mockProject,
      titleEn: undefined,
      descriptionEn: undefined
    };
    
    const englishContextValue = {
      ...mockContextValue,
      language: 'en'
    };
    
    renderPortfolioItemWithContext(projectWithoutEn, englishContextValue);
    
    // Должен отображать undefined, но не падать
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});