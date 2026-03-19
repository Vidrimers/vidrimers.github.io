import { useContext, useState, useEffect } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import SkillItem from './SkillItem';
import AdminIndicator from '../Admin/AdminIndicator';
import SkillsAdmin from '../Admin/SkillsAdmin';
import styles from './Skills.module.css';

const Skills = () => {
  const { translations } = useContext(LanguageContext);
  const [showSkillsAdmin, setShowSkillsAdmin] = useState(false);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Загрузка навыков из API
  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      console.log('🔄 Загружаем навыки из API...');
      const response = await fetch('/api/skills?includeHidden=false&sort=sort_order&order=ASC');
      
      console.log('📡 Ответ сервера:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки навыков: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Данные от API:', data);
      console.log('🎯 Навыки:', data.data?.length || 0);
      
      setSkills(data.data || []);
    } catch (error) {
      console.error('❌ Ошибка загрузки навыков:', error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик открытия админской панели
  const handleOpenSkillsAdmin = () => {
    setShowSkillsAdmin(true);
  };

  // Обработчик закрытия админской панели
  const handleCloseSkillsAdmin = () => {
    setShowSkillsAdmin(false);
    loadSkills();
  };

  if (loading) {
    return (
      <section className={styles.skills} id="skills">
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div className={styles.titleWrapper}>
              <h2 className={styles.title}>
                {translations.skills.title}
              </h2>
            </div>
            <div className={styles.items}>
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Загрузка навыков...
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
            {skills.length > 0 ? (
              skills.map(skill => (
                <SkillItem 
                  key={skill.id} 
                  skill={skill}
                />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Навыки не найдены
              </div>
            )}
          </div>
        </div>
      </div>

      <SkillsAdmin 
        isOpen={showSkillsAdmin}
        onClose={handleCloseSkillsAdmin}
      />
    </section>
  );
};

export default Skills;