import { useContext, memo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Portfolio.module.css';

const PortfolioTabs = memo(({ categories = [], activeCategory, onCategoryChange }) => {
  const { language } = useContext(LanguageContext);

  if (!categories.length) return null;

  return (
    <div className={styles.tabs}>
      {categories.map(category => (
        <button
          key={category.id}
          className={`${styles.tabsItem} ${activeCategory === category.id ? styles.tabsItemActive : ''}`}
          onClick={() => onCategoryChange(category.id)}
        >
          {language === 'ru' ? category.name_ru : category.name_en}
        </button>
      ))}
    </div>
  );
});

PortfolioTabs.displayName = 'PortfolioTabs';

export default PortfolioTabs;
