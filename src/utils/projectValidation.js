/**
 * Утилиты для валидации проектов портфолио
 */

/**
 * Валидация данных проекта на клиентской стороне
 * @param {Object} projectData - Данные проекта для валидации
 * @param {Array} existingProjects - Существующие проекты (для проверки уникальности ID)
 * @param {boolean} isEditing - Флаг редактирования (true если редактируем существующий проект)
 * @returns {Object} Результат валидации с ошибками
 */
export const validateProject = (projectData, existingProjects = [], isEditing = false) => {
  const errors = [];
  const warnings = [];

  // Валидация ID проекта
  if (!projectData.id || !projectData.id.trim()) {
    errors.push('ID проекта обязателен');
  } else {
    const id = projectData.id.trim();
    
    // Проверка формата ID (должен быть pet-N или layout-N)
    const idPattern = /^(pet|layout|commercial)-\d+$/;
    if (!idPattern.test(id)) {
      errors.push('ID проекта должен быть в формате "pet-1", "layout-1" или "commercial-1"');
    }

    // Проверка уникальности ID (только при создании нового проекта)
    if (!isEditing) {
      const existingProject = existingProjects.find(project => project.id === id);
      if (existingProject) {
        errors.push('Проект с таким ID уже существует');
      }
    }
  }

  // Валидация названий
  if (!projectData.titleRu || !projectData.titleRu.trim()) {
    errors.push('Название на русском языке обязательно');
  } else if (projectData.titleRu.trim().length < 2) {
    errors.push('Название на русском должно содержать минимум 2 символа');
  } else if (projectData.titleRu.trim().length > 100) {
    errors.push('Название на русском не должно превышать 100 символов');
  }

  if (!projectData.titleEn || !projectData.titleEn.trim()) {
    errors.push('Название на английском языке обязательно');
  } else if (projectData.titleEn.trim().length < 2) {
    errors.push('Название на английском должно содержать минимум 2 символа');
  } else if (projectData.titleEn.trim().length > 100) {
    errors.push('Название на английском не должно превышать 100 символов');
  }

  // Валидация описаний
  if (!projectData.descriptionRu || !projectData.descriptionRu.trim()) {
    errors.push('Описание на русском языке обязательно');
  } else if (projectData.descriptionRu.trim().length < 10) {
    errors.push('Описание на русском должно содержать минимум 10 символов');
  } else if (projectData.descriptionRu.trim().length > 1000) {
    errors.push('Описание на русском не должно превышать 1000 символов');
  }

  if (!projectData.descriptionEn || !projectData.descriptionEn.trim()) {
    errors.push('Описание на английском языке обязательно');
  } else if (projectData.descriptionEn.trim().length < 10) {
    errors.push('Описание на английском должно содержать минимум 10 символов');
  } else if (projectData.descriptionEn.trim().length > 1000) {
    errors.push('Описание на английском не должно превышать 1000 символов');
  }

  // Валидация категории
  if (!projectData.categoryId || !projectData.categoryId.trim()) {
    errors.push('Категория проекта обязательна');
  }

  // Валидация ссылки (если указана)
  if (projectData.link && projectData.link.trim()) {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(projectData.link.trim())) {
      errors.push('Ссылка должна начинаться с http:// или https://');
    }
  }

  // Валидация пути к изображению (если указан)
  if (projectData.imagePath && projectData.imagePath.trim()) {
    const imagePath = projectData.imagePath.trim();
    
    // Проверка расширения файла
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExtension = imageExtensions.some(ext => 
      imagePath.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      errors.push('Изображение должно иметь расширение: .jpg, .jpeg, .png, .webp или .gif');
    }

    // Проверка пути (должен начинаться с / или быть относительным)
    if (!imagePath.startsWith('/') && !imagePath.startsWith('./') && !imagePath.startsWith('../')) {
      warnings.push('Рекомендуется использовать абсолютный путь для изображения (начинающийся с /)');
    }
  }

  // Валидация порядка сортировки
  if (projectData.sortOrder !== undefined && projectData.sortOrder !== null) {
    const sortOrder = Number(projectData.sortOrder);
    if (isNaN(sortOrder) || sortOrder < 0) {
      errors.push('Порядок сортировки должен быть неотрицательным числом');
    }
  }

  // Предупреждения для улучшения качества данных
  if (!projectData.imagePath || !projectData.imagePath.trim()) {
    warnings.push('Рекомендуется добавить изображение для проекта');
  }

  if (!projectData.link || !projectData.link.trim()) {
    warnings.push('Рекомендуется добавить ссылку на проект');
  }

  // Проверка HTML в описаниях
  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(projectData.descriptionRu)) {
    warnings.push('Описание на русском содержит HTML теги - убедитесь, что они корректны');
  }
  if (htmlPattern.test(projectData.descriptionEn)) {
    warnings.push('Описание на английском содержит HTML теги - убедитесь, что они корректны');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Санитизация данных проекта
 * @param {Object} projectData - Данные проекта для санитизации
 * @returns {Object} Санитизированные данные проекта
 */
export const sanitizeProject = (projectData) => {
  const sanitized = { ...projectData };

  // Обрезаем пробелы и приводим к нужному формату
  if (sanitized.id) {
    sanitized.id = sanitized.id.trim().toLowerCase();
  }

  if (sanitized.titleRu) {
    sanitized.titleRu = sanitized.titleRu.trim();
  }

  if (sanitized.titleEn) {
    sanitized.titleEn = sanitized.titleEn.trim();
  }

  if (sanitized.descriptionRu) {
    sanitized.descriptionRu = sanitized.descriptionRu.trim();
  }

  if (sanitized.descriptionEn) {
    sanitized.descriptionEn = sanitized.descriptionEn.trim();
  }

  if (sanitized.link) {
    sanitized.link = sanitized.link.trim();
  }

  if (sanitized.imagePath) {
    sanitized.imagePath = sanitized.imagePath.trim();
  }

  if (sanitized.categoryId) {
    sanitized.categoryId = sanitized.categoryId.trim();
  }

  // Приводим числовые значения к правильному типу
  if (sanitized.sortOrder !== undefined && sanitized.sortOrder !== null) {
    sanitized.sortOrder = Number(sanitized.sortOrder) || 0;
  }

  // Приводим булевые значения к правильному типу
  sanitized.isAi = Boolean(sanitized.isAi);
  sanitized.isNew = Boolean(sanitized.isNew);
  sanitized.isInProgress = Boolean(sanitized.isInProgress);
  sanitized.isHidden = Boolean(sanitized.isHidden);

  return sanitized;
};

/**
 * Валидация данных категории
 * @param {Object} categoryData - Данные категории для валидации
 * @param {Array} existingCategories - Существующие категории (для проверки уникальности ID)
 * @param {boolean} isEditing - Флаг редактирования
 * @returns {Object} Результат валидации с ошибками
 */
export const validateCategory = (categoryData, existingCategories = [], isEditing = false) => {
  const errors = [];
  const warnings = [];

  // Валидация ID категории
  if (!categoryData.id || !categoryData.id.trim()) {
    errors.push('ID категории обязателен');
  } else {
    const id = categoryData.id.trim();
    
    // Проверка формата ID (только буквы, цифры, дефисы)
    const idPattern = /^[a-z0-9-]+$/;
    if (!idPattern.test(id)) {
      errors.push('ID категории может содержать только строчные буквы, цифры и дефисы');
    }

    // Проверка длины ID
    if (id.length < 2) {
      errors.push('ID категории должен содержать минимум 2 символа');
    } else if (id.length > 20) {
      errors.push('ID категории не должен превышать 20 символов');
    }

    // Проверка уникальности ID (только при создании новой категории)
    if (!isEditing) {
      const existingCategory = existingCategories.find(category => category.id === id);
      if (existingCategory) {
        errors.push('Категория с таким ID уже существует');
      }
    }
  }

  // Валидация названий
  if (!categoryData.nameRu || !categoryData.nameRu.trim()) {
    errors.push('Название на русском языке обязательно');
  } else if (categoryData.nameRu.trim().length < 2) {
    errors.push('Название на русском должно содержать минимум 2 символа');
  } else if (categoryData.nameRu.trim().length > 50) {
    errors.push('Название на русском не должно превышать 50 символов');
  }

  if (!categoryData.nameEn || !categoryData.nameEn.trim()) {
    errors.push('Название на английском языке обязательно');
  } else if (categoryData.nameEn.trim().length < 2) {
    errors.push('Название на английском должно содержать минимум 2 символа');
  } else if (categoryData.nameEn.trim().length > 50) {
    errors.push('Название на английском не должно превышать 50 символов');
  }

  // Валидация порядка сортировки
  if (categoryData.sortOrder !== undefined && categoryData.sortOrder !== null) {
    const sortOrder = Number(categoryData.sortOrder);
    if (isNaN(sortOrder) || sortOrder < 0) {
      errors.push('Порядок сортировки должен быть неотрицательным числом');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Санитизация данных категории
 * @param {Object} categoryData - Данные категории для санитизации
 * @returns {Object} Санитизированные данные категории
 */
export const sanitizeCategory = (categoryData) => {
  const sanitized = { ...categoryData };

  // Обрезаем пробелы и приводим к нужному формату
  if (sanitized.id) {
    sanitized.id = sanitized.id.trim().toLowerCase();
  }

  if (sanitized.nameRu) {
    sanitized.nameRu = sanitized.nameRu.trim();
  }

  if (sanitized.nameEn) {
    sanitized.nameEn = sanitized.nameEn.trim();
  }

  // Приводим числовые значения к правильному типу
  if (sanitized.sortOrder !== undefined && sanitized.sortOrder !== null) {
    sanitized.sortOrder = Number(sanitized.sortOrder) || 0;
  }

  // Приводим булевые значения к правильному типу
  sanitized.isHidden = Boolean(sanitized.isHidden);

  return sanitized;
};