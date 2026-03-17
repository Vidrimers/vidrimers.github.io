import { useState } from 'react';
import { useLikes } from '../../hooks/useLikes';
import styles from './LikeButton.module.css';

/**
 * Компонент кнопки лайка для проектов портфолио
 * @param {Object} props - Пропсы компонента
 * @param {string} props.projectId - ID проекта (например, 'pet-1')
 * @param {string} props.projectTitle - Название проекта (опционально)
 * @param {string} props.className - Дополнительные CSS классы
 * @param {boolean} props.showOnHover - Показывать кнопку только при hover (если нет лайков)
 * @param {boolean} props.isParentHovered - Состояние hover родительского элемента
 * @returns {JSX.Element} - Компонент кнопки лайка
 */
const LikeButton = ({ projectId, projectTitle, className = '', showOnHover = false, isParentHovered = false }) => {
  const { likes, isLiked, isLoading, error, toggleLike } = useLikes(projectId, projectTitle);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClickDisabled, setIsClickDisabled] = useState(false);

  /**
   * Обработчик клика по кнопке лайка
   */
  const handleClick = async (e) => {
    e.preventDefault(); // Предотвращаем переход по ссылке родительского элемента
    e.stopPropagation(); // Останавливаем всплытие события
    
    if (isLoading || isClickDisabled) return;
    
    // Блокируем повторные клики на 1 секунду
    setIsClickDisabled(true);
    setTimeout(() => setIsClickDisabled(false), 1000);
    
    // Запускаем анимацию
    setIsAnimating(true);
    
    try {
      await toggleLike();
    } catch (error) {
      console.error('Ошибка при переключении лайка:', error);
    }
    
    // Убираем анимацию через 300ms
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  /**
   * Определить, должна ли кнопка быть видимой
   */
  const shouldShowButton = () => {
    // Всегда показываем если есть лайки или проект лайкнут пользователем
    if (likes > 0 || isLiked) {
      return true;
    }
    
    // Если включен режим showOnHover, показываем только при наведении
    if (showOnHover) {
      return isParentHovered;
    }
    
    // По умолчанию всегда показываем
    return true;
  };

  // Если кнопка не должна быть видна, не рендерим её
  if (!shouldShowButton()) {
    return null;
  }

  /**
   * Получить CSS классы для кнопки
   */
  const getButtonClasses = () => {
    const classes = [styles.likeButton];
    
    if (className) {
      classes.push(className);
    }
    
    if (isLiked) {
      classes.push(styles.liked);
    }
    
    if (isLoading) {
      classes.push(styles.loading);
    }
    
    if (isAnimating) {
      classes.push(styles.animating);
    }
    
    if (isClickDisabled) {
      classes.push(styles.disabled);
    }
    
    return classes.join(' ');
  };

  /**
   * Получить CSS классы для иконки сердечка
   */
  const getHeartClasses = () => {
    const classes = [styles.heart];
    
    if (isLiked) {
      classes.push(styles.heartLiked);
    }
    
    if (isAnimating) {
      classes.push(styles.heartAnimating);
    }
    
    return classes.join(' ');
  };

  // Если есть ошибка, показываем минимальный UI
  if (error) {
    return (
      <div className={`${styles.likeButton} ${styles.error} ${className}`}>
        <span className={styles.heart}>♡</span>
        <span className={styles.count}>—</span>
      </div>
    );
  }

  return (
    <button
      className={getButtonClasses()}
      onClick={handleClick}
      disabled={isLoading}
      title={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
      aria-label={`${isLiked ? 'Убрать лайк' : 'Поставить лайк'}. Текущее количество лайков: ${likes}`}
    >
      {/* Иконка сердечка */}
      <span className={getHeartClasses()}>
        {isLiked ? '♥' : '♡'}
      </span>
      
      {/* Счетчик лайков - показываем только если есть лайки (больше 0) */}
      {likes > 0 && (
        <span className={styles.count}>
          {isLoading ? '...' : likes}
        </span>
      )}
      
      {/* Индикатор загрузки */}
      {isLoading && (
        <span className={styles.loader} aria-hidden="true">
          <span className={styles.loaderDot}></span>
          <span className={styles.loaderDot}></span>
          <span className={styles.loaderDot}></span>
        </span>
      )}
    </button>
  );
};

export default LikeButton;