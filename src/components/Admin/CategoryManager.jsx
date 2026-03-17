import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import { validateCategory, sanitizeCategory } from '../../utils/projectValidation';
import styles from './CategoryManager.module.css';

const CategoryManager = ({ isOpen, onClose, onCategoryChange }) => {
  const { isAuthenticated } = useAdmin();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Состояние формы категории
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    nameRu: '',
    nameEn: '',
    sortOrder: 0,
    isHidden: false
  });

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadCategories();
    }
  }, [isOpen, isAuthenticated]);

  // Загрузка категорий
  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Загружаем категории (включая скрытые для админа)
      const response = await fetch('/api/categories?includeHidden=true', {
        headers
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки категорий');
      }

      const data = await response.json();
      setCategories(data.data || []);

    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Сброс формы
  const resetForm = () => {
    setCategoryForm({
      id: '',
      nameRu: '',
      nameEn: '',
      sortOrder: 0,
      isHidden: false
    });
    setEditingCategory(null);
  };

  // Открытие формы создания категории
  const handleCreateCategory = () => {
    resetForm();
    setShowCategoryForm(true);
  };

  // Открытие формы редактирования категории
  const handleEditCategory = (category) => {
    setCategoryForm({
      id: category.id,
      nameRu: category.name_ru,
      nameEn: category.name_en,
      sortOrder: category.sort_order,
      isHidden: category.is_hidden
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  // Обработка изменений в форме
  const handleFormChange = (field, value) => {
    setCategoryForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Валидация формы
  const validateForm = () => {
    // Используем утилиту валидации
    const validation = validateCategory(categoryForm, categories, editingCategory !== null);
    
    if (!validation.isValid) {
      return validation.errors;
    }

    return [];
  };

  // Сохранение категории
  const handleSaveCategory = async () => {
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
      const sanitizedData = sanitizeCategory(categoryForm);

      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';

      const method = editingCategory ? 'PUT' : 'POST';

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
        
        throw new Error(errorData.error?.message || 'Ошибка сохранения категории');
      }

      // Перезагружаем данные
      await loadCategories();
      
      // Уведомляем родительский компонент об изменении
      if (onCategoryChange) {
        onCategoryChange();
      }
      
      // Закрываем форму
      setShowCategoryForm(false);
      resetForm();

    } catch (err) {
      console.error('Ошибка сохранения категории:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Проверка использования категории в проектах
  const checkCategoryUsage = async (categoryId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/categories/${categoryId}/projects`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Ошибка проверки использования категории');
      }

      const data = await response.json();
      return data.data?.count || 0;

    } catch (err) {
      console.error('Ошибка проверки использования категории:', err);
      return 0;
    }
  };

  // Удаление категории
  const handleDeleteCategory = async (category) => {
    // Проверяем использование категории
    const projectsCount = await checkCategoryUsage(category.id);
    
    if (projectsCount > 0) {
      setError(`Категория "${category.name_ru}" используется в ${projectsCount} проект(ах). Удалите или переместите проекты перед удалением категории.`);
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить категорию "${category.name_ru}"?`)) {
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

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка удаления категории');
      }

      // Перезагружаем данные
      await loadCategories();
      
      // Уведомляем родительский компонент об изменении
      if (onCategoryChange) {
        onCategoryChange();
      }

    } catch (err) {
      console.error('Ошибка удаления категории:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Переключение видимости категории
  const handleToggleVisibility = async (category) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          isHidden: !category.is_hidden
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка изменения видимости');
      }

      // Перезагружаем данные
      await loadCategories();
      
      // Уведомляем родительский компонент об изменении
      if (onCategoryChange) {
        onCategoryChange();
      }

    } catch (err) {
      console.error('Ошибка изменения видимости:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Изменение порядка сортировки
  const handleSortOrderChange = async (category, newSortOrder) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          sortOrder: newSortOrder
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка изменения порядка');
      }

      // Перезагружаем данные
      await loadCategories();
      
      // Уведомляем родительский компонент об изменении
      if (onCategoryChange) {
        onCategoryChange();
      }

    } catch (err) {
      console.error('Ошибка изменения порядка:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Управление категориями"
      size="medium"
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

        {!showCategoryForm ? (
          // Список категорий
          <div className={styles.categoriesList}>
            <div className={styles.header}>
              <h3>Категории портфолио</h3>
              <button 
                className={styles.createButton}
                onClick={handleCreateCategory}
                disabled={loading}
              >
                + Создать категорию
              </button>
            </div>

            <div className={styles.categories}>
              {categories.map(category => (
                <div 
                  key={category.id} 
                  className={`${styles.categoryCard} ${category.is_hidden ? styles.hidden : ''}`}
                >
                  <div className={styles.categoryInfo}>
                    <div className={styles.categoryTitle}>
                      <h4>{category.name_ru}</h4>
                      <span className={styles.categoryId}>{category.id}</span>
                    </div>
                    
                    <div className={styles.categoryMeta}>
                      <span className={styles.nameEn}>
                        EN: {category.name_en}
                      </span>
                      
                      <div className={styles.sortOrder}>
                        <label>Порядок:</label>
                        <input
                          type="number"
                          value={category.sort_order}
                          onChange={(e) => handleSortOrderChange(category, parseInt(e.target.value) || 0)}
                          min="0"
                          disabled={loading}
                        />
                      </div>
                      
                      <div className={styles.flags}>
                        {category.is_hidden && <span className={styles.flag}>Скрыта</span>}
                      </div>
                    </div>
                  </div>

                  <div className={styles.categoryActions}>
                    <button 
                      className={styles.editButton}
                      onClick={() => handleEditCategory(category)}
                      disabled={loading}
                    >
                      Редактировать
                    </button>
                    
                    <button 
                      className={styles.visibilityButton}
                      onClick={() => handleToggleVisibility(category)}
                      disabled={loading}
                    >
                      {category.is_hidden ? 'Показать' : 'Скрыть'}
                    </button>
                    
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteCategory(category)}
                      disabled={loading}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && !loading && (
                <div className={styles.emptyState}>
                  Категории не найдены. Создайте первую категорию.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Форма создания/редактирования категории
          <div className={styles.categoryForm}>
            <div className={styles.formHeader}>
              <h3>{editingCategory ? 'Редактирование категории' : 'Создание категории'}</h3>
              <button 
                className={styles.backButton}
                onClick={() => setShowCategoryForm(false)}
              >
                ← Назад к списку
              </button>
            </div>

            <div className={styles.formGrid}>
              {/* ID категории */}
              <div className={styles.formGroup}>
                <label htmlFor="categoryId">ID категории *</label>
                <input
                  id="categoryId"
                  type="text"
                  value={categoryForm.id}
                  onChange={(e) => handleFormChange('id', e.target.value)}
                  placeholder="pet, layout, commercial"
                  disabled={editingCategory !== null}
                />
                <small>Используется в URL и для группировки проектов</small>
              </div>

              {/* Название на русском */}
              <div className={styles.formGroup}>
                <label htmlFor="nameRu">Название (русский) *</label>
                <input
                  id="nameRu"
                  type="text"
                  value={categoryForm.nameRu}
                  onChange={(e) => handleFormChange('nameRu', e.target.value)}
                  placeholder="Собственные проекты"
                />
              </div>

              {/* Название на английском */}
              <div className={styles.formGroup}>
                <label htmlFor="nameEn">Название (английский) *</label>
                <input
                  id="nameEn"
                  type="text"
                  value={categoryForm.nameEn}
                  onChange={(e) => handleFormChange('nameEn', e.target.value)}
                  placeholder="Personal projects"
                />
              </div>

              {/* Порядок сортировки */}
              <div className={styles.formGroup}>
                <label htmlFor="sortOrder">Порядок сортировки</label>
                <input
                  id="sortOrder"
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => handleFormChange('sortOrder', parseInt(e.target.value) || 0)}
                  min="0"
                />
                <small>Меньшие числа отображаются первыми</small>
              </div>
            </div>

            {/* Флаги категории */}
            <div className={styles.flagsSection}>
              <h4>Настройки видимости</h4>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={categoryForm.isHidden}
                    onChange={(e) => handleFormChange('isHidden', e.target.checked)}
                  />
                  <span>Скрыть категорию</span>
                </label>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className={styles.formActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowCategoryForm(false)}
                disabled={loading}
              >
                Отмена
              </button>
              
              <button 
                className={styles.saveButton}
                onClick={handleSaveCategory}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : (editingCategory ? 'Обновить' : 'Создать')}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default CategoryManager;