import { useContext, useMemo, useState } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import AdminIndicator from '../Admin/AdminIndicator';
import AboutAdmin from '../Admin/AboutAdmin';
import styles from './About.module.css';

const About = () => {
  const { translations } = useContext(LanguageContext);
  const { about } = translations;
  const [isAboutAdminOpen, setIsAboutAdminOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Мемоизируем обработку параграфов для оптимизации производительности
  const processedParagraphs = useMemo(() => {
    return about.paragraphs.map((paragraph, index) => {
      // Обрабатываем параграф с ссылкой на портфолио
      if (paragraph.includes(about.links.portfolio)) {
        return (
          <p key={index}>
            {paragraph.split(about.links.portfolio)[0]}
            <a 
              href="#portfolio" 
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('portfolio');
              }}
            >
              {about.links.portfolio}
            </a>
            {paragraph.split(about.links.portfolio)[1]}
          </p>
        );
      }
      
      // Обрабатываем параграф с ссылкой на музыку
      if (paragraph.includes(about.links.music)) {
        return (
          <p key={index}>
            {paragraph.split(about.links.music)[0]}
            <a 
              target="_blank" 
              rel="noopener noreferrer"
              href="https://music.yandex.ru/users/Jebanashka/playlists/3"
            >
              {about.links.music}
            </a>
            {paragraph.split(about.links.music)[1]}
          </p>
        );
      }
      
      // Обычный параграф без ссылок
      return <p key={index}>{paragraph}</p>;
    });
  }, [about.paragraphs, about.links]);

  return (
    <>
    <section className={styles.about} id="about">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.inner}>
            <h2 className={styles.title}>
              {about.title}
              <AdminIndicator 
                section="Обо мне"
                onClick={() => setIsAboutAdminOpen(true)}
              />
            </h2>
            <div className={styles.items}>
              {processedParagraphs}
            </div>
          </div>
        </div>
      </div>
    </section>

    <AboutAdmin
      isOpen={isAboutAdminOpen}
      onClose={() => setIsAboutAdminOpen(false)}
    />
  </>
  );
};

export default About;