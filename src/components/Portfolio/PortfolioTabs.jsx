import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Portfolio.module.css';

const PortfolioTabs = ({ activeCategory, onCategoryChange }) => {
  const { translations } = useContext(LanguageContext);
  
  const categories = [
    { key: 'pet', label: translations.portfolio.tabs.pet },
    { key: 'layout', label: translations.portfolio.tabs.layout }
  ];
  
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
};

export default PortfolioTabs;