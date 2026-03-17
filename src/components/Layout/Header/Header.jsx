import { useContext, useState, useEffect, useMemo } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import styles from './Header.module.css';

const Header = () => {
  const { translations } = useContext(LanguageContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Smooth scroll к секции с плавной анимацией
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const startPosition = window.pageYOffset || document.documentElement.scrollTop;
      const targetPosition = element.offsetTop - 80; // Отступ от верха
      const distance = targetPosition - startPosition;
      const duration = 800; // Длительность анимации
      let startTime = null;

      const easeInOutQuad = (t) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      };

      const animation = (currentTime) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        const ease = easeInOutQuad(progress);
        const newPosition = startPosition + (distance * ease);
        
        window.scrollTo(0, newPosition);
        
        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
      setIsMenuOpen(false); // Закрываем меню на мобильных после клика
    }
  };

  // Отслеживание активной секции при скролле
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'skills', 'portfolio', 'certificates', 'contacts'];
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Блокировка скролла body при открытом меню
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('lock');
    } else {
      document.body.classList.remove('lock');
    }
    return () => document.body.classList.remove('lock');
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Мемоизируем массив навигационных элементов для оптимизации производительности
  const navItems = useMemo(() => [
    { id: 'home', label: translations.nav.home },
    { id: 'about', label: translations.nav.about },
    { id: 'skills', label: translations.nav.skills },
    { id: 'portfolio', label: translations.nav.portfolio },
    { id: 'certificates', label: translations.nav.certificates },
    { id: 'contacts', label: translations.nav.contacts }
  ], [translations.nav]);

  return (
    <header className={styles.header} id="header">
      <div className={styles.container}>
        <div className={styles.headerInner}>
          <nav className={styles.menu}>
            {/* Бургер-кнопка для мобильных */}
            <button
              className={`${styles.menuBtn} ${isMenuOpen ? styles.menuBtnActive : ''}`}
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span className={`${styles.menuBtnLine} ${styles.menuBtnLineFirst}`}></span>
              <span className={`${styles.menuBtnLine} ${styles.menuBtnLineSecond}`}></span>
              <span className={`${styles.menuBtnLine} ${styles.menuBtnLineThird}`}></span>
              <span className={`${styles.menuBtnLine} ${styles.menuBtnLineFourth}`}></span>
            </button>

            {/* Навигационное меню */}
            <ul className={`${styles.menuList} ${isMenuOpen ? styles.menuListActive : ''}`}>
              {navItems.map((item) => (
                <li key={item.id} className={styles.menuItem}>
                  <a
                    className={`${styles.menuListLink} ${
                      activeSection === item.id ? styles.menuListLinkActive : ''
                    }`}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(item.id);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
