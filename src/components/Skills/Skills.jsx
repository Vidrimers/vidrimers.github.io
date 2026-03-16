import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { skills } from '../../data/skillsData';
import SkillItem from './SkillItem';
import styles from './Skills.module.css';

const Skills = () => {
  const { translations } = useContext(LanguageContext);

  return (
    <section className={styles.skills} id="skills">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <h2 className={styles.title}>
            {translations.skills.title}
          </h2>
          <div className={styles.items}>
            {skills.map(skill => (
              <SkillItem 
                key={skill.id} 
                skill={skill}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;