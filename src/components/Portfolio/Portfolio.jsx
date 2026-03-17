import { useState, useContext, useMemo, useEffect } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
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
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка проектов из API
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Ошибка загрузки проектов');
      }
      
      const data = await response.json();
      if (data.success) {
        // Преобразуем данные из API в формат, ожидаемый компонентами
        const transformedProjects = data.data.map(project => ({
          id: project.id,
          title: project.title_ru,
          titleEn: project.title_en,
          description: project.description_ru,
          descriptionEn: project.description_en,
          image: project.image_path,
          link: project.link,
          category: project.category_id,
          isAi: Boolean(project.is_ai),
          isNew: Boolean(project.is_new),
          isInProgress: Boolean(project.is_in_progress),
          isHidden: Boolean(project.is_hidden),
          sortOrder: project.sort_order,
          createdAt: project.created_at
        }));
        
        setProjects(transformedProjects);
      } else {
        throw new Error(data.error?.message || 'Ошибка загрузки проектов');
      }
    } catch (err) {
      console.error('Ошибка загрузки проектов:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем проекты при монтировании компонента
  useEffect(() => {
    loadProjects();
  }, []);
  
  // Мемоизируем фильтрацию проектов для оптимизации производительности
  const filteredProjects = useMemo(() => {
    if (!projects.length) return [];
    
    // Фильтруем по категории
    let filtered = projects.filter(project => project.category === activeCategory);
    
    // Сортируем по sortOrder, затем по дате создания (новые первые)
    return filtered.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [projects, activeCategory]);
  
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
    // Перезагружаем проекты после закрытия админки
    loadProjects();
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
          
          {/* Состояние загрузки */}
          {loading && (
            <div className={styles.loading}>
              Загрузка проектов...
            </div>
          )}
          
          {/* Состояние ошибки */}
          {error && (
            <div className={styles.error}>
              Ошибка: {error}
            </div>
          )}
          
          {/* Сетка проектов */}
          {!loading && !error && (
            <PortfolioGrid 
              projects={filteredProjects} 
              isAnimating={isAnimating}
            />
          )}
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