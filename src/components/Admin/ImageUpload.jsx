import React, { useState, useRef } from 'react';
import styles from './ImageUpload.module.css';

const ImageUpload = ({ 
  value, 
  onChange, 
  onError, 
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB по умолчанию
  placeholder = "Перетащите изображение сюда или нажмите для выбора",
  category = "portfolio" // Категория для организации файлов
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const fileInputRef = useRef(null);

  // Валидация файла
  const validateFile = (file) => {
    const errors = [];

    // Проверка типа файла
    if (!file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      errors.push('Файл должен быть изображением');
    }

    // Проверка размера файла
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      errors.push(`Размер файла не должен превышать ${maxSizeMB}MB`);
    }

    // Проверка расширения
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('Поддерживаются только файлы: JPG, PNG, WebP, GIF, SVG');
    }

    return errors;
  };

  // Загрузка файла на сервер
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category); // Используем переданную категорию

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/files/upload?category=${encodeURIComponent(category)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка загрузки файла');
      }

      const data = await response.json();
      return data.data.path; // Возвращаем путь к загруженному файлу

    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      throw error;
    }
  };

  // Обработка выбора файла
  const handleFileSelect = async (file) => {
    if (!file) return;

    // Валидация файла
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      if (onError) {
        onError(validationErrors.join(', '));
      }
      return;
    }

    setIsUploading(true);

    try {
      // Создаем превью
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Загружаем файл на сервер
      const uploadedPath = await uploadFile(file);
      
      // Обновляем значение
      if (onChange) {
        onChange(uploadedPath);
      }

      // Обновляем превью на серверный путь
      setPreview(uploadedPath);

      // Очищаем временный URL
      URL.revokeObjectURL(previewUrl);

    } catch (error) {
      if (onError) {
        onError(error.message);
      }
      
      // Сбрасываем превью при ошибке
      setPreview(value || '');
    } finally {
      setIsUploading(false);
    }
  };

  // Обработка drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Обработка клика для выбора файла
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Обработка изменения input
  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Обработка ручного ввода пути
  const handlePathChange = (e) => {
    const newPath = e.target.value;
    setPreview(newPath);
    if (onChange) {
      onChange(newPath);
    }
  };

  // Удаление изображения
  const handleRemove = () => {
    setPreview('');
    if (onChange) {
      onChange('');
    }
    
    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      {/* Зона загрузки */}
      <div 
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className={styles.hiddenInput}
        />

        {isUploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner}></div>
            <p>Загрузка изображения...</p>
          </div>
        ) : preview ? (
          <div className={styles.previewContainer}>
            <img 
              src={preview} 
              alt="Превью" 
              className={styles.preview}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className={styles.brokenImage} style={{ display: 'none' }}>
              <span>🖼️</span>
              <p>Не удалось загрузить изображение</p>
            </div>
            <div className={styles.previewActions}>
              <button 
                type="button"
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.uploadIcon}>📁</div>
            <p>{placeholder}</p>
            <small>
              {category === 'skills' 
                ? 'Поддерживаются: JPG, PNG, WebP, GIF, SVG (до 5MB)' 
                : 'Поддерживаются: JPG, PNG, WebP, GIF (до 5MB)'
              }
            </small>
          </div>
        )}
      </div>

      {/* Поле для ручного ввода пути */}
      <div className={styles.pathInput}>
        <label>Или укажите путь к изображению:</label>
        <input
          type="text"
          value={preview}
          onChange={handlePathChange}
          placeholder="/assets/img/portfolio/project.jpg"
          disabled={isUploading}
        />
      </div>
    </div>
  );
};

export default ImageUpload;