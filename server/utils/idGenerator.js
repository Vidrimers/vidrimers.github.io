/**
 * Серверные утилиты для автогенерации ID проектов
 */

/**
 * Генерирует следующий доступный ID для проекта в указанной категории
 * @param {string} categoryId - ID категории (pet, layout, commercial)
 * @param {Array} existingProjects - Массив существующих проектов
 * @returns {string} Сгенерированный ID
 */
function generateProjectId(categoryId, existingProjects = []) {
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
}

module.exports = { generateProjectId };
