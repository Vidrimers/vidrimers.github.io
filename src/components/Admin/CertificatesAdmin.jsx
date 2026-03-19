import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import ImageUpload from './ImageUpload';
import { useAdmin } from './AdminProvider';
import styles from './CertificatesAdmin.module.css';

const CertificatesAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [draggedCert, setDraggedCert] = useState(null);

  const emptyCertForm = {
    titleRu: '',
    titleEn: '',
    descriptionRu: '',
    descriptionEn: '',
    imagePath: '',
    link: '',
    dateIssued: '',
    sortOrder: 0,
    isHidden: false
  };

  const [certForm, setCertForm] = useState(emptyCertForm);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadCertificates();
    }
  }, [isOpen, isAuthenticated]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json'
  });

  const loadCertificates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/certificates?includeHidden=true', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Ошибка загрузки сертификатов');
      const data = await response.json();
      const transformed = (data.data || []).map(cert => ({
        ...cert,
        is_hidden: Boolean(cert.is_hidden)
      }));
      setCertificates(transformed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCertForm({ ...emptyCertForm, sortOrder: certificates.length });
    setEditingCert(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (cert) => {
    setCertForm({
      titleRu: cert.title_ru || '',
      titleEn: cert.title_en || '',
      descriptionRu: cert.description_ru || '',
      descriptionEn: cert.description_en || '',
      imagePath: cert.image_path || '',
      link: cert.link || '',
      dateIssued: cert.date_issued || '',
      sortOrder: cert.sort_order,
      isHidden: cert.is_hidden
    });
    setEditingCert(cert);
    setShowForm(true);
  };

  const handleFormChange = (field, value) => {
    setCertForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!certForm.imagePath.trim()) return 'Изображение сертификата обязательно';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        titleRu: certForm.titleRu.trim() || undefined,
        titleEn: certForm.titleEn.trim() || undefined,
        descriptionRu: certForm.descriptionRu.trim() || undefined,
        descriptionEn: certForm.descriptionEn.trim() || undefined,
        imagePath: certForm.imagePath.trim(),
        link: certForm.link.trim() || undefined,
        dateIssued: certForm.dateIssued.trim() || undefined,
        sortOrder: certForm.sortOrder,
        isHidden: certForm.isHidden
      };

      const url = editingCert ? `/api/certificates/${editingCert.id}` : '/api/certificates';
      const method = editingCert ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка сохранения');
      }

      await loadCertificates();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cert) => {
    if (!confirm(`Удалить сертификат "${cert.title_ru || `#${cert.id}`}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/certificates/${cert.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка удаления');
      }
      await loadCertificates();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (cert) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/certificates/${cert.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          titleRu: cert.title_ru || undefined,
          titleEn: cert.title_en || undefined,
          descriptionRu: cert.description_ru || undefined,
          descriptionEn: cert.description_en || undefined,
          imagePath: cert.image_path,
          link: cert.link || undefined,
          dateIssued: cert.date_issued || undefined,
          sortOrder: cert.sort_order,
          isHidden: !cert.is_hidden
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка изменения видимости');
      }
      await loadCertificates();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Drag & drop для изменения порядка
  const handleDragStart = (e, cert) => {
    setDraggedCert(cert);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetCert) => {
    e.preventDefault();
    if (!draggedCert || draggedCert.id === targetCert.id) {
      setDraggedCert(null);
      return;
    }

    const newList = [...certificates];
    const fromIndex = newList.findIndex(c => c.id === draggedCert.id);
    const toIndex = newList.findIndex(c => c.id === targetCert.id);
    const [removed] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, removed);

    const updated = newList.map((cert, index) => ({ ...cert, sort_order: index }));
    setCertificates(updated);
    setDraggedCert(null);

    try {
      const response = await fetch('/api/certificates/reorder', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          certificates: updated.map(c => ({ id: c.id, sort_order: c.sort_order }))
        })
      });
      if (!response.ok) {
        await loadCertificates();
        throw new Error('Ошибка сохранения порядка');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление сертификатами" size="large">
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}
        {loading && <div className={styles.loading}>Загрузка...</div>}

        {!showForm ? (
          <div className={styles.list}>
            <div className={styles.header}>
              <h3>Сертификаты</h3>
              <button className={styles.createButton} onClick={handleCreate} disabled={loading}>
                + Добавить сертификат
              </button>
            </div>

            <div className={styles.dragInfo}>
              💡 Перетаскивайте сертификаты для изменения порядка отображения
            </div>

            <div className={styles.grid}>
              {certificates.map(cert => (
                <div
                  key={cert.id}
                  className={`${styles.card} ${cert.is_hidden ? styles.hidden : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cert)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cert)}
                >
                  <div className={styles.dragHandle}>⋮⋮</div>

                  <div className={styles.certImage}>
                    <img
                      src={cert.image_path}
                      alt={cert.title_ru || `Сертификат #${cert.id}`}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>

                  <div className={styles.certInfo}>
                    <div className={styles.certTitle}>
                      {cert.title_ru || <span className={styles.noTitle}>Без названия</span>}
                    </div>
                    {cert.title_en && (
                      <div className={styles.certTitleEn}>{cert.title_en}</div>
                    )}
                    <div className={styles.certMeta}>
                      {cert.date_issued && <span className={styles.date}>{cert.date_issued}</span>}
                      {cert.is_hidden && <span className={styles.hiddenFlag}>Скрыт</span>}
                    </div>
                  </div>

                  <div className={styles.certActions}>
                    <button className={styles.editButton} onClick={() => handleEdit(cert)} disabled={loading}>
                      Редактировать
                    </button>
                    <button className={styles.visibilityButton} onClick={() => handleToggleVisibility(cert)} disabled={loading}>
                      {cert.is_hidden ? 'Показать' : 'Скрыть'}
                    </button>
                    <button className={styles.deleteButton} onClick={() => handleDelete(cert)} disabled={loading}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              {certificates.length === 0 && !loading && (
                <div className={styles.emptyState}>
                  Сертификаты не найдены. Добавьте первый сертификат.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.formHeader}>
              <h3>{editingCert ? 'Редактирование сертификата' : 'Добавление сертификата'}</h3>
              <button className={styles.backButton} onClick={() => { setShowForm(false); setError(null); }}>
                ← Назад к списку
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="titleRu">Название (русский)</label>
                <input
                  id="titleRu"
                  type="text"
                  value={certForm.titleRu}
                  onChange={(e) => handleFormChange('titleRu', e.target.value)}
                  placeholder="Название сертификата"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="titleEn">Название (английский)</label>
                <input
                  id="titleEn"
                  type="text"
                  value={certForm.titleEn}
                  onChange={(e) => handleFormChange('titleEn', e.target.value)}
                  placeholder="Certificate title"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="descriptionRu">Описание (русский)</label>
                <textarea
                  id="descriptionRu"
                  value={certForm.descriptionRu}
                  onChange={(e) => handleFormChange('descriptionRu', e.target.value)}
                  placeholder="Описание сертификата"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="descriptionEn">Описание (английский)</label>
                <textarea
                  id="descriptionEn"
                  value={certForm.descriptionEn}
                  onChange={(e) => handleFormChange('descriptionEn', e.target.value)}
                  placeholder="Certificate description"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="link">Ссылка на оригинал</label>
                <input
                  id="link"
                  type="url"
                  value={certForm.link}
                  onChange={(e) => handleFormChange('link', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dateIssued">Дата выдачи</label>
                <input
                  id="dateIssued"
                  type="date"
                  value={certForm.dateIssued}
                  onChange={(e) => handleFormChange('dateIssued', e.target.value)}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Изображение сертификата *</label>
                <ImageUpload
                  value={certForm.imagePath}
                  onChange={(path) => handleFormChange('imagePath', path)}
                  onError={(err) => setError(err)}
                  placeholder="Перетащите изображение сертификата сюда или нажмите для выбора"
                  accept="image/*"
                  category="certificates"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="sortOrder">Порядок сортировки</label>
                <input
                  id="sortOrder"
                  type="number"
                  value={certForm.sortOrder}
                  onChange={(e) => handleFormChange('sortOrder', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>

            <div className={styles.flagsSection}>
              <h4>Настройки</h4>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={certForm.isHidden}
                  onChange={(e) => handleFormChange('isHidden', e.target.checked)}
                />
                <span>Скрыть сертификат</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelButton} onClick={() => { setShowForm(false); setError(null); }} disabled={loading}>
                Отмена
              </button>
              <button className={styles.saveButton} onClick={handleSave} disabled={loading}>
                {loading ? 'Сохранение...' : (editingCert ? 'Обновить' : 'Создать')}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default CertificatesAdmin;
