/**
 * Middleware для валидации данных
 */

const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Валидация данных проекта на сервере
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next функция
 */
const validateProject = (req, res, next) => {
  const {
    id,
    titleRu,
    titleEn,
    descriptionRu,
    descriptionEn,
    imagePath,
    link,
    categoryId,
    year,
    month,
    day,
    isAi,
    isNew,
    isInProgress,
    isHidden,
    sortOrder
  } = req.body;

  const errors = [];

  // Валидация ID проекта
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.push('ID проекта обязателен');
  } else {
    const trimmedId = id.trim();
    
    // Проверка формата ID
    const idPattern = /^(pet|layout|commercial)-\d+$/;
    if (!idPattern.test(trimmedId)) {
      errors.push('ID проекта должен быть в формате "pet-1", "layout-1" или "commercial-1"');
    }

    // Проверка длины ID
    if (trimmedId.length > 20) {
      errors.push('ID проекта не должен превышать 20 символов');
    }
  }

  // Валидация названий
  if (!titleRu || typeof titleRu !== 'string' || !titleRu.trim()) {
    errors.push('Название на русском языке обязательно');
  } else {
    const trimmed = titleRu.trim();
    if (trimmed.length < 2) {
      errors.push('Название на русском должно содержать минимум 2 символа');
    } else if (trimmed.length > 100) {
      errors.push('Название на русском не должно превышать 100 символов');
    }
  }

  if (!titleEn || typeof titleEn !== 'string' || !titleEn.trim()) {
    errors.push('Название на английском языке обязательно');
  } else {
    const trimmed = titleEn.trim();
    if (trimmed.length < 2) {
      errors.push('Название на английском должно содержать минимум 2 символа');
    } else if (trimmed.length > 100) {
      errors.push('Название на английском не должно превышать 100 символов');
    }
  }

  // Валидация описаний
  if (!descriptionRu || typeof descriptionRu !== 'string' || !descriptionRu.trim()) {
    errors.push('Описание на русском языке обязательно');
  } else {
    const trimmed = descriptionRu.trim();
    if (trimmed.length < 10) {
      errors.push('Описание на русском должно содержать минимум 10 символов');
    } else if (trimmed.length > 1000) {
      errors.push('Описание на русском не должно превышать 1000 символов');
    }
  }

  if (!descriptionEn || typeof descriptionEn !== 'string' || !descriptionEn.trim()) {
    errors.push('Описание на английском языке обязательно');
  } else {
    const trimmed = descriptionEn.trim();
    if (trimmed.length < 10) {
      errors.push('Описание на английском должно содержать минимум 10 символов');
    } else if (trimmed.length > 1000) {
      errors.push('Описание на английском не должно превышать 1000 символов');
    }
  }

  // Валидация категории
  if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
    errors.push('Категория проекта обязательна');
  }

  // Валидация ссылки (если указана)
  if (link && typeof link === 'string' && link.trim()) {
    if (!validator.isURL(link.trim(), { protocols: ['http', 'https'] })) {
      errors.push('Ссылка должна быть валидным URL (http:// или https://)');
    }
  }

  // Валидация пути к изображению (если указан)
  if (imagePath && typeof imagePath === 'string' && imagePath.trim()) {
    const trimmedPath = imagePath.trim();
    
    // Проверка расширения файла
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExtension = imageExtensions.some(ext => 
      trimmedPath.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      errors.push('Изображение должно иметь расширение: .jpg, .jpeg, .png, .webp или .gif');
    }

    // Проверка на потенциально опасные пути
    if (trimmedPath.includes('..') || trimmedPath.includes('\\')) {
      errors.push('Путь к изображению содержит недопустимые символы');
    }
  }

  // Валидация года создания проекта
  if (year !== undefined && year !== null && year !== '') {
    const numYear = Number(year);
    
    if (isNaN(numYear)) {
      errors.push('Год должен быть числом');
    } else if (numYear < 1990) {
      errors.push('Год должен быть не менее 1990');
    }
  }

  // Валидация месяца создания проекта
  if (month !== undefined && month !== null && month !== '') {
    const numMonth = Number(month);
    
    if (isNaN(numMonth)) {
      errors.push('Месяц должен быть числом');
    } else if (numMonth < 1 || numMonth > 12) {
      errors.push('Месяц должен быть от 1 до 12');
    }
  }

  // Валидация дня создания проекта
  if (day !== undefined && day !== null && day !== '') {
    const numDay = Number(day);
    
    if (isNaN(numDay)) {
      errors.push('День должен быть числом');
    } else if (numDay < 1 || numDay > 31) {
      errors.push('День должен быть от 1 до 31');
    }
  }

  // Валидация порядка сортировки
  if (sortOrder !== undefined && sortOrder !== null) {
    const numSortOrder = Number(sortOrder);
    if (isNaN(numSortOrder) || numSortOrder < 0) {
      errors.push('Порядок сортировки должен быть неотрицательным числом');
    }
  }

  // Валидация булевых флагов
  if (isAi !== undefined && typeof isAi !== 'boolean') {
    errors.push('Флаг AI должен быть булевым значением');
  }

  if (isNew !== undefined && typeof isNew !== 'boolean') {
    errors.push('Флаг "Новый" должен быть булевым значением');
  }

  if (isInProgress !== undefined && typeof isInProgress !== 'boolean') {
    errors.push('Флаг "В разработке" должен быть булевым значением');
  }

  if (isHidden !== undefined && typeof isHidden !== 'boolean') {
    errors.push('Флаг "Скрытый" должен быть булевым значением');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибки валидации данных',
        details: errors
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Валидация данных категории на сервере
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next функция
 */
const validateCategory = (req, res, next) => {
  const {
    id,
    nameRu,
    nameEn,
    sortOrder,
    isHidden
  } = req.body;

  const errors = [];

  // Валидация ID категории
  if (!id || typeof id !== 'string' || !id.trim()) {
    errors.push('ID категории обязателен');
  } else {
    const trimmedId = id.trim();
    
    // Проверка формата ID (только буквы, цифры, дефисы)
    const idPattern = /^[a-z0-9-]+$/;
    if (!idPattern.test(trimmedId)) {
      errors.push('ID категории может содержать только строчные буквы, цифры и дефисы');
    }

    // Проверка длины ID
    if (trimmedId.length < 2) {
      errors.push('ID категории должен содержать минимум 2 символа');
    } else if (trimmedId.length > 20) {
      errors.push('ID категории не должен превышать 20 символов');
    }
  }

  // Валидация названий
  if (!nameRu || typeof nameRu !== 'string' || !nameRu.trim()) {
    errors.push('Название на русском языке обязательно');
  } else {
    const trimmed = nameRu.trim();
    if (trimmed.length < 2) {
      errors.push('Название на русском должно содержать минимум 2 символа');
    } else if (trimmed.length > 50) {
      errors.push('Название на русском не должно превышать 50 символов');
    }
  }

  if (!nameEn || typeof nameEn !== 'string' || !nameEn.trim()) {
    errors.push('Название на английском языке обязательно');
  } else {
    const trimmed = nameEn.trim();
    if (trimmed.length < 2) {
      errors.push('Название на английском должно содержать минимум 2 символа');
    } else if (trimmed.length > 50) {
      errors.push('Название на английском не должно превышать 50 символов');
    }
  }

  // Валидация порядка сортировки
  if (sortOrder !== undefined && sortOrder !== null) {
    const numSortOrder = Number(sortOrder);
    if (isNaN(numSortOrder) || numSortOrder < 0) {
      errors.push('Порядок сортировки должен быть неотрицательным числом');
    }
  }

  // Валидация булевых флагов
  if (isHidden !== undefined && typeof isHidden !== 'boolean') {
    errors.push('Флаг "Скрытый" должен быть булевым значением');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибки валидации данных',
        details: errors
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Санитизация данных проекта
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next функция
 */
const sanitizeProject = (req, res, next) => {
  const data = req.body;

  // Санитизация строковых полей
  if (data.id) {
    data.id = data.id.trim().toLowerCase();
  }

  if (data.titleRu) {
    data.titleRu = DOMPurify.sanitize(data.titleRu.trim(), { ALLOWED_TAGS: [] });
  }

  if (data.titleEn) {
    data.titleEn = DOMPurify.sanitize(data.titleEn.trim(), { ALLOWED_TAGS: [] });
  }

  if (data.descriptionRu) {
    // Разрешаем базовые HTML теги в описании
    data.descriptionRu = DOMPurify.sanitize(data.descriptionRu.trim(), {
      ALLOWED_TAGS: ['a', 'strong', 'em', 'br', 'p'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  if (data.descriptionEn) {
    // Разрешаем базовые HTML теги в описании
    data.descriptionEn = DOMPurify.sanitize(data.descriptionEn.trim(), {
      ALLOWED_TAGS: ['a', 'strong', 'em', 'br', 'p'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  if (data.link) {
    data.link = data.link.trim();
  }

  if (data.imagePath) {
    data.imagePath = data.imagePath.trim();
  }

  if (data.categoryId) {
    data.categoryId = data.categoryId.trim().toLowerCase();
  }

  // Приведение типов только для переданных полей
  if (data.sortOrder !== undefined && data.sortOrder !== null) {
    data.sortOrder = Number(data.sortOrder) || 0;
  }

  // Санитизация года, месяца и дня
  if (data.year !== undefined && data.year !== null && data.year !== '') {
    data.year = Number(data.year) || null;
  }

  if (data.month !== undefined && data.month !== null && data.month !== '') {
    data.month = Number(data.month) || null;
  }

  if (data.day !== undefined && data.day !== null && data.day !== '') {
    data.day = Number(data.day) || null;
  }

  if (data.isAi !== undefined) {
    data.isAi = Boolean(data.isAi);
  }
  
  if (data.isNew !== undefined) {
    data.isNew = Boolean(data.isNew);
  }
  
  if (data.isInProgress !== undefined) {
    data.isInProgress = Boolean(data.isInProgress);
  }
  
  if (data.isHidden !== undefined) {
    data.isHidden = Boolean(data.isHidden);
  }

  // Поддержка snake_case полей из базы данных
  if (data.is_ai !== undefined) {
    data.is_ai = Boolean(data.is_ai);
  }
  
  if (data.is_new !== undefined) {
    data.is_new = Boolean(data.is_new);
  }
  
  if (data.is_in_progress !== undefined) {
    data.is_in_progress = Boolean(data.is_in_progress);
  }
  
  if (data.is_hidden !== undefined) {
    data.is_hidden = Boolean(data.is_hidden);
  }

  req.body = data;
  next();
};

/**
 * Санитизация данных категории
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next функция
 */
const sanitizeCategory = (req, res, next) => {
  const data = req.body;

  // Санитизация строковых полей
  if (data.id) {
    data.id = data.id.trim().toLowerCase();
  }

  if (data.nameRu) {
    data.nameRu = DOMPurify.sanitize(data.nameRu.trim(), { ALLOWED_TAGS: [] });
  }

  if (data.nameEn) {
    data.nameEn = DOMPurify.sanitize(data.nameEn.trim(), { ALLOWED_TAGS: [] });
  }

  // Приведение типов
  if (data.sortOrder !== undefined && data.sortOrder !== null) {
    data.sortOrder = Number(data.sortOrder) || 0;
  } else {
    data.sortOrder = 0;
  }

  data.isHidden = Boolean(data.isHidden);

  req.body = data;
  next();
};

/**
 * Валидация данных навыка на сервере
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next функция
 */
const validateSkill = (req, res, next) => {
  const {
    nameRu,
    nameEn,
    iconPath,
    sortOrder,
    isHidden
  } = req.body;

  const errors = [];

  // Валидация названий
  if (!nameRu || typeof nameRu !== 'string' || !nameRu.trim()) {
    errors.push('Название на русском языке обязательно');
  } else {
    const trimmed = nameRu.trim();
    if (trimmed.length < 2) {
      errors.push('Название на русском должно содержать минимум 2 символа');
    } else if (trimmed.length > 50) {
      errors.push('Название на русском не должно превышать 50 символов');
    }
  }

  if (!nameEn || typeof nameEn !== 'string' || !nameEn.trim()) {
    errors.push('Название на английском языке обязательно');
  } else {
    const trimmed = nameEn.trim();
    if (trimmed.length < 2) {
      errors.push('Название на английском должно содержать минимум 2 символа');
    } else if (trimmed.length > 50) {
      errors.push('Название на английском не должно превышать 50 символов');
    }
  }

  // Валидация пути к иконке
  if (!iconPath || typeof iconPath !== 'string' || !iconPath.trim()) {
    errors.push('Путь к иконке обязателен');
  } else {
    const trimmedPath = iconPath.trim();
    
    // Проверка расширения файла или URL
    const isUrl = validator.isURL(trimmedPath, { protocols: ['http', 'https'] });
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const hasValidExtension = imageExtensions.some(ext => 
      trimmedPath.toLowerCase().endsWith(ext)
    );
    
    if (!isUrl && !hasValidExtension) {
      errors.push('Иконка должна быть валидным URL или иметь расширение: .jpg, .jpeg, .png, .webp, .gif, .svg');
    }

    // Проверка на потенциально опасные пути (только для локальных путей)
    if (!isUrl && (trimmedPath.includes('..') || trimmedPath.includes('\\'))) {
      errors.push('Путь к иконке содержит недопустимые символы');
    }
  }

  // Валидация порядка сортировки
  if (sortOrder !== undefined && sortOrder !== null) {
    const numSortOrder = Number(sortOrder);
    if (isNaN(numSortOrder) || numSortOrder < 0) {
      errors.push('Порядок сортировки должен быть неотрицательным числом');
    }
  }

  // Валидация булевых флагов
  if (isHidden !== undefined && typeof isHidden !== 'boolean') {
    errors.push('Флаг "Скрытый" должен быть булевым значением');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибки валидации данных',
        details: errors
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Санитизация данных навыка
 * @param {Object} data - Данные навыка для санитизации
 * @returns {Object} Санитизированные данные
 */
const sanitizeSkill = (data) => {
  const sanitized = {};

  // Санитизация строковых полей
  if (data.nameRu || data.name_ru) {
    const nameRu = data.nameRu || data.name_ru;
    sanitized.name_ru = DOMPurify.sanitize(nameRu.trim(), { ALLOWED_TAGS: [] });
  }

  if (data.nameEn || data.name_en) {
    const nameEn = data.nameEn || data.name_en;
    sanitized.name_en = DOMPurify.sanitize(nameEn.trim(), { ALLOWED_TAGS: [] });
  }

  if (data.iconPath || data.icon_path) {
    const iconPath = data.iconPath || data.icon_path;
    sanitized.icon_path = iconPath.trim();
  }

  // Приведение типов
  if (data.sortOrder !== undefined || data.sort_order !== undefined) {
    const sortOrder = data.sortOrder !== undefined ? data.sortOrder : data.sort_order;
    sanitized.sort_order = Number(sortOrder) || 0;
  }

  if (data.isHidden !== undefined || data.is_hidden !== undefined) {
    const isHidden = data.isHidden !== undefined ? data.isHidden : data.is_hidden;
    sanitized.is_hidden = Boolean(isHidden);
  }

  return sanitized;
};

/**
 * Валидация данных сертификата на сервере
 */
const validateCertificate = (req, res, next) => {
  const {
    titleRu,
    titleEn,
    descriptionRu,
    descriptionEn,
    imagePath,
    link,
    dateIssued,
    sortOrder,
    isHidden
  } = req.body;

  const errors = [];

  // Названия необязательны, но если переданы — валидируем
  if (titleRu && typeof titleRu === 'string' && titleRu.trim()) {
    if (titleRu.trim().length > 200) {
      errors.push('Название на русском не должно превышать 200 символов');
    }
  }

  if (titleEn && typeof titleEn === 'string' && titleEn.trim()) {
    if (titleEn.trim().length > 200) {
      errors.push('Название на английском не должно превышать 200 символов');
    }
  }

  // Описания необязательны
  if (descriptionRu && typeof descriptionRu === 'string' && descriptionRu.trim()) {
    if (descriptionRu.trim().length > 1000) {
      errors.push('Описание на русском не должно превышать 1000 символов');
    }
  }

  if (descriptionEn && typeof descriptionEn === 'string' && descriptionEn.trim()) {
    if (descriptionEn.trim().length > 1000) {
      errors.push('Описание на английском не должно превышать 1000 символов');
    }
  }

  // Путь к изображению обязателен
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
    errors.push('Изображение сертификата обязательно');
  } else {
    const trimmedPath = imagePath.trim();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const isUrl = validator.isURL(trimmedPath, { protocols: ['http', 'https'] });
    const hasValidExtension = imageExtensions.some(ext =>
      trimmedPath.toLowerCase().endsWith(ext)
    );

    if (!isUrl && !hasValidExtension) {
      errors.push('Изображение должно быть валидным URL или иметь расширение: .jpg, .jpeg, .png, .webp, .gif');
    }

    if (!isUrl && (trimmedPath.includes('..') || trimmedPath.includes('\\'))) {
      errors.push('Путь к изображению содержит недопустимые символы');
    }
  }

  // Ссылка необязательна
  if (link && typeof link === 'string' && link.trim()) {
    if (!validator.isURL(link.trim(), { protocols: ['http', 'https'] })) {
      errors.push('Ссылка должна быть валидным URL (http:// или https://)');
    }
  }

  // Дата необязательна
  if (dateIssued && typeof dateIssued === 'string' && dateIssued.trim()) {
    if (!validator.isDate(dateIssued.trim())) {
      errors.push('Дата должна быть в формате YYYY-MM-DD');
    }
  }

  if (sortOrder !== undefined && sortOrder !== null) {
    const numSortOrder = Number(sortOrder);
    if (isNaN(numSortOrder) || numSortOrder < 0) {
      errors.push('Порядок сортировки должен быть неотрицательным числом');
    }
  }

  if (isHidden !== undefined && typeof isHidden !== 'boolean') {
    errors.push('Флаг "Скрытый" должен быть булевым значением');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибки валидации данных',
        details: errors
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Санитизация данных сертификата
 */
const sanitizeCertificate = (data) => {
  const sanitized = {};

  const titleRu = data.titleRu || data.title_ru;
  if (titleRu) sanitized.title_ru = DOMPurify.sanitize(titleRu.trim(), { ALLOWED_TAGS: [] });

  const titleEn = data.titleEn || data.title_en;
  if (titleEn) sanitized.title_en = DOMPurify.sanitize(titleEn.trim(), { ALLOWED_TAGS: [] });

  const descriptionRu = data.descriptionRu || data.description_ru;
  if (descriptionRu) {
    sanitized.description_ru = DOMPurify.sanitize(descriptionRu.trim(), {
      ALLOWED_TAGS: ['a', 'strong', 'em', 'br'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  const descriptionEn = data.descriptionEn || data.description_en;
  if (descriptionEn) {
    sanitized.description_en = DOMPurify.sanitize(descriptionEn.trim(), {
      ALLOWED_TAGS: ['a', 'strong', 'em', 'br'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  const imagePath = data.imagePath || data.image_path;
  if (imagePath) sanitized.image_path = imagePath.trim();

  if (data.link) sanitized.link = data.link.trim();

  const dateIssued = data.dateIssued || data.date_issued;
  if (dateIssued) sanitized.date_issued = dateIssued.trim();

  const sortOrder = data.sortOrder !== undefined ? data.sortOrder : data.sort_order;
  if (sortOrder !== undefined) sanitized.sort_order = Number(sortOrder) || 0;

  const isHidden = data.isHidden !== undefined ? data.isHidden : data.is_hidden;
  if (isHidden !== undefined) sanitized.is_hidden = Boolean(isHidden);

  return sanitized;
};

module.exports = {
  validateProject,
  validateCategory,
  validateSkill,
  validateCertificate,
  sanitizeProject,
  sanitizeCategory,
  sanitizeSkill,
  sanitizeCertificate
};