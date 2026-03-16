import { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import styles from './ScrollToTop.module.css';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false); // Изначально скрыта
  const { language } = useContext(LanguageContext);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      if (scrollPosition > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Проверяем позицию при загрузке
    toggleVisibility();
    
    // Добавляем слушатели на разные элементы
    window.addEventListener('scroll', toggleVisibility);
    document.addEventListener('scroll', toggleVisibility);
    
    const handleScroll = () => {
      toggleVisibility();
    };
    
    document.body.addEventListener('scroll', handleScroll);
    document.documentElement.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      document.removeEventListener('scroll', toggleVisibility);
      document.body.removeEventListener('scroll', handleScroll);
      document.documentElement.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className={`${styles.up} ${!isVisible ? styles.deactivate : ''}`}>
      <button 
        className={styles.upLink} 
        onClick={scrollToTop}
        aria-label={language === 'ru' ? 'Вверх' : 'Up'}
      >
        <img src="/assets/img/ico/arrow-up.png" alt="arrow-up" />
        <p className={styles.upLinkText}>
          {language === 'ru' ? 'вверх' : 'up'}
        </p>
      </button>
    </div>
  );
};

export default ScrollToTop;
