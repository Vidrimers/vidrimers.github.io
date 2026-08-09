import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../../context/LanguageContext';
import { useAdmin } from '../Admin/AdminProvider';
import AuthModal from '../Admin/AuthModal';
import AdminLogout from '../Admin/AdminLogout';
import AdminIndicator from '../Admin/AdminIndicator';
import HeroAdmin from '../Admin/HeroAdmin';
import styles from './Hero.module.css';
import photoImg from '../../assets/img/photo.jpg';

const Hero = () => {
  const { language, translations, changeLanguage } = useContext(LanguageContext);
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isHeroAdminOpen, setIsHeroAdminOpen] = useState(false);

  // Данные Hero из API
  const [heroData, setHeroData] = useState(null);

  const loadHeroData = useCallback(async () => {
    try {
      const response = await fetch('/api/hero');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) {
        setHeroData(data.data);
      }
    } catch {
      // fallback на статические переводы — heroData останется null
    }
  }, []);

  useEffect(() => {
    loadHeroData();
  }, [loadHeroData]);

  // Данные для рендера: API → fallback на статические переводы
  const title = useMemo(() => {
    if (!heroData) return translations.hero.title;
    return language === 'ru' ? heroData.titleRu : heroData.titleEn;
  }, [heroData, language, translations]);

  const subtitle = useMemo(() => {
    if (!heroData) return translations.hero.subtitle;
    return language === 'ru' ? heroData.subtitleRu : heroData.subtitleEn;
  }, [heroData, language, translations]);

  // Языки из API (enabled), fallback на хардкод
  const displayLanguages = useMemo(() => {
    if (!heroData || !heroData.languages) {
      return [
        { code: 'ru', labelRu: 'РУС', labelEn: 'RUS', enabled: true },
        { code: 'en', labelRu: 'АНГ', labelEn: 'ENG', enabled: true },
      ];
    }
    return heroData.languages.filter((l) => l.enabled);
  }, [heroData]);

  // Фото из API, fallback на статический импорт
  const heroPhotoUrl = useMemo(() => {
    if (heroData && heroData.currentPhoto) {
      return `/uploads/hero/${heroData.currentPhoto.filename}`;
    }
    return photoImg;
  }, [heroData]);

  // Определяем текущий брейкпоинт
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive crop стили
  const heroPhotoStyle = useMemo(() => {
    const isApiPhoto = !!heroData?.currentPhoto;
    // Grayscale только для хардкод-фото, не для фото из API
    const base = {
      backgroundImage: `url(${heroPhotoUrl})`,
      filter: isApiPhoto ? 'none' : 'grayscale(0.8)',
    };
    if (!isApiPhoto || !heroData.currentPhoto.responsive_crops_json) return base;

    try {
      const crops = JSON.parse(heroData.currentPhoto.responsive_crops_json);
      const bp = viewportWidth <= 576 ? 'mobile' : viewportWidth <= 768 ? 'tablet' : 'desktop';
      const crop = crops[bp] || { x: 50, y: 50, scale: 1 };

      const bgPosX = 50 + (crop.x - 50) * 0.3;
      const bgPosY = 50 + (crop.y - 50) * 0.3;
      const bgSize = 100 * (crop.scale || 1);

      return {
        ...base,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundSize: `${bgSize}%`,
      };
    } catch {
      return base;
    }
  }, [heroData, heroPhotoUrl, viewportWidth]);

  // Обработчик клика на "Frontend разработчик"
  const handleFrontendClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  };

  // Мемоизируем стили для языковых ссылок
  const getLanguageStyle = useCallback(
    (langCode) => ({
      color: language === langCode ? '#000' : '#828282',
    }),
    [language]
  );

  // Стиль для subtitle
  const subtitleStyle = useMemo(
    () => ({
      color: isAuthenticated ? '#fc285b' : 'inherit',
      cursor: isAuthenticated ? 'default' : 'pointer',
      transition: 'color 0.3s ease',
    }),
    [isAuthenticated]
  );

  // Клик по языку
  const handleLanguageClick = (e, langCode) => {
    e.preventDefault();
    if (language !== langCode) {
      changeLanguage(langCode);
    }
  };

  return (
    <section className={styles.hero} id="home">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div className={styles.heroTop}>
              <h1 className={styles.heroTitle}>
                {title}
                <AdminIndicator
                  section="Hero"
                  onClick={() => setIsHeroAdminOpen(true)}
                />
              </h1>
              <div className={styles.heroTextContainer}>
                <p
                  className={styles.heroText}
                  style={subtitleStyle}
                  onClick={handleFrontendClick}
                  title={!isAuthenticated ? 'Нажмите для входа в админскую панель' : 'Админский режим активен'}
                >
                  {subtitle}
                </p>
                <AdminLogout />
                {isAuthenticated && (
                  <button
                    className={styles.settingsButton}
                    onClick={() => navigate('/settings')}
                    title="Настройки"
                    aria-label="Настройки"
                  >
                    ⚙
                  </button>
                )}
              </div>
              <div className={styles.heroLang}>
                {displayLanguages.map((lang, idx) => (
                  <React.Fragment key={lang.code}>
                    {idx > 0 && <span>|</span>}
                    <a
                      href="#"
                      onClick={(e) => handleLanguageClick(e, lang.code)}
                      style={getLanguageStyle(lang.code)}
                    >
                      {language === 'ru' ? lang.labelRu : lang.labelEn}
                    </a>
                  </React.Fragment>
                ))}
              </div>
              <div className={styles.heroMenuMobile}>
              </div>
            </div>
            <div
              className={styles.heroPhoto}
              style={heroPhotoStyle}
            ></div>
          </div>
        </div>
      </div>

      {/* Модальное окно аутентификации */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Модальное окно редактирования Hero */}
      <HeroAdmin
        isOpen={isHeroAdminOpen}
        onClose={() => {
          setIsHeroAdminOpen(false);
          loadHeroData();
        }}
      />
    </section>
  );
};

export default Hero;
