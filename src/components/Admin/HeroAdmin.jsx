import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminModal from './AdminModal';
import ImageEditor from './ImageEditor';
import { useAdmin } from './AdminProvider';
import styles from './HeroAdmin.module.css';

// Доступные языки для добавления
const AVAILABLE_LANGUAGES = [
  { code: 'fr', labelRu: 'ФРА', labelEn: 'FRA' },
  { code: 'de', labelRu: 'НЕМ', labelEn: 'DEU' },
  { code: 'es', labelRu: 'ИСП', labelEn: 'ESP' },
  { code: 'ja', labelRu: 'ЯПО', labelEn: 'JPN' },
  { code: 'zh', labelRu: 'КИТ', labelEn: 'CHN' },
  { code: 'pt', labelRu: 'ПОР', labelEn: 'POR' },
  { code: 'it', labelRu: 'ИТА', labelEn: 'ITA' },
  { code: 'ar', labelRu: 'АРА', labelEn: 'ARA' },
  { code: 'ko', labelRu: 'КОР', labelEn: 'KOR' },
  { code: 'tr', labelRu: 'ТУР', labelEn: 'TUR' },
  { code: 'pl', labelRu: 'ПОЛ', labelEn: 'POL' },
  { code: 'uk', labelRu: 'УКР', labelEn: 'UKR' },
  { code: 'ka', labelRu: 'ГРУ', labelEn: 'GEO' },
];

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const HeroAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'images' | 'preview'

  // Текстовые данные
  const [activeLang, setActiveLang] = useState('ru');
  const [form, setForm] = useState({
    titleRu: '',
    titleEn: '',
    subtitleRu: '',
    subtitleEn: '',
  });
  const [languages, setLanguages] = useState([]);
  const [originalData, setOriginalData] = useState(null);

  // Изображения
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [uploadQuality, setUploadQuality] = useState(85);
  const [estimatedSize, setEstimatedSize] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Редактор изображений
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState(null);

  // Диалог дубликата имени
  const [duplicateDialog, setDuplicateDialog] = useState(null); // { file, originalName }
  const [newImageName, setNewImageName] = useState('');

  // Refs
  const fileInputRef = useRef(null);

  // Загрузка данных
  const loadHeroData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/hero', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Ошибка загрузки данных Hero');
      const data = await response.json();

      const { titleRu, titleEn, subtitleRu, subtitleEn, languages: langs, currentPhoto: photo, allImages: images } = data.data;

      setForm({ titleRu, titleEn, subtitleRu, subtitleEn });
      setLanguages(langs || []);
      setCurrentPhoto(photo);
      setAllImages(images || []);
      setOriginalData({ titleRu, titleEn, subtitleRu, subtitleEn, languages: langs });
    } catch (err) {
      console.error('Ошибка загрузки Hero:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadHeroData();
    }
  }, [isOpen, isAuthenticated, loadHeroData]);

  // === ТЕКСТ: сохранение ===
  const handleSaveText = async () => {
    if (!form.titleRu.trim()) {
      setError('Заголовок на русском обязателен');
      setActiveLang('ru');
      return;
    }
    if (!form.subtitleRu.trim()) {
      setError('Подзаголовок на русском обязателен');
      setActiveLang('ru');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/hero', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titleRu: form.titleRu.trim(),
          titleEn: form.titleEn.trim(),
          subtitleRu: form.subtitleRu.trim(),
          subtitleEn: form.subtitleEn.trim(),
          languages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Ошибка сохранения');
      }

      const data = await response.json();
      setOriginalData({
        titleRu: data.data.titleRu,
        titleEn: data.data.titleEn,
        subtitleRu: data.data.subtitleRu,
        subtitleEn: data.data.subtitleEn,
        languages: data.data.languages,
      });
      setSuccessMsg('Текстовые данные сохранены');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetText = () => {
    if (originalData) {
      setForm({
        titleRu: originalData.titleRu,
        titleEn: originalData.titleEn,
        subtitleRu: originalData.subtitleRu,
        subtitleEn: originalData.subtitleEn,
      });
      setLanguages(originalData.languages || []);
      setError(null);
    }
  };

  // === ЯЗЫКИ ===
  const handleToggleLanguage = (code) => {
    setLanguages((prev) =>
      prev.map((l) => (l.code === code ? { ...l, enabled: !l.enabled } : l))
    );
  };

  const handleUpdateLabel = (code, field, value) => {
    setLanguages((prev) =>
      prev.map((l) => (l.code === code ? { ...l, [field]: value } : l))
    );
  };

  const handleAddLanguage = (langDef) => {
    // Проверяем что язык ещё не добавлен
    if (languages.some((l) => l.code === langDef.code)) return;
    setLanguages((prev) => [...prev, { ...langDef, enabled: true }]);
  };

  const handleRemoveLanguage = (code) => {
    // Нельзя удалять ru и en
    if (code === 'ru' || code === 'en') return;
    setLanguages((prev) => prev.filter((l) => l.code !== code));
  };

  // Языки, которые можно добавить (ещё не в списке)
  const addableLanguages = AVAILABLE_LANGUAGES.filter(
    (al) => !languages.some((l) => l.code === al.code)
  );

  // === ИЗОБРАЖЕНИЯ ===
  const handleFileSelect = async (file) => {
    if (!file) return;

    // Валидация на клиенте
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Разрешены только изображения: JPG, PNG, WebP, GIF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError(null);

    try {
      // Сжатие через canvas если quality < 100
      let fileToUpload = file;
      if (uploadQuality < 100 && file.type !== 'image/gif') {
        fileToUpload = await compressImage(file, uploadQuality / 100);
      }

      const formData = new FormData();
      formData.append('image', fileToUpload);

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/hero/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Ошибка загрузки');
      }

      const data = await response.json();
      setAllImages((prev) => [data.data, ...prev]);
      setSuccessMsg('Изображение загружено');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Клиентское сжатие через canvas
  const compressImage = (file, quality) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Оценка размера при изменении quality
  const handleQualityChange = (newQuality) => {
    setUploadQuality(newQuality);
    // Примерная оценка: JPEG quality ~линейно влияет на размер
    // Это приблизительно, реальный размер будет известен после сжатия
    setEstimatedSize(null);
  };

  // Установить текущим
  const handleSetCurrent = async (imageId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/hero/photo/${imageId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Ошибка установки фото');

      const img = allImages.find((i) => i.id === imageId);
      setCurrentPhoto(img);
      setSuccessMsg('Текущее фото обновлено');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Удалить изображение
  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Удалить это изображение навсегда?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/hero/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      setAllImages((prev) => prev.filter((i) => i.id !== imageId));
      if (currentPhoto && currentPhoto.id === imageId) {
        setCurrentPhoto(null);
      }
      setSuccessMsg('Изображение удалено');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // === РЕДАКТОР ИЗОБРАЖЕНИЙ ===
  const handleOpenEditor = () => {
    if (!currentPhoto) return;
    // Filerobot требует абсолютный URL или HTMLImageElement
    const absoluteUrl = `${window.location.origin}/uploads/hero/${currentPhoto.filename}`;
    setEditorImageUrl(absoluteUrl);
    setEditorOpen(true);
  };

  const uploadEditedImage = async (file) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/hero/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Ошибка загрузки');
      }

      const data = await response.json();
      setAllImages((prev) => [data.data, ...prev]);

      const setResponse = await fetch(`/api/hero/photo/${data.data.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (setResponse.ok) {
        setCurrentPhoto(data.data);
      }

      setSuccessMsg('Отредактированное изображение сохранено');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditorSave = async (editedFile) => {
    setEditorOpen(false);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', editedFile);

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/hero/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 409) {
        // Дубликат имени — показываем диалог
        setDuplicateDialog({ file: editedFile, originalName: editedFile.name });
        setNewImageName(editedFile.name);
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Ошибка загрузки');
      }

      const data = await response.json();
      setAllImages((prev) => [data.data, ...prev]);

      const setResponse = await fetch(`/api/hero/photo/${data.data.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (setResponse.ok) {
        setCurrentPhoto(data.data);
      }

      setSuccessMsg('Отредактированное изображение сохранено');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Перезаписать существующее изображение
  const handleOverwrite = async () => {
    if (!duplicateDialog) return;
    const { file } = duplicateDialog;
    setDuplicateDialog(null);

    // Находим старое изображение по имени и удаляем
    const oldImage = allImages.find((img) => img.original_name === file.name);
    if (oldImage) {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/hero/images/${oldImage.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllImages((prev) => prev.filter((img) => img.id !== oldImage.id));
    }

    await uploadEditedImage(file);
  };

  // Сохранить с новым именем (или перезаписать, если имя совпадает)
  const handleSaveWithNewName = async () => {
    if (!duplicateDialog || !newImageName.trim()) return;
    const newName = newImageName.trim();

    // Если имя совпадает — перезаписываем (удаляем старое)
    if (newName === duplicateDialog.originalName) {
      await handleOverwrite();
      return;
    }

    const renamedFile = new File([duplicateDialog.file], newName, { type: duplicateDialog.file.type });
    setDuplicateDialog(null);
    await uploadEditedImage(renamedFile);
  };

  // Отмена диалога дубликата
  const handleDuplicateCancel = () => {
    setDuplicateDialog(null);
    setNewImageName('');
  };

  const handleEditorCancel = () => {
    setEditorOpen(false);
    setEditorImageUrl(null);
  };

  // Проверка изменений текста
  const hasTextChanges =
    originalData &&
    (form.titleRu !== originalData.titleRu ||
      form.titleEn !== originalData.titleEn ||
      form.subtitleRu !== originalData.subtitleRu ||
      form.subtitleEn !== originalData.subtitleEn ||
      JSON.stringify(languages) !== JSON.stringify(originalData.languages));

  // === PREVIEW: Crop-настройки ===
  const [crops, setCrops] = useState({
    mobile: { x: 50, y: 50, scale: 1 },
    tablet: { x: 50, y: 50, scale: 1 },
    desktop: { x: 50, y: 50, scale: 1 },
    synced: true,
  });
  const [activeBreakpoint, setActiveBreakpoint] = useState('desktop');

  // Загрузка crop из текущего фото
  useEffect(() => {
    if (currentPhoto?.responsive_crops_json) {
      try {
        const parsed = JSON.parse(currentPhoto.responsive_crops_json);
        if (parsed.mobile || parsed.tablet || parsed.desktop) {
          setCrops(parsed);
        }
      } catch {}
    }
  }, [currentPhoto]);

  const handleCropChange = (breakpoint, field, value) => {
    setCrops((prev) => {
      const next = { ...prev };
      if (next.synced) {
        // Если синхронизировано — меняем все
        next.mobile = { ...next.mobile, [field]: value };
        next.tablet = { ...next.tablet, [field]: value };
        next.desktop = { ...next.desktop, [field]: value };
      } else {
        next[breakpoint] = { ...next[breakpoint], [field]: value };
      }
      return next;
    });
  };

  const handleToggleSync = () => {
    setCrops((prev) => {
      const newSynced = !prev.synced;
      if (newSynced) {
        // При включении синхронизации — копируем текущий брейкпоинт во все
        const source = prev[activeBreakpoint];
        return {
          synced: true,
          mobile: { ...source },
          tablet: { ...source },
          desktop: { ...source },
        };
      }
      return { ...prev, synced: false };
    });
  };

  const handleSaveCrops = async () => {
    if (!currentPhoto) return;
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/hero/photo/${currentPhoto.id}/crops`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crops }),
      });

      if (!response.ok) throw new Error('Ошибка сохранения crop-настроек');
      setSuccessMsg('Crop-настройки сохранены');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const PREVIEW_BREAKPOINTS = [
    { key: 'mobile', label: 'Mobile', width: 320 },
    { key: 'tablet', label: 'Tablet', width: 768 },
    { key: 'desktop', label: 'Desktop', width: 1440 },
  ];

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление Hero-секцией" size="large">
      <div className={styles.container}>
        {/* Сообщения */}
        {error && <div className={styles.error}>{error}</div>}
        {successMsg && <div className={styles.success}>{successMsg}</div>}

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <>
            {/* Главные вкладки */}
            <div className={styles.mainTabs}>
              <button
                className={`${styles.mainTab} ${activeTab === 'text' ? styles.mainTabActive : ''}`}
                onClick={() => setActiveTab('text')}
              >
                Текст
              </button>
              <button
                className={`${styles.mainTab} ${activeTab === 'images' ? styles.mainTabActive : ''}`}
                onClick={() => setActiveTab('images')}
              >
                Изображения
                {allImages.length > 0 && (
                  <span className={styles.tabBadge}>{allImages.length}</span>
                )}
              </button>
              <button
                className={`${styles.mainTab} ${activeTab === 'preview' ? styles.mainTabActive : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                Превью
              </button>
            </div>

            {/* ====== ВКЛАДКА "ТЕКСТ" ====== */}
            {activeTab === 'text' && (
              <div className={styles.tabContent}>
                {/* Переключатель языка контента */}
                <div className={styles.langTabs}>
                  <button
                    className={`${styles.langTab} ${activeLang === 'ru' ? styles.langTabActive : ''}`}
                    onClick={() => setActiveLang('ru')}
                  >
                    Русский
                  </button>
                  <button
                    className={`${styles.langTab} ${activeLang === 'en' ? styles.langTabActive : ''}`}
                    onClick={() => setActiveLang('en')}
                  >
                    English
                  </button>
                </div>

                {/* Поля ввода */}
                <div className={styles.fieldsGroup}>
                  <label className={styles.fieldLabel}>
                    Заголовок (имя)
                    <input
                      className={styles.input}
                      type="text"
                      value={activeLang === 'ru' ? form.titleRu : form.titleEn}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [activeLang === 'ru' ? 'titleRu' : 'titleEn']: e.target.value,
                        }))
                      }
                      placeholder={activeLang === 'ru' ? 'Ярослав Ширяков' : 'Yaroslav Shiryakov'}
                      maxLength={100}
                    />
                  </label>

                  <label className={styles.fieldLabel}>
                    Подзаголовок (специальность)
                    <input
                      className={styles.input}
                      type="text"
                      value={activeLang === 'ru' ? form.subtitleRu : form.subtitleEn}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [activeLang === 'ru' ? 'subtitleRu' : 'subtitleEn']: e.target.value,
                        }))
                      }
                      placeholder={activeLang === 'ru' ? 'Frontend разработчик' : 'Frontend Developer'}
                      maxLength={100}
                    />
                  </label>
                </div>

                {/* Управление языками */}
                <div className={styles.langManager}>
                  <h3 className={styles.sectionTitle}>Переключатель языков на сайте</h3>
                  <p className={styles.sectionHint}>
                    Управление отображением языков в Hero-секции. Нажмите на переключатель, чтобы включить/отключить.
                  </p>

                  <div className={styles.langList}>
                    {languages.map((lang) => (
                      <div key={lang.code} className={styles.langItem}>
                        <label className={styles.langToggle}>
                          <input
                            type="checkbox"
                            checked={lang.enabled}
                            onChange={() => handleToggleLanguage(lang.code)}
                          />
                          <span className={styles.langCheckmark} />
                        </label>

                        <span className={styles.langCode}>{lang.code.toUpperCase()}</span>

                        <input
                          className={styles.langLabelInput}
                          type="text"
                          value={lang.labelRu}
                          onChange={(e) => handleUpdateLabel(lang.code, 'labelRu', e.target.value)}
                          placeholder="RU label"
                          maxLength={10}
                        />
                        <input
                          className={styles.langLabelInput}
                          type="text"
                          value={lang.labelEn}
                          onChange={(e) => handleUpdateLabel(lang.code, 'labelEn', e.target.value)}
                          placeholder="EN label"
                          maxLength={10}
                        />

                        {lang.code !== 'ru' && lang.code !== 'en' && (
                          <button
                            className={styles.langRemoveBtn}
                            onClick={() => handleRemoveLanguage(lang.code)}
                            title="Удалить язык"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Добавить язык */}
                  {addableLanguages.length > 0 && (
                    <div className={styles.addLangWrapper}>
                      <select
                        className={styles.addLangSelect}
                        value=""
                        onChange={(e) => {
                          const langDef = AVAILABLE_LANGUAGES.find((l) => l.code === e.target.value);
                          if (langDef) handleAddLanguage(langDef);
                        }}
                      >
                        <option value="" disabled>
                          + Добавить язык
                        </option>
                        {addableLanguages.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.code.toUpperCase()} ({l.labelRu})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Кнопки */}
                <div className={styles.formActions}>
                  {hasTextChanges && (
                    <button className={styles.resetButton} onClick={handleResetText} disabled={saving}>
                      Сбросить изменения
                    </button>
                  )}
                  <button className={styles.cancelButton} onClick={onClose} disabled={saving}>
                    Закрыть
                  </button>
                  <button
                    className={styles.saveButton}
                    onClick={handleSaveText}
                    disabled={saving || !hasTextChanges}
                  >
                    {saving ? 'Сохранение...' : 'Сохранить текст'}
                  </button>
                </div>
              </div>
            )}

            {/* ====== ВКЛАДКА "ИЗОБРАЖЕНИЯ" ====== */}
            {activeTab === 'images' && (
              <div className={styles.tabContent}>
                {/* Текущее фото */}
                {currentPhoto && (
                  <div className={styles.currentPhotoSection}>
                    <h3 className={styles.sectionTitle}>Текущее изображение</h3>
                    <div className={styles.currentPhotoCard}>
                      <div className={styles.currentPhotoPreview}>
                        <img
                          src={`/uploads/hero/${currentPhoto.filename}`}
                          alt={currentPhoto.original_name}
                        />
                      </div>
                      <div className={styles.currentPhotoInfo}>
                        <span className={styles.photoName}>{currentPhoto.original_name}</span>
                        <span className={styles.photoMeta}>
                          {formatSize(currentPhoto.size)}
                          {currentPhoto.width && currentPhoto.height && (
                            <> · {currentPhoto.width}×{currentPhoto.height}</>
                          )}
                        </span>
                        <button
                          className={styles.editPhotoBtn}
                          onClick={handleOpenEditor}
                        >
                          Редактировать
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Загрузка нового изображения */}
                <div className={styles.uploadSection}>
                  <h3 className={styles.sectionTitle}>Загрузить изображение</h3>

                  {/* Слайдер качества */}
                  <div className={styles.qualityControl}>
                    <label className={styles.qualityLabel}>
                      Качество сжатия: <strong>{uploadQuality}%</strong>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={uploadQuality}
                      onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                      className={styles.qualitySlider}
                    />
                    <div className={styles.qualityHints}>
                      <span>Маленький размер</span>
                      <span>Максимальное качество</span>
                    </div>
                  </div>

                  {/* Drag & Drop зона */}
                  <div
                    className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''} ${uploading ? styles.dropZoneUploading : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                    />
                    {uploading ? (
                      <div className={styles.uploadProgress}>
                        <div className={styles.spinner} />
                        <span>Загрузка...</span>
                      </div>
                    ) : (
                      <div className={styles.dropZoneContent}>
                        <span className={styles.dropZoneIcon}>📁</span>
                        <span className={styles.dropZoneText}>
                          Перетащите изображение сюда или нажмите для выбора
                        </span>
                        <span className={styles.dropZoneHint}>
                          JPG, PNG, WebP, GIF · до 10MB
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Галерея */}
                {allImages.length > 0 && (
                  <div className={styles.gallerySection}>
                    <h3 className={styles.sectionTitle}>
                      Галерея изображений
                      <span className={styles.galleryCount}>{allImages.length}</span>
                    </h3>

                    <div className={styles.galleryGrid}>
                      {allImages.map((img) => (
                        <div
                          key={img.id}
                          className={`${styles.galleryItem} ${
                            currentPhoto && currentPhoto.id === img.id ? styles.galleryItemActive : ''
                          }`}
                        >
                          <div className={styles.galleryThumb}>
                            <img
                              src={`/uploads/hero/${img.filename}`}
                              alt={img.original_name}
                            />
                            <div className={styles.galleryOverlay}>
                              <button
                                className={styles.galleryBtnSet}
                                onClick={() => handleSetCurrent(img.id)}
                                title="Сделать текущим"
                              >
                                ✓
                              </button>
                              <button
                                className={styles.galleryBtnDelete}
                                onClick={() => handleDeleteImage(img.id)}
                                title="Удалить"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <div className={styles.galleryInfo}>
                            <span className={styles.gallerySize}>{formatSize(img.size)}</span>
                            {img.width && img.height && (
                              <span className={styles.galleryDimensions}>
                                {img.width}×{img.height}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {allImages.length === 0 && (
                  <div className={styles.emptyGallery}>
                    Нет загруженных изображений
                  </div>
                )}

                {/* Кнопка закрыть */}
                <div className={styles.formActions}>
                  <button className={styles.cancelButton} onClick={onClose}>
                    Закрыть
                  </button>
                </div>
              </div>
            )}

            {/* ====== ВКЛАДКА "ПРЕВЬЮ" ====== */}
            {activeTab === 'preview' && (
              <div className={styles.tabContent}>
                {!currentPhoto ? (
                  <div className={styles.emptyGallery}>
                    Сначала загрузите изображение на вкладке "Изображения"
                  </div>
                ) : (
                  <>
                    {/* Переключатель брейкпоинтов */}
                    <div className={styles.breakpointTabs}>
                      {PREVIEW_BREAKPOINTS.map((bp) => (
                        <button
                          key={bp.key}
                          className={`${styles.breakpointTab} ${activeBreakpoint === bp.key ? styles.breakpointTabActive : ''}`}
                          onClick={() => setActiveBreakpoint(bp.key)}
                        >
                          {bp.label}
                          <span className={styles.breakpointWidth}>{bp.width}px</span>
                        </button>
                      ))}
                    </div>

                    {/* Превью фреймы */}
                    <div className={styles.previewFramesRow}>
                      {PREVIEW_BREAKPOINTS.map((bp) => {
                        const crop = crops[bp.key] || { x: 50, y: 50, scale: 1 };
                        const bgPosX = 50 + (crop.x - 50) * 0.3;
                        const bgPosY = 50 + (crop.y - 50) * 0.3;
                        const bgSize = 100 * (crop.scale || 1);

                        return (
                          <div key={bp.key} className={styles.previewFrameWrapper}>
                            <div className={styles.previewFrameLabel}>
                              {bp.label} ({bp.width}px)
                            </div>
                            <div
                              className={styles.previewFrame}
                              style={{ width: Math.min(bp.width, 400) }}
                            >
                              <div
                                className={styles.previewHeroInner}
                                style={{
                                  backgroundImage: `url(/uploads/hero/${currentPhoto.filename})`,
                                  backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                                  backgroundSize: `${bgSize}%`,
                                }}
                              >
                                <div className={styles.previewHeroTop}>
                                  <div className={styles.previewTitle}>
                                    {form.titleRu || 'Имя'}
                                  </div>
                                  <div className={styles.previewSubtitle}>
                                    {form.subtitleRu || 'Специальность'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Crop-контролы */}
                    <div className={styles.cropControls}>
                      <h3 className={styles.sectionTitle}>
                        Настройки области
                        {crops.synced && <span className={styles.syncedBadge}>Синхронизировано</span>}
                      </h3>

                      <label className={styles.cropToggle}>
                        <input
                          type="checkbox"
                          checked={crops.synced}
                          onChange={handleToggleSync}
                        />
                        <span>Синхронизировать для всех экранов</span>
                      </label>

                      <div className={styles.cropSliders}>
                        <label className={styles.cropLabel}>
                          Позиция X: <strong>{crops[activeBreakpoint]?.x ?? 50}%</strong>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={crops[activeBreakpoint]?.x ?? 50}
                            onChange={(e) => handleCropChange(activeBreakpoint, 'x', parseInt(e.target.value))}
                            className={styles.cropSlider}
                          />
                        </label>

                        <label className={styles.cropLabel}>
                          Позиция Y: <strong>{crops[activeBreakpoint]?.y ?? 50}%</strong>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={crops[activeBreakpoint]?.y ?? 50}
                            onChange={(e) => handleCropChange(activeBreakpoint, 'y', parseInt(e.target.value))}
                            className={styles.cropSlider}
                          />
                        </label>

                        <label className={styles.cropLabel}>
                          Масштаб: <strong>{(crops[activeBreakpoint]?.scale ?? 1).toFixed(1)}x</strong>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={crops[activeBreakpoint]?.scale ?? 1}
                            onChange={(e) => handleCropChange(activeBreakpoint, 'scale', parseFloat(e.target.value))}
                            className={styles.cropSlider}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Кнопки */}
                    <div className={styles.formActions}>
                      <button className={styles.cancelButton} onClick={onClose}>
                        Закрыть
                      </button>
                      <button className={styles.saveButton} onClick={handleSaveCrops}>
                        Сохранить crop-настройки
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* Редактор изображений — поверх модалки */}
      {editorOpen && editorImageUrl && (
        <div className={styles.editorOverlay}>
          <ImageEditor
            imageUrl={editorImageUrl}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        </div>
      )}

      {/* Диалог дубликата имени */}
      {duplicateDialog && (
        <div className={styles.duplicateOverlay}>
          <div className={styles.duplicateDialog}>
            <h3 className={styles.duplicateTitle}>Изображение с таким именем уже существует</h3>
            <p className={styles.duplicateName}>"{duplicateDialog.originalName}"</p>

            <div className={styles.duplicateActions}>
              <button className={styles.duplicateBtnOverwrite} onClick={handleOverwrite}>
                Перезаписать
              </button>
              <button className={styles.duplicateBtnNewName} onClick={handleSaveWithNewName} disabled={!newImageName.trim()}>
                Сохранить с новым именем
              </button>
              <button className={styles.duplicateBtnCancel} onClick={handleDuplicateCancel}>
                Отмена
              </button>
            </div>

            <div className={styles.duplicateNewName}>
              <input
                className={styles.input}
                type="text"
                value={newImageName}
                onChange={(e) => setNewImageName(e.target.value)}
                placeholder="Введите новое имя файла"
                maxLength={100}
              />
            </div>
          </div>
        </div>
      )}
    </AdminModal>
  );
};

export default HeroAdmin;
