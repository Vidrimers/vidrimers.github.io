import { useState, useContext, useMemo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { getProjectsByCategory } from '../../data/portfolioData';
import PortfolioTabs from './PortfolioTabs';
import PortfolioGrid from './PortfolioGrid';
import AdminIndicator from '../Admin/AdminIndicator';
import PortfolioAdmin from '../Admin/PortfolioAdmin';
import styles from './Portfolio.module.css';

const Portfolio = () => {
  const { translations } = useContext(LanguageContext);
  const [activeCategory, setActiveCategory] = useState('pet');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPortfolioAdmin, setShowPortfolioAdmin] = useState(false);
  
  // Мемоизируем фильтрацию проектов для оптимизации производительности
  const filteredProjects = useMemo(() => {
    return getProjectsByCategory(activeCategory);
  }, [activeCategory]);
  
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

  // Обработчик открытия админской панели портфолио
  const handleOpenPortfolioAdmin = () => {
    setShowPortfolioAdmin(true);
  };

  // Обработчик закрытия админской панели портфолио
  const handleClosePortfolioAdmin = () => {
    setShowPortfolioAdmin(false);
  };
  
  return (
    <section className={styles.portfolio} id="portfolio">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>
              {translations.portfolio.title}
              <AdminIndicator 
                section="Портфолио"
                onClick={handleOpenPortfolioAdmin}
              />
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

      {/* Админская панель управления портфолио */}
      <PortfolioAdmin 
        isOpen={showPortfolioAdmin}
        onClose={handleClosePortfolioAdmin}
      />
    </section>
  );
};

export default Portfolio;