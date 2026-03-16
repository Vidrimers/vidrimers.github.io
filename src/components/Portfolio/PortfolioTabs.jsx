import { useContext, memo, useMemo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Portfolio.module.css';

const PortfolioTabs = memo(({ activeCategory, onCategoryChange }) => {
  const { translations } = useContext(LanguageContext);
  
  // Мемоизируем массив категорий для оптимизации производительности
  const categories = useMemo(() => [
    { key: 'pet', label: translations.portfolio.tabs.pet },
    { key: 'layout', label: translations.portfolio.tabs.layout }
  ], [translations.portfolio.tabs]);
  
  return (
    <div className={styles.tabs}>
      {categories.map(category => (
        <button
          key={category.key}
          className={`${styles.tabsItem} ${activeCategory === category.key ? styles.tabsItemActive : ''}`}
          onClick={() => onCategoryChange(category.key)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
});

PortfolioTabs.displayName = 'PortfolioTabs';

export default PortfolioTabs;