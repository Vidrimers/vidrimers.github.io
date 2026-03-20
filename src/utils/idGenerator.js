/**
 * Утилиты для автогенерации ID проектов
 */

/**
 * Генерирует следующий доступный ID для проекта в указанной категории
 * @param {string} categoryId - ID категории (pet, layout, commercial)
 * @param {Array} existingProjects - Массив существующих проектов
 * @returns {string} Сгенерированный ID
 */
export const generateProjectId = (categoryId, existingProjects = []) => {
  if (!categoryId) {
    throw new Error('Категория обязательна для генерации ID');
  }

  // Фильтруем проекты по категории
  const categoryProjects = existingProjects.filter(project => 
    project.id && project.id.startsWith(`${categoryId}-`)
  );

  // Извлекаем номера из существующих ID
  const existingNumbers = categoryProjects
    .map(project => {
      const match = project.id.match(new RegExp(`^${categoryId}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num) && num > 0);

  // Находим следующий доступный номер
  let nextNumber = 1;
  
  if (existingNumbers.length > 0) {
    // Сортируем номера по возрастанию
    existingNumbers.sort((a, b) => a - b);
    
    // Ищем первый пропуск в последовательности или берем максимальный + 1
    for (let i = 0; i < existingNumbers.length; i++) {
      if (existingNumbers[i] !== i + 1) {
        nextNumber = i + 1;
        break;
      }
    }
    
    // Если пропусков нет, берем следующий после максимального
    if (nextNumber === 1) {
      nextNumber = Math.max(...existingNumbers) + 1;
    }
  }

  return `${categoryId}-${nextNumber}`;
};

/**
 * Проверяет, доступен ли указанный ID
 * @param {string} id - ID для проверки
 * @param {Array} existingProjects - Массив существующих проектов
 * @returns {boolean} true если ID доступен
 */
export const isIdAvailable = (id, existingProjects = []) => {
  if (!id || !id.trim()) {
    return false;
  }

  return !existingProjects.some(project => project.id === id.trim());
};

/**
 * Валидирует формат ID проекта
 * @param {string} id - ID для валидации
 * @returns {Object} Результат валидации
 */
export const validateProjectIdFormat = (id) => {
  if (!id || !id.trim()) {
    return {
      isValid: false,
      error: 'ID не может быть пустым'
    };
  }

  const trimmedId = id.trim();
  
  // Проверяем формат: category-number (любая категория)
  const pattern = /^[a-z0-9]+-\d+$/;
  
  if (!pattern.test(trimmedId)) {
    return {
      isValid: false,
      error: 'ID должен быть в формате "категория-номер", например "pet-1" или "tg-1"'
    };
  }

  // Извлекаем категорию и номер
  const lastDash = trimmedId.lastIndexOf('-');
  const category = trimmedId.substring(0, lastDash);
  const numberStr = trimmedId.substring(lastDash + 1);
  const number = parseInt(numberStr, 10);

  if (number <= 0) {
    return {
      isValid: false,
      error: 'Номер в ID должен быть положительным числом'
    };
  }

  return {
    isValid: true,
    category,
    number
  };
};

/**
 * Получает следующий рекомендуемый ID для категории
 * @param {string} categoryId - ID категории
 * @param {Array} existingProjects - Массив существующих проектов
 * @returns {Object} Информация о рекомендуемом ID
 */
export const getRecommendedId = (categoryId, existingProjects = []) => {
  try {
    const recommendedId = generateProjectId(categoryId, existingProjects);
    const validation = validateProjectIdFormat(recommendedId);
    
    return {
      id: recommendedId,
      isValid: validation.isValid,
      category: validation.category,
      number: validation.number,
      isAvailable: isIdAvailable(recommendedId, existingProjects)
    };
  } catch (error) {
    return {
      id: null,
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Получает статистику использования ID по категориям
 * @param {Array} existingProjects - Массив существующих проектов
 * @returns {Object} Статистика по категориям
 */
export const getIdStatistics = (existingProjects = []) => {
  const stats = {};
  const projectsByCategory = {};

  // Динамически группируем проекты по категориям
  existingProjects.forEach(project => {
    if (!project.id) return;
    
    const validation = validateProjectIdFormat(project.id);
    if (validation.isValid) {
      if (!projectsByCategory[validation.category]) {
        projectsByCategory[validation.category] = [];
        stats[validation.category] = { count: 0, maxNumber: 0, gaps: [] };
      }
      projectsByCategory[validation.category].push(validation.number);
    }
  });

  // Вычисляем статистику для каждой категории
  Object.keys(projectsByCategory).forEach(category => {
    const numbers = projectsByCategory[category].sort((a, b) => a - b);
    
    stats[category].count = numbers.length;
    stats[category].maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    
    // Находим пропуски в нумерации
    const gaps = [];
    for (let i = 1; i <= stats[category].maxNumber; i++) {
      if (!numbers.includes(i)) {
        gaps.push(i);
      }
    }
    stats[category].gaps = gaps;
  });

  return stats;
};