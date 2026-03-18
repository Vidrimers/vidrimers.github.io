import { useContext, useMemo, useState } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { skills } from '../../data/skillsData';
import SkillItem from './SkillItem';
import AdminIndicator from '../Admin/AdminIndicator';
import SkillsAdmin from '../Admin/SkillsAdmin';
import styles from './Skills.module.css';

const Skills = () => {
  const { translations } = useContext(LanguageContext);
  const [showSkillsAdmin, setShowSkillsAdmin] = useState(false);

  // Мемоизируем рендеринг навыков для оптимизации производительности
  const skillItems = useMemo(() => {
    return skills.map(skill => (
      <SkillItem 
        key={skill.id} 
        skill={skill}
      />
    ));
  }, [skills]);

  // Обработчик открытия админской панели
  const handleOpenSkillsAdmin = () => {
    setShowSkillsAdmin(true);
  };

  // Обработчик закрытия админской панели
  const handleCloseSkillsAdmin = () => {
    setShowSkillsAdmin(false);
  };

  return (
    <section className={styles.skills} id="skills">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>
              {translations.skills.title}
              <AdminIndicator 
                section="Навыки"
                onClick={handleOpenSkillsAdmin}
              />
            </h2>
          </div>
          <div className={styles.items}>
            {skillItems}
          </div>
        </div>
      </div>

      {/* Админская панель управления навыками */}
      <SkillsAdmin 
        isOpen={showSkillsAdmin}
        onClose={handleCloseSkillsAdmin}
      />
    </section>
  );
};

export default Skills;