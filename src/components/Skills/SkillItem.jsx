import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import styles from './Skills.module.css';

const SkillItem = ({ skill }) => {
  const { language } = useContext(LanguageContext);
  
  // Используем название навыка в зависимости от языка
  const skillName = language === 'ru' ? skill.name : skill.nameEn;

  return (
    <div className={styles.item}>
      <img 
        src={skill.icon} 
        alt={skillName}
        className={styles.itemImg}
      />
      <div className={styles.itemText}>
        <h3 className={styles.itemTitle}>
          {skillName}
        </h3>
      </div>
    </div>
  );
};

export default SkillItem;