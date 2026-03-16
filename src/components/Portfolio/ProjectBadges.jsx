import { memo } from 'react';
import styles from './Portfolio.module.css';

// Компонент для AI плашки
const AiBadge = memo(() => (
  <span className={styles.badgeAi}>AI</span>
));
AiBadge.displayName = 'AiBadge';

// Компонент для NEW плашки
const NewBadge = memo(() => (
  <span className={styles.badgeNew}>NEW</span>
));
NewBadge.displayName = 'NewBadge';

// Компонент для In Progress плашки
const InProgressBadge = memo(() => (
  <span className={styles.badgeInProgress}>In Progress</span>
));
InProgressBadge.displayName = 'InProgressBadge';

/**
 * Компонент плашек для проектов
 * @param {Object} props - Пропсы компонента
 * @param {boolean} props.isAi - Показать AI плашку
 * @param {boolean} props.isNew - Показать NEW плашку
 * @param {boolean} props.isInProgress - Показать In Progress плашку
 */
const ProjectBadges = memo(({ isAi = false, isNew = false, isInProgress = false }) => {
  // Если нет плашек, не рендерим контейнер
  if (!isAi && !isNew && !isInProgress) {
    return null;
  }

  return (
    <div className={styles.badges}>
      {isAi && <AiBadge />}
      {isNew && <NewBadge />}
      {isInProgress && <InProgressBadge />}
    </div>
  );
});

ProjectBadges.displayName = 'ProjectBadges';

export default ProjectBadges;