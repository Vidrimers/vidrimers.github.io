import { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import styles from './ScrollToTop.module.css';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(true); // Временно всегда видимая
  const { language } = useContext(LanguageContext);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrollPosition = window.scrollY;
      console.log('Scroll position:', scrollPosition);
      
      if (scrollPosition > 300) {
        console.log('Setting visible TRUE');
        setIsVisible(true);
      } else {
        console.log('Setting visible FALSE');
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    // НЕ вызываем toggleVisibility() сразу!

    return () => window.removeEventListener('scroll', toggleVisibility);
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
