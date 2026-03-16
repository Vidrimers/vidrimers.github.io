const express = require('express');
const router = express.Router();

// Список валидных ID проектов из portfolioData.js
const VALID_PROJECT_IDS = [
  'pet-1', 'pet-2', 'pet-3',
  'layout-1', 'layout-2'
];

// Middleware для валидации projectId
const validateProjectId = (req, res, next) => {
  const projectId = req.params.projectId;
  
  // Проверяем, что projectId не пустой
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({
      error: 'Некорректный ID проекта',
      message: 'ID проекта должен быть непустой строкой'
    });
  }
  
  // Проверяем длину projectId (защита от DoS атак)
  if (projectId.length > 50) {
    return res.status(400).json({
      error: 'Некорректный ID проекта',
      message: 'ID проекта слишком длинный (максимум 50 символов)'
    });
  }
  
  // Проверяем, что projectId соответствует валидному формату
  const projectIdPattern = /^(pet|layout)-\d+$/;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({
      error: 'Некорректный формат ID проекта',
      message: 'ID проекта должен иметь формат "pet-N" или "layout-N", где N - положительное число'
    });
  }
  
  // Проверяем, что projectId существует в списке валидных проектов
  if (!VALID_PROJECT_IDS.includes(projectId)) {
    return res.status(404).json({
      error: 'Проект не найден',
      message: `Проект с ID "${projectId}" не существует`
    });
  }
  
  req.projectId = projectId;
  next();
};

// Middleware для валидации данных в теле POST запроса
const validatePostData = (req, res, next) => {
  // Проверяем, что тело запроса существует и не null
  if (req.body === null || req.body === undefined) {
    return res.status(400).json({
      error: 'Некорректные данные',
      message: 'Тело запроса не может быть пустым. Ожидается JSON с полем "action"'
    });
  }
  
  // Проверяем, что тело запроса является объектом
  if (typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      error: 'Некорректные данные',
      message: 'Тело запроса должно быть JSON объектом'
    });
  }
  
  const { action } = req.body;
  
  // Проверяем, что action указан и корректен
  if (!action || typeof action !== 'string') {
    return res.status(400).json({
      error: 'Некорректное действие',
      message: 'Поле "action" обязательно и должно быть строкой'
    });
  }
  
  if (!['add', 'remove'].includes(action)) {
    return res.status(400).json({
      error: 'Некорректное действие',
      message: 'Действие должно быть "add" или "remove"'
    });
  }
  
  next();
};

// GET /api/likes/:projectId - получить количество лайков
router.get('/:projectId', validateProjectId, async (req, res) => {
  try {
    const { projectId } = req;
    const database = req.app.get('database');
    
    const likesCount = await database.getLikes(projectId);
    
    res.json({
      projectId,
      likes: likesCount,
      success: true
    });
  } catch (error) {
    console.error('Ошибка получения лайков:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось получить количество лайков'
    });
  }
});

// POST /api/likes/:projectId - добавить/убрать лайк
router.post('/:projectId', validateProjectId, validatePostData, async (req, res) => {
  try {
    const { projectId } = req;
    const { action } = req.body;
    const database = req.app.get('database');
    
    let newLikesCount;
    
    if (action === 'add') {
      newLikesCount = await database.addLike(projectId);
    } else {
      newLikesCount = await database.removeLike(projectId);
    }
    
    // Отправляем уведомление в Telegram (если настроен)
    const telegram = req.app.get('telegram');
    if (telegram && action === 'add') {
      try {
        await telegram.sendLikeNotification(projectId, newLikesCount);
      } catch (telegramError) {
        console.error('Ошибка отправки в Telegram:', telegramError);
        // Не прерываем выполнение, если Telegram недоступен
      }
    }
    
    res.json({
      projectId,
      likes: newLikesCount,
      action,
      success: true
    });
  } catch (error) {
    console.error('Ошибка обновления лайков:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось обновить количество лайков'
    });
  }
});

// GET /api/likes - получить все лайки
router.get('/', async (req, res) => {
  // Проверяем, что это именно запрос к корню, а не пустой projectId
  if (req.path === '/') {
    try {
      const database = req.app.get('database');
      const allLikes = await database.getAllLikes();
      
      // Преобразуем в объект для удобства
      const likesMap = {};
      allLikes.forEach(item => {
        likesMap[item.project_id] = item.likes_count;
      });
      
      res.json({
        likes: likesMap,
        total: allLikes.length,
        success: true
      });
    } catch (error) {
      console.error('Ошибка получения всех лайков:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        message: 'Не удалось получить данные о лайках'
      });
    }
  } else {
    // Если путь не корневой, значит это некорректный запрос
    res.status(400).json({
      error: 'Некорректный запрос',
      message: 'Для получения лайков конкретного проекта используйте /api/likes/{projectId}'
    });
  }
});

module.exports = router;