import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Hero.module.css';
import photoImg from '../../assets/img/photo.jpg';

const Hero = () => {
  const { language, translations, changeLanguage } = useContext(LanguageContext);

  const toggleLanguage = () => {
    changeLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <section className={styles.hero} id="home">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div className={styles.heroTop}>
              <h1 className={styles.heroTitle}>
                {translations.hero.title}
              </h1>
              <p className={styles.heroText}>
                {translations.hero.subtitle}
              </p>
              <div className={styles.heroLang}>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (language !== 'ru') toggleLanguage();
                  }}
                  style={{ color: language === 'ru' ? '#000' : '#828282' }}
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
                  style={{ color: language === 'en' ? '#000' : '#828282' }}
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
    </section>
  );
};

export default Hero;