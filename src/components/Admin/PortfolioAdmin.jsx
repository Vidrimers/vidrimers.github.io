import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import CategoryManager from './CategoryManager';
import ImageUpload from './ImageUpload';
import { useAdmin } from './AdminProvider';
import { validateProject, sanitizeProject } from '../../utils/projectValidation';
import { generateProjectId, isIdAvailable, validateProjectIdFormat } from '../../utils/idGenerator';
import styles from './PortfolioAdmin.module.css';

const PortfolioAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // Состояние настроек сортировки
  const [sortSettings, setSortSettings] = useState({
    portfolioSortOrder: 'sort_order',
    portfolioSortDirection: 'asc'
  });

  // Состояние формы проекта
  const [projectForm, setProjectForm] = useState({
    id: '',
    titleRu: '',
    titleEn: '',
    descriptionRu: '',
    descriptionEn: '',
    imagePath: '',
    link: '',
    categoryId: '',
    isAi: false,
    isNew: false,
    isInProgress: false,
    isHidden: false,
    sortOrder: 0
  });

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadData();
    }
  }, [isOpen, isAuthenticated]);

  // Загрузка проектов и категорий
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Загружаем проекты (включая скрытые для админа)
      const projectsResponse = await fetch('/api/projects?includeHidden=true', {
        headers
      });

      if (!projectsResponse.ok) {
        throw new Error('Ошибка загрузки проектов');
      }

      const projectsData = await projectsResponse.json();

      // Загружаем категории (включая скрытые для админа)
      const categoriesResponse = await fetch('/api/categories?includeHidden=true', {
        headers
      });

      if (!categoriesResponse.ok) {
        throw new Error('Ошибка загрузки категорий');
      }

      const categoriesData = await categoriesResponse.json();

      // Загружаем настройки сортировки
      const settingsResponse = await fetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          setSortSettings({
            portfolioSortOrder: settingsData.data.portfolio_sort_order || 'sort_order',
            portfolioSortDirection: settingsData.data.portfolio_sort_direction || 'asc'
          });
        }
      }

      // Преобразуем числовые значения в булевы для корректного отображения
      const transformedProjects = (projectsData.data || []).map(project => ({
        ...project,
        is_ai: Boolean(project.is_ai),
        is_new: Boolean(project.is_new),
        is_in_progress: Boolean(project.is_in_progress),
        is_hidden: Boolean(project.is_hidden)
      }));

      setProjects(transformedProjects);
      setCategories(categoriesData.data || []);

    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Сохранение настроек сортировки
  const handleSortSettingsChange = async (newSortOrder, newSortDirection) => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          portfolioSortOrder: newSortOrder,
          portfolioSortDirection: newSortDirection
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка ответа сервера:', errorData);
        throw new Error('Ошибка сохранения настроек');
      }

      setSortSettings({
        portfolioSortOrder: newSortOrder,
        portfolioSortDirection: newSortDirection
      });

    } catch (err) {
      console.error('Ошибка сохранения настроек:', err);
      setError(err.message);
    }
  };

  // Сброс формы
  const resetForm = () => {
    setProjectForm({
      id: '',
      titleRu: '',
      titleEn: '',
      descriptionRu: '',
      descriptionEn: '',
      imagePath: '',
      link: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      isAi: false,
      isNew: false,
      isInProgress: false,
      isHidden: false,
      sortOrder: 0
    });
    setEditingProject(null);
  };

  // Открытие формы создания проекта
  const handleCreateProject = () => {
    resetForm();
    
    // Автогенерация ID для первой доступной категории
    if (categories.length > 0) {
      const firstCategory = categories[0];
      const generatedId = generateProjectId(firstCategory.id, projects);
      setProjectForm(prev => ({
        ...prev,
        id: generatedId,
        categoryId: firstCategory.id
      }));
    }
    
    setShowProjectForm(true);
  };

  // Обработчик открытия менеджера категорий
  const handleOpenCategoryManager = () => {
    setShowCategoryManager(true);
  };

  // Обработчик закрытия менеджера категорий
  const handleCloseCategoryManager = () => {
    setShowCategoryManager(false);
  };

  // Обработчик изменения категорий (для обновления списка)
  const handleCategoryChange = () => {
    loadData(); // Перезагружаем данные при изменении категорий
  };

  // Открытие формы редактирования проекта
  const handleEditProject = (project) => {
    setProjectForm({
      id: project.id,
      titleRu: project.title_ru,
      titleEn: project.title_en,
      descriptionRu: project.description_ru,
      descriptionEn: project.description_en,
      imagePath: project.image_path || '',
      link: project.link || '',
      categoryId: project.category_id,
      isAi: project.is_ai,
      isNew: project.is_new,
      isInProgress: project.is_in_progress,
      isHidden: project.is_hidden,
      sortOrder: project.sort_order
    });
    setEditingProject(project);
    setShowProjectForm(true);
  };

  // Обработка изменений в форме
  const handleFormChange = (field, value) => {
    setProjectForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Автогенерация ID при изменении категории (только для новых проектов)
    if (field === 'categoryId' && !editingProject && value) {
      const generatedId = generateProjectId(value, projects);
      setProjectForm(prev => ({
        ...prev,
        id: generatedId
      }));
    }
  };

  // Валидация формы
  const validateForm = () => {
    // Используем утилиту валидации
    const validation = validateProject(projectForm, projects, editingProject !== null);
    
    if (!validation.isValid) {
      return validation.errors;
    }

    return [];
  };

  // Сохранение проекта
  const handleSaveProject = async () => {
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

      // Санитизируем данные перед отправкой
      const sanitizedData = sanitizeProject(projectForm);

      const url = editingProject 
        ? `/api/projects/${editingProject.id}`
        : '/api/projects';

      const method = editingProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(sanitizedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Обрабатываем ошибки валидации с сервера
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error?.details) {
          throw new Error(errorData.error.details.join(', '));
        }
        
        throw new Error(errorData.error?.message || 'Ошибка сохранения проекта');
      }

      // Перезагружаем данные
      await loadData();
      
      // Закрываем форму
      setShowProjectForm(false);
      resetForm();

    } catch (err) {
      console.error('Ошибка сохранения проекта:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Удаление проекта
  const handleDeleteProject = async (project) => {
    if (!confirm(`Вы уверены, что хотите удалить проект "${project.title_ru}"?`)) {
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

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка удаления проекта');
      }

      // Перезагружаем данные
      await loadData();

    } catch (err) {
      console.error('Ошибка удаления проекта:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Переключение видимости проекта
  const handleToggleVisibility = async (project) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          is_hidden: !project.is_hidden
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка изменения видимости');
      }

      // Перезагружаем данные
      await loadData();

    } catch (err) {
      console.error('Ошибка изменения видимости:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Получение названия категории
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name_ru : 'Неизвестная категория';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Управление портфолио"
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

        {!showProjectForm ? (
          // Список проектов
          <div className={styles.projectsList}>
            <div className={styles.header}>
              <h3>Проекты портфолио</h3>
              <div className={styles.headerActions}>
                {/* Селект сортировки */}
                <div className={styles.sortControls}>
                  <label className={styles.sortLabel}>Сортировка:</label>
                  <select 
                    className={styles.sortSelect}
                    value={sortSettings.portfolioSortOrder}
                    onChange={(e) => handleSortSettingsChange(e.target.value, sortSettings.portfolioSortDirection)}
                    disabled={loading}
                  >
                    <option value="sort_order">По порядку</option>
                    <option value="created_at">По дате добавления</option>
                    <option value="title_ru">По названию</option>
                    <option value="likes_count">По лайкам</option>
                  </select>
                  <select 
                    className={styles.sortSelect}
                    value={sortSettings.portfolioSortDirection}
                    onChange={(e) => handleSortSettingsChange(sortSettings.portfolioSortOrder, e.target.value)}
                    disabled={loading}
                  >
                    <option value="asc">По возрастанию</option>
                    <option value="desc">По убыванию</option>
                  </select>
                </div>
                
                <button 
                  className={styles.categoryButton}
                  onClick={handleOpenCategoryManager}
                  disabled={loading}
                >
                  Управление категориями
                </button>
                <button 
                  className={styles.createButton}
                  onClick={handleCreateProject}
                  disabled={loading}
                >
                  + Создать проект
                </button>
              </div>
            </div>

            <div className={styles.projects}>
              {projects.map(project => (
                <div 
                  key={project.id} 
                  className={`${styles.projectCard} ${project.is_hidden ? styles.hidden : ''}`}
                >
                  <div className={styles.projectInfo}>
                    <div className={styles.projectTitle}>
                      <h4>{project.title_ru}</h4>
                      <span className={styles.projectId}>{project.id}</span>
                    </div>
                    
                    <div className={styles.projectMeta}>
                      <span className={styles.category}>
                        {getCategoryName(project.category_id)}
                      </span>
                      
                      <div className={styles.flags}>
                        {Boolean(project.is_ai) && <span className={styles.flag}>AI</span>}
                        {Boolean(project.is_new) && <span className={styles.flag}>NEW</span>}
                        {Boolean(project.is_in_progress) && <span className={styles.flag}>В работе</span>}
                        {Boolean(project.is_hidden) && <span className={styles.flag}>Скрыт</span>}
                      </div>
                    </div>

                    <p className={styles.projectDescription}>
                      {project.description_ru}
                    </p>
                  </div>

                  <div className={styles.projectActions}>
                    <button 
                      className={styles.editButton}
                      onClick={() => handleEditProject(project)}
                      disabled={loading}
                    >
                      Редактировать
                    </button>
                    
                    <button 
                      className={styles.visibilityButton}
                      onClick={() => handleToggleVisibility(project)}
                      disabled={loading}
                    >
                      {project.is_hidden ? 'Показать' : 'Скрыть'}
                    </button>
                    
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteProject(project)}
                      disabled={loading}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              {projects.length === 0 && !loading && (
                <div className={styles.emptyState}>
                  Проекты не найдены. Создайте первый проект.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Форма создания/редактирования проекта
          <div className={styles.projectForm}>
            <div className={styles.formHeader}>
              <h3>{editingProject ? 'Редактирование проекта' : 'Создание проекта'}</h3>
              <button 
                className={styles.backButton}
                onClick={() => setShowProjectForm(false)}
              >
                ← Назад к списку
              </button>
            </div>

            <div className={styles.formGrid}>
              {/* ID проекта */}
              <div className={styles.formGroup}>
                <label htmlFor="projectId">ID проекта *</label>
                <div className={styles.idInputGroup}>
                  <input
                    id="projectId"
                    type="text"
                    value={projectForm.id}
                    onChange={(e) => handleFormChange('id', e.target.value)}
                    placeholder="pet-1, layout-1"
                    disabled={editingProject !== null}
                    className={`${styles.idInput} ${
                      projectForm.id && !isIdAvailable(projectForm.id, projects) && !editingProject 
                        ? styles.idUnavailable 
                        : ''
                    }`}
                  />
                  {!editingProject && (
                    <button
                      type="button"
                      className={styles.generateIdButton}
                      onClick={() => {
                        if (projectForm.categoryId) {
                          const generatedId = generateProjectId(projectForm.categoryId, projects);
                          handleFormChange('id', generatedId);
                        }
                      }}
                      disabled={!projectForm.categoryId}
                      title="Сгенерировать следующий доступный ID"
                    >
                      🔄
                    </button>
                  )}
                </div>
                {projectForm.id && !editingProject && (
                  <div className={styles.idStatus}>
                    {isIdAvailable(projectForm.id, projects) ? (
                      <span className={styles.idAvailable}>✓ ID доступен</span>
                    ) : (
                      <span className={styles.idUnavailable}>✗ ID уже используется</span>
                    )}
                  </div>
                )}
              </div>

              {/* Категория */}
              <div className={styles.formGroup}>
                <label htmlFor="categoryId">Категория *</label>
                <select
                  id="categoryId"
                  value={projectForm.categoryId}
                  onChange={(e) => handleFormChange('categoryId', e.target.value)}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name_ru}
                    </option>
                  ))}
                </select>
              </div>

              {/* Название на русском */}
              <div className={styles.formGroup}>
                <label htmlFor="titleRu">Название (русский) *</label>
                <input
                  id="titleRu"
                  type="text"
                  value={projectForm.titleRu}
                  onChange={(e) => handleFormChange('titleRu', e.target.value)}
                  placeholder="Название проекта"
                />
              </div>

              {/* Название на английском */}
              <div className={styles.formGroup}>
                <label htmlFor="titleEn">Название (английский) *</label>
                <input
                  id="titleEn"
                  type="text"
                  value={projectForm.titleEn}
                  onChange={(e) => handleFormChange('titleEn', e.target.value)}
                  placeholder="Project title"
                />
              </div>

              {/* Описание на русском */}
              <div className={styles.formGroup}>
                <label htmlFor="descriptionRu">Описание (русский) *</label>
                <textarea
                  id="descriptionRu"
                  value={projectForm.descriptionRu}
                  onChange={(e) => handleFormChange('descriptionRu', e.target.value)}
                  placeholder="Описание проекта"
                  rows={3}
                />
              </div>

              {/* Описание на английском */}
              <div className={styles.formGroup}>
                <label htmlFor="descriptionEn">Описание (английский) *</label>
                <textarea
                  id="descriptionEn"
                  value={projectForm.descriptionEn}
                  onChange={(e) => handleFormChange('descriptionEn', e.target.value)}
                  placeholder="Project description"
                  rows={3}
                />
              </div>

              {/* Ссылка */}
              <div className={styles.formGroup}>
                <label htmlFor="link">Ссылка на проект</label>
                <input
                  id="link"
                  type="url"
                  value={projectForm.link}
                  onChange={(e) => handleFormChange('link', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              {/* Изображение проекта */}
              <div className={styles.formGroup}>
                <label>Изображение проекта</label>
                <ImageUpload
                  value={projectForm.imagePath}
                  onChange={(path) => handleFormChange('imagePath', path)}
                  onError={(error) => setError(error)}
                  placeholder="Перетащите изображение проекта сюда или нажмите для выбора"
                />
              </div>

              {/* Порядок сортировки */}
              <div className={styles.formGroup}>
                <label htmlFor="sortOrder">Порядок сортировки</label>
                <input
                  id="sortOrder"
                  type="number"
                  value={projectForm.sortOrder}
                  onChange={(e) => handleFormChange('sortOrder', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            {/* Флаги проекта */}
            <div className={styles.flagsSection}>
              <h4>Флаги проекта</h4>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={projectForm.isAi}
                    onChange={(e) => handleFormChange('isAi', e.target.checked)}
                  />
                  <span>AI проект</span>
                </label>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={projectForm.isNew}
                    onChange={(e) => handleFormChange('isNew', e.target.checked)}
                  />
                  <span>Новый проект</span>
                </label>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={projectForm.isInProgress}
                    onChange={(e) => handleFormChange('isInProgress', e.target.checked)}
                  />
                  <span>В разработке</span>
                </label>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={projectForm.isHidden}
                    onChange={(e) => handleFormChange('isHidden', e.target.checked)}
                  />
                  <span>Скрыть проект</span>
                </label>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className={styles.formActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowProjectForm(false)}
                disabled={loading}
              >
                Отмена
              </button>
              
              <button 
                className={styles.saveButton}
                onClick={handleSaveProject}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : (editingProject ? 'Обновить' : 'Создать')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Менеджер категорий */}
      <CategoryManager 
        isOpen={showCategoryManager}
        onClose={handleCloseCategoryManager}
        onCategoryChange={handleCategoryChange}
      />
    </AdminModal>
  );
};

export default PortfolioAdmin;