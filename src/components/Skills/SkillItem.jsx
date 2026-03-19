import { useContext, memo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Skills.module.css';

const SkillItem = memo(({ skill }) => {
  const { language } = useContext(LanguageContext);
  
  // Используем название навыка в зависимости от языка (поля из БД)
  const skillName = language === 'ru' ? skill.name_ru : skill.name_en;

  return (
    <div className={styles.item}>
      <img 
        src={skill.icon_path} 
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