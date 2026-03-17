import { useContext, memo, useState } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import ProjectBadges from './ProjectBadges';
import LikeButton from './LikeButton';
import { sendPortfolioClickNotification } from '../../utils/telegramNotifications';
import styles from './Portfolio.module.css';

/**
 * Компонент отдельного проекта в портфолио
 * @param {Object} props - Пропсы компонента
 * @param {Object} props.project - Объект проекта
 * @param {number} props.project.id - ID проекта
 * @param {string} props.project.title - Название проекта (русский)
 * @param {string} props.project.titleEn - Название проекта (английский)
 * @param {string} props.project.description - Описание проекта (русский)
 * @param {string} props.project.descriptionEn - Описание проекта (английский)
 * @param {string} props.project.image - Путь к изображению
 * @param {string} props.project.link - Ссылка на проект
 * @param {string} props.project.category - Категория проекта
 * @param {boolean} props.project.isAi - Показать AI плашку
 * @param {boolean} props.project.isNew - Показать NEW плашку
 * @param {boolean} props.project.isInProgress - Показать In Progress плашку
 */
const PortfolioItem = memo(({ project }) => {
  const { language } = useContext(LanguageContext);
  const [isHovered, setIsHovered] = useState(false);
  
  // Получаем локализованные данные в зависимости от языка
  const title = language === 'ru' ? project.title : project.titleEn;
  const description = language === 'ru' ? project.description : project.descriptionEn;
  
  // Обработчик клика по проекту
  const handleProjectClick = async () => {
    // Отправляем уведомление в Telegram с названием проекта
    await sendPortfolioClickNotification(project.id, title);
  };
  
  return (
    <div 
      className={styles.item}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Плашки AI, NEW и In Progress */}
      <ProjectBadges 
        isAi={project.isAi} 
        isNew={project.isNew} 
        isInProgress={project.isInProgress} 
      />
      
      {/* Кнопка лайка */}
      <div className={styles.likeButtonContainer}>
        <LikeButton 
          projectId={project.id} 
          projectTitle={title}
          showOnHover={true}
          isParentHovered={isHovered}
        />
      </div>
      
      {/* Ссылка с изображением */}
      <a 
        className={styles.link}
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Открыть проект ${title}`}
        onClick={handleProjectClick}
      >
        <img 
          src={project.image} 
          alt={title}
          className={styles.image}
          loading="lazy"
          decoding="async"
        />
      </a>
      
      {/* Ссылка с названием проекта */}
      <a
        className={styles.textLink}
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleProjectClick}
      >
        {title}
      </a>
      
      {/* Описание проекта */}
      <p 
        className={styles.description}
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
});

PortfolioItem.displayName = 'PortfolioItem';

export default PortfolioItem;