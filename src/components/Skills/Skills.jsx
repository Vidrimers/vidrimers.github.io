import { useContext, useMemo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { skills } from '../../data/skillsData';
import SkillItem from './SkillItem';
import AdminIndicator from '../Admin/AdminIndicator';
import styles from './Skills.module.css';

const Skills = () => {
  const { translations } = useContext(LanguageContext);

  // Мемоизируем рендеринг навыков для оптимизации производительности
  const skillItems = useMemo(() => {
    return skills.map(skill => (
      <SkillItem 
        key={skill.id} 
        skill={skill}
      />
    ));
  }, [skills]);

  return (
    <section className={styles.skills} id="skills">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>
              {translations.skills.title}
              <AdminIndicator 
                section="Навыки"
                onClick={() => console.log('Открыть управление разделом "Навыки"')}
              />
            </h2>
          </div>
          <div className={styles.items}>
            {skillItems}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;