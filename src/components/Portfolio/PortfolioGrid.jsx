import PortfolioItem from './PortfolioItem';
import styles from './Portfolio.module.css';

/**
 * Компонент сетки проектов портфолио
 * @param {Object} props - Пропсы компонента
 * @param {Array} props.projects - Массив проектов для отображения
 */
const PortfolioGrid = ({ projects }) => {
  return (
    <div className={`${styles.items} ${styles.itemsActive}`}>
      {projects.map(project => (
        <PortfolioItem key={project.id} project={project} />
      ))}
    </div>
  );
};

export default PortfolioGrid;