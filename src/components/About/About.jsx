import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './About.module.css';

const About = () => {
  const { translations } = useContext(LanguageContext);
  const { about } = translations;

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className={styles.about} id="about">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.inner}>
            <h2 className={styles.title}>{about.title}</h2>
            <div className={styles.items}>
              {about.paragraphs.map((paragraph, index) => {
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
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;