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
      
      // Загружаем настройки сортировки
      const settingsResponse = await fetch('/api/settings');
      let sortOrder = 'sort_order';
      let sortDirection = 'asc';
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          sortOrder = settingsData.data.portfolio_sort_order || 'sort_order';
          sortDirection = settingsData.data.portfolio_sort_direction || 'asc';
        }
      }
      
      // Загружаем проекты с параметрами сортировки
      const projectsUrl = `/api/projects?sortBy=${sortOrder}&sortDirection=${sortDirection}`;
      const response = await fetch(projectsUrl);
      
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
          createdAt: project.created_at,
          likesCount: project.likes_count || 0
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
    
    // Только фильтруем по категории, сортировка уже пришла с сервера
    return projects.filter(project => project.category === activeCategory);
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