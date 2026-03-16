import { useContext, memo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Skills.module.css';

const SkillItem = memo(({ skill }) => {
  const { language } = useContext(LanguageContext);
  
  // Используем название навыка в зависимости от языка
  const skillName = language === 'ru' ? skill.name : skill.nameEn;

  return (
    <div className={styles.item}>
      <img 
        src={skill.icon} 
        alt={skillName}
        className={styles.itemImg}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.itemText}>
        <h3 className={styles.itemTitle}>
          {skillName}
        </h3>
      </div>
    </div>
  );
});

SkillItem.displayName = 'SkillItem';

export default SkillItem;