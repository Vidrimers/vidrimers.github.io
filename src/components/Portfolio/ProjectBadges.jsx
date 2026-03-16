import styles from './Portfolio.module.css';

// Компонент для AI плашки
const AiBadge = () => (
  <span className={styles.badgeAi}>AI</span>
);

// Компонент для NEW плашки
const NewBadge = () => (
  <span className={styles.badgeNew}>NEW</span>
);

/**
 * Компонент плашек для проектов
 * @param {Object} props - Пропсы компонента
 * @param {boolean} props.isAi - Показать AI плашку
 * @param {boolean} props.isNew - Показать NEW плашку
 */
const ProjectBadges = ({ isAi = false, isNew = false }) => {
  // Если нет плашек, не рендерим контейнер
  if (!isAi && !isNew) {
    return null;
  }

  return (
    <div className={styles.badges}>
      {isAi && <AiBadge />}
      {isNew && <NewBadge />}
    </div>
  );
};

export default ProjectBadges;