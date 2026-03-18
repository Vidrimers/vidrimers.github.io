import { useContext, useMemo, useState } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { useAdmin } from '../Admin/AdminProvider';
import AuthModal from '../Admin/AuthModal';
import AdminLogout from '../Admin/AdminLogout';
import styles from './Hero.module.css';
import photoImg from '../../assets/img/photo.jpg';

const Hero = () => {
  const { language, translations, changeLanguage } = useContext(LanguageContext);
  const { isAuthenticated } = useAdmin();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const toggleLanguage = () => {
    changeLanguage(language === 'ru' ? 'en' : 'ru');
  };

  // Обработчик клика на "Frontend разработчик"
  const handleFrontendClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  };

  // Мемоизируем стили для языковых ссылок для оптимизации производительности
  const languageStyles = useMemo(() => ({
    ru: { color: language === 'ru' ? '#000' : '#828282' },
    en: { color: language === 'en' ? '#000' : '#828282' }
  }), [language]);

  // Стиль для subtitle в зависимости от админского режима
  const subtitleStyle = useMemo(() => ({
    color: isAuthenticated ? '#fc285b' : 'inherit',
    cursor: isAuthenticated ? 'default' : 'pointer',
    transition: 'color 0.3s ease'
  }), [isAuthenticated]);

  return (
    <section className={styles.hero} id="home">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div className={styles.heroTop}>
              <h1 className={styles.heroTitle}>
                {translations.hero.title}
              </h1>
              <div className={styles.heroTextContainer}>
                <p 
                  className={styles.heroText}
                  style={subtitleStyle}
                  onClick={handleFrontendClick}
                  title={!isAuthenticated ? 'Нажмите для входа в админскую панель' : 'Админский режим активен'}
                >
                  {translations.hero.subtitle}
                </p>
                <AdminLogout />
              </div>
              <div className={styles.heroLang}>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (language !== 'ru') toggleLanguage();
                  }}
                  style={languageStyles.ru}
                >
                  РУС
                </a> 
                <span>|</span> 
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (language !== 'en') toggleLanguage();
                  }}
                  style={languageStyles.en}
                >
                  АНГ
                </a>
              </div>
              <div className={styles.heroMenuMobile}>
                {/* Мобильное меню будет здесь */}
              </div>
            </div>
            <div 
              className={styles.heroPhoto}
              style={{ backgroundImage: `url(${photoImg})` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Модальное окно аутентификации */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </section>
  );
};

export default Hero;