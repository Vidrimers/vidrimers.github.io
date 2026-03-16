import { useState, useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { getProjectsByCategory } from '../../data/portfolioData';
import PortfolioTabs from './PortfolioTabs';
import PortfolioGrid from './PortfolioGrid';
import styles from './Portfolio.module.css';

const Portfolio = () => {
  const { translations } = useContext(LanguageContext);
  const [activeCategory, setActiveCategory] = useState('pet');
  
  // Получаем проекты для активной категории
  const filteredProjects = getProjectsByCategory(activeCategory);
  
  return (
    <section className={styles.portfolio} id="portfolio">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <h2 className={styles.title}>
            {translations.portfolio.title}
          </h2>
          
          {/* Табы для переключения категорий */}
          <PortfolioTabs 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          
          {/* Сетка проектов */}
          <PortfolioGrid projects={filteredProjects} />
        </div>
      </div>
    </section>
  );
};

export default Portfolio;