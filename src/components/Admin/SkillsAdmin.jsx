import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import ImageUpload from './ImageUpload';
import { useAdmin } from './AdminProvider';
import styles from './SkillsAdmin.module.css';

const SkillsAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [draggedSkill, setDraggedSkill] = useState(null);

  // Состояние формы навыка
  const [skillForm, setSkillForm] = useState({
    nameRu: '',
    nameEn: '',
    iconPath: '',
    sortOrder: 0,
    isHidden: false
  });

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadSkills();
    }
  }, [isOpen, isAuthenticated]);

  // Загрузка навыков
  const loadSkills = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Загружаем навыки (включая скрытые для админа)
      const response = await fetch('/api/skills?includeHidden=true', {
        headers
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки навыков');
      }

      const data = await response.json();
      
      // Преобразуем числовые значения в булевы для корректного отображения
      const transformedSkills = (data.data || []).map(skill => ({
        ...skill,
        is_hidden: Boolean(skill.is_hidden)
      }));

      setSkills(transformedSkills);

    } catch (err) {
      console.error('Ошибка загрузки навыков:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Сброс формы
  const resetForm = () => {
    setSkillForm({
      nameRu: '',
      nameEn: '',
      iconPath: '',
      sortOrder: skills.length,
      isHidden: false
    });
    setEditingSkill(null);
  };

  // Открытие формы создания навыка
  const handleCreateSkill = () => {
    resetForm();
    setShowSkillForm(true);
  };

  // Открытие формы редактирования навыка
  const handleEditSkill = (skill) => {
    setSkillForm({
      nameRu: skill.name_ru,
      nameEn: skill.name_en,
      iconPath: skill.icon_path || '',
      sortOrder: skill.sort_order,
      isHidden: skill.is_hidden
    });
    setEditingSkill(skill);
    setShowSkillForm(true);
  };

  // Обработка изменений в форме
  const handleFormChange = (field, value) => {
    setSkillForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Валидация формы
  const validateForm = () => {
    const errors = [];

    if (!skillForm.nameRu.trim()) {
      errors.push('Название на русском обязательно');
    }

    if (!skillForm.nameEn.trim()) {
      errors.push('Название на английском обязательно');
    }

    if (!skillForm.iconPath.trim()) {
      errors.push('Иконка навыка обязательна');
    }

    // Проверяем уникальность названий (только для новых навыков или при изменении названия)
    if (!editingSkill || 
        editingSkill.name_ru !== skillForm.nameRu || 
        editingSkill.name_en !== skillForm.nameEn) {
      
      const duplicateRu = skills.find(skill => 
        skill.name_ru.toLowerCase() === skillForm.nameRu.toLowerCase() &&
        (!editingSkill || skill.id !== editingSkill.id)
      );
      
      const duplicateEn = skills.find(skill => 
        skill.name_en.toLowerCase() === skillForm.nameEn.toLowerCase() &&
        (!editingSkill || skill.id !== editingSkill.id)
      );

      if (duplicateRu) {
        errors.push('Навык с таким названием на русском уже существует');
      }

      if (duplicateEn) {
        errors.push('Навык с таким названием на английском уже существует');
      }
    }

    return errors;
  };

  // Сохранение навыка
  const handleSaveSkill = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const skillData = {
        nameRu: skillForm.nameRu.trim(),
        nameEn: skillForm.nameEn.trim(),
        iconPath: skillForm.iconPath.trim(),
        sortOrder: skillForm.sortOrder,
        isHidden: skillForm.isHidden
      };

      const url = editingSkill 
        ? `/api/skills/${editingSkill.id}`
        : '/api/skills';

      const method = editingSkill ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(skillData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка сохранения навыка');
      }

      // Перезагружаем данные
      await loadSkills();
      
      // Закрываем форму
      setShowSkillForm(false);
      resetForm();

    } catch (err) {
      console.error('Ошибка сохранения навыка:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Удаление навыка
  const handleDeleteSkill = async (skill) => {
    if (!confirm(`Вы уверены, что хотите удалить навык "${skill.name_ru}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/skills/${skill.id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка удаления навыка');
      }

      // Перезагружаем данные
      await loadSkills();

    } catch (err) {
      console.error('Ошибка удаления навыка:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Переключение видимости навыка
  const handleToggleVisibility = async (skill) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/skills/${skill.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nameRu: skill.name_ru,
          nameEn: skill.name_en,
          iconPath: skill.icon_path,
          sortOrder: skill.sort_order,
          isHidden: !skill.is_hidden
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка изменения видимости');
      }

      // Перезагружаем данные
      await loadSkills();

    } catch (err) {
      console.error('Ошибка изменения видимости:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Обработка drag & drop для изменения порядка
  const handleDragStart = (e, skill) => {
    setDraggedSkill(skill);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetSkill) => {
    e.preventDefault();
    
    if (!draggedSkill || draggedSkill.id === targetSkill.id) {
      setDraggedSkill(null);
      return;
    }

    // Создаем новый массив с измененным порядком
    const newSkills = [...skills];
    const draggedIndex = newSkills.findIndex(s => s.id === draggedSkill.id);
    const targetIndex = newSkills.findIndex(s => s.id === targetSkill.id);

    // Удаляем перетаскиваемый элемент и вставляем его в новую позицию
    const [removed] = newSkills.splice(draggedIndex, 1);
    newSkills.splice(targetIndex, 0, removed);

    // Обновляем sort_order для всех навыков
    const updatedSkills = newSkills.map((skill, index) => ({
      ...skill,
      sort_order: index
    }));

    setSkills(updatedSkills);
    setDraggedSkill(null);

    // Сохраняем новый порядок на сервере
    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/skills/reorder', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          skills: updatedSkills.map(skill => ({
            id: skill.id,
            sort_order: skill.sort_order
          }))
        })
      });

      if (!response.ok) {
        // Если ошибка, возвращаем исходный порядок
        await loadSkills();
        throw new Error('Ошибка сохранения порядка навыков');
      }

    } catch (err) {
      console.error('Ошибка изменения порядка:', err);
      setError(err.message);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Управление навыками"
      size="large"
    >
      <div className={styles.container}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            Загрузка...
          </div>
        )}

        {!showSkillForm ? (
          // Список навыков
          <div className={styles.skillsList}>
            <div className={styles.header}>
              <h3>Навыки</h3>
              <button 
                className={styles.createButton}
                onClick={handleCreateSkill}
                disabled={loading}
              >
                + Добавить навык
              </button>
            </div>

            <div className={styles.dragInfo}>
              💡 Перетаскивайте навыки для изменения порядка отображения
            </div>

            <div className={styles.skills}>
              {skills.map(skill => (
                <div 
                  key={skill.id} 
                  className={`${styles.skillCard} ${skill.is_hidden ? styles.hidden : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, skill)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, skill)}
                >
                  <div className={styles.dragHandle}>
                    ⋮⋮
                  </div>
                  
                  <div className={styles.skillIcon}>
                    <img 
                      src={skill.icon_path} 
                      alt={skill.name_ru}
                      onError={(e) => {
                        e.target.src = '/assets/img/ico/skills/default.png';
                      }}
                    />
                  </div>

                  <div className={styles.skillInfo}>
                    <div className={styles.skillNames}>
                      <h4>{skill.name_ru}</h4>
                      <span className={styles.skillNameEn}>{skill.name_en}</span>
                    </div>
                    
                    <div className={styles.skillMeta}>
                      <span className={styles.sortOrder}>
                        Порядок: {skill.sort_order}
                      </span>
                      
                      {skill.is_hidden && (
                        <span className={styles.hiddenFlag}>Скрыт</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.skillActions}>
                    <button 
                      className={styles.editButton}
                      onClick={() => handleEditSkill(skill)}
                      disabled={loading}
                    >
                      Редактировать
                    </button>
                    
                    <button 
                      className={styles.visibilityButton}
                      onClick={() => handleToggleVisibility(skill)}
                      disabled={loading}
                    >
                      {skill.is_hidden ? 'Показать' : 'Скрыть'}
                    </button>
                    
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteSkill(skill)}
                      disabled={loading}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              {skills.length === 0 && !loading && (
                <div className={styles.emptyState}>
                  Навыки не найдены. Добавьте первый навык.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Форма создания/редактирования навыка
          <div className={styles.skillForm}>
            <div className={styles.formHeader}>
              <h3>{editingSkill ? 'Редактирование навыка' : 'Добавление навыка'}</h3>
              <button 
                className={styles.backButton}
                onClick={() => setShowSkillForm(false)}
              >
                ← Назад к списку
              </button>
            </div>

            <div className={styles.formGrid}>
              {/* Название на русском */}
              <div className={styles.formGroup}>
                <label htmlFor="nameRu">Название (русский) *</label>
                <input
                  id="nameRu"
                  type="text"
                  value={skillForm.nameRu}
                  onChange={(e) => handleFormChange('nameRu', e.target.value)}
                  placeholder="HTML"
                />
              </div>

              {/* Название на английском */}
              <div className={styles.formGroup}>
                <label htmlFor="nameEn">Название (английский) *</label>
                <input
                  id="nameEn"
                  type="text"
                  value={skillForm.nameEn}
                  onChange={(e) => handleFormChange('nameEn', e.target.value)}
                  placeholder="HTML"
                />
              </div>

              {/* Иконка навыка */}
              <div className={styles.formGroup}>
                <label>Иконка навыка *</label>
                <ImageUpload
                  value={skillForm.iconPath}
                  onChange={(path) => handleFormChange('iconPath', path)}
                  onError={(error) => setError(error)}
                  placeholder="Перетащите иконку навыка сюда или нажмите для выбора"
                  accept="image/*,.svg"
                  category="skills"
                />
                <small className={styles.helpText}>
                  Поддерживаются: JPG, PNG, WebP, GIF, SVG (до 5MB). Рекомендуемый размер: 64x64px
                </small>
              </div>

              {/* Порядок сортировки */}
              <div className={styles.formGroup}>
                <label htmlFor="sortOrder">Порядок сортировки</label>
                <input
                  id="sortOrder"
                  type="number"
                  value={skillForm.sortOrder}
                  onChange={(e) => handleFormChange('sortOrder', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            {/* Флаги навыка */}
            <div className={styles.flagsSection}>
              <h4>Настройки</h4>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={skillForm.isHidden}
                    onChange={(e) => handleFormChange('isHidden', e.target.checked)}
                  />
                  <span>Скрыть навык</span>
                </label>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className={styles.formActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowSkillForm(false)}
                disabled={loading}
              >
                Отмена
              </button>
              
              <button 
                className={styles.saveButton}
                onClick={handleSaveSkill}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : (editingSkill ? 'Обновить' : 'Создать')}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default SkillsAdmin;