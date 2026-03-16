import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
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
 */
const PortfolioItem = ({ project }) => {
  const { language } = useContext(LanguageContext);
  
  // Получаем локализованные данные в зависимости от языка
  const title = language === 'ru' ? project.title : project.titleEn;
  const description = language === 'ru' ? project.description : project.descriptionEn;
  
  return (
    <div className={styles.item}>
      {/* Ссылка с изображением */}
      <a 
        className={styles.link}
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Открыть проект ${title}`}
      >
        <img 
          src={project.image} 
          alt={title}
          className={styles.image}
        />
      </a>
      
      {/* Ссылка с названием проекта */}
      <a
        className={styles.textLink}
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {title}
      </a>
      
      {/* Описание проекта */}
      <p className={styles.description}>
        {description}
      </p>
    </div>
  );
};

export default PortfolioItem;