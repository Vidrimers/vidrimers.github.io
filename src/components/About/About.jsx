import { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import AdminIndicator from '../Admin/AdminIndicator';
import AboutAdmin from '../Admin/AboutAdmin';
import styles from './About.module.css';

/**
 * Парсит параграф и рендерит markdown-ссылки вида [текст](url)
 * Поддерживает внутренние якорные ссылки (#section) и внешние (https://...)
 */
const renderParagraphWithLinks = (text, index, scrollToSection) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Текст до ссылки
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const linkText = match[1];
    const linkUrl = match[2];

    // Якорная ссылка (#section) — скролл внутри страницы
    if (linkUrl.startsWith('#')) {
      const sectionId = linkUrl.slice(1);
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(sectionId);
          }}
        >
          {linkText}
        </a>
      );
    } else {
      // Внешняя ссылка
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Остаток текста после последней ссылки
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <p key={index}>{parts}</p>;
};

const About = () => {
  const { language, translations } = useContext(LanguageContext);
  const { about } = translations;

  const [isAboutAdminOpen, setIsAboutAdminOpen] = useState(false);
  const [apiParagraphs, setApiParagraphs] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAboutContent = useCallback(async () => {
    try {
      const response = await fetch('/api/about');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setApiParagraphs({
        ru: data.data.contentRu || [],
        en: data.data.contentEn || []
      });
    } catch (error) {
      console.error('Ошибка загрузки контента "Обо мне":', error);
      setApiParagraphs(null); // fallback на статические переводы
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAboutContent();
  }, [loadAboutContent]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Источник параграфов: API (БД) или fallback на JSON-переводы
  const paragraphs = useMemo(() => {
    if (apiParagraphs) {
      return language === 'ru' ? apiParagraphs.ru : apiParagraphs.en;
    }
    return about.paragraphs;
  }, [apiParagraphs, language, about.paragraphs]);

  // Рендерим параграфы с поддержкой markdown-ссылок [текст](url)
  const processedParagraphs = useMemo(() => {
    return paragraphs.map((paragraph, index) =>
      renderParagraphWithLinks(paragraph, index, scrollToSection)
    );
  }, [paragraphs]);

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
                {loading ? (
                  <p style={{ color: '#999', fontStyle: 'italic' }}>Загрузка...</p>
                ) : (
                  processedParagraphs
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AboutAdmin
        isOpen={isAboutAdminOpen}
        onClose={() => {
          setIsAboutAdminOpen(false);
          loadAboutContent(); // перезагружаем после сохранения
        }}
      />
    </>
  );
};

export default About;
