import { useState, useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { getProjectsByCategory } from '../../data/portfolioData';
import PortfolioTabs from './PortfolioTabs';
import PortfolioGrid from './PortfolioGrid';
import styles from './Portfolio.module.css';

const Portfolio = () => {
  const { translations } = useContext(LanguageContext);
  const [activeCategory, setActiveCategory] = useState('pet');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Получаем проекты для активной категории
  const filteredProjects = getProjectsByCategory(activeCategory);
  
  // Обработчик смены категории с анимацией
  const handleCategoryChange = (newCategory) => {
    if (newCategory === activeCategory) return;
    
    setIsAnimating(true);
    
    // Через 300ms (время анимации исчезновения) меняем категорию
    setTimeout(() => {
      setActiveCategory(newCategory);
      // Через небольшую задержку показываем новые проекты
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    }, 300);
  };
  
  return (
    <section className={styles.portfolio} id="portfolio">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>
              {translations.portfolio.title}
            </h2>
          </div>
          
          {/* Табы для переключения категорий */}
          <PortfolioTabs 
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
          
          {/* Сетка проектов */}
          <PortfolioGrid 
            projects={filteredProjects} 
            isAnimating={isAnimating}
          />
        </div>
      </div>
    </section>
  );
};

export default Portfolio;