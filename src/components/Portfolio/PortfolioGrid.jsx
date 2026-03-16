import PortfolioItem from './PortfolioItem';
import styles from './Portfolio.module.css';

/**
 * Компонент сетки проектов портфолио
 * @param {Object} props - Пропсы компонента
 * @param {Array} props.projects - Массив проектов для отображения
 * @param {boolean} props.isAnimating - Флаг анимации переключения
 */
const PortfolioGrid = ({ projects, isAnimating = false }) => {
  return (
    <div className={`${styles.items} ${!isAnimating ? styles.itemsActive : styles.itemsHidden}`}>
      {projects.map(project => (
        <PortfolioItem key={project.id} project={project} />
      ))}
    </div>
  );
};

export default PortfolioGrid;