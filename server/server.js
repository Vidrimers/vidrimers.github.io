/**
 * Express сервер для API лайков
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { 
  initDatabase, 
  getLikes, 
  addLike, 
  removeLike, 
  getAllLikes,
  isUserLiked,
  toggleUserLike
} = require('./database');

// Импортируем Telegram модуль
const Telegram = require('./telegram');

// Импортируем CMS сервисы
const { initializeServices, closeServices } = require('./services');
const { requireAuth, optionalAuth } = require('./middleware/auth');

// Импортируем роуты
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const categoriesRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 1989;

// Глобальная переменная для базы данных
let db;

// Глобальная переменная для CMS базы данных
let cmsDb;

// Инициализируем Telegram
let telegram;
try {
  telegram = new Telegram();
  console.log('📱 Telegram модуль инициализирован');
} catch (error) {
  console.warn('⚠️  Telegram не настроен:', error.message);
  telegram = null;
}

// Middleware
app.use(express.json());

// CORS настройки для локальной разработки и devtun
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://vidrimers.ru.tuna.am',
    'http://vidrimers.ru.tuna.am'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Логирование только ошибок и важных событий
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   next();
// });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API сервер работает',
    timestamp: new Date().toISOString(),
    services: {
      likes: db ? 'connected' : 'disconnected',
      cms: cmsDb ? 'connected' : 'disconnected',
      telegram: telegram ? 'enabled' : 'disabled'
    }
  });
});

// Подключаем роуты аутентификации
app.use('/api/auth', authRoutes);

// Подключаем роуты управления контентом
app.use('/api/projects', projectsRoutes);
app.use('/api/categories', categoriesRoutes);

// Получить лайки для конкретного проекта
app.get('/api/likes/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ 
        error: 'Project ID обязателен' 
      });
    }
    
    const likesCount = await getLikes(db, projectId);
    
    // Если передан userId, проверяем лайкал ли пользователь
    let isLiked = false;
    if (userId) {
      isLiked = await isUserLiked(db, userId, projectId);
    }
    
    res.json({ 
      likes: likesCount,
      projectId: projectId,
      isLiked: isLiked
    });
    
  } catch (error) {
    console.error('Ошибка получения лайков:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении лайков' 
    });
  }
});

// Переключить лайк пользователя
app.post('/api/likes/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, projectTitle } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ 
        error: 'Project ID обязателен' 
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID обязателен' 
      });
    }
    
    const result = await toggleUserLike(db, userId, projectId);
    
    // Отправляем уведомление в Telegram только при добавлении лайка
    if (telegram && result.isLiked) {
      try {
        await telegram.sendLikeNotification(projectId, result.likes, projectTitle);
        console.log(`📱 Telegram уведомление отправлено для ${projectId}`);
      } catch (telegramError) {
        console.error('❌ Ошибка отправки в Telegram:', telegramError.message);
        // Не прерываем выполнение, если Telegram недоступен
      }
    }
    
    res.json({ 
      likes: result.likes,
      isLiked: result.isLiked,
      projectId: projectId,
      userId: userId,
      action: result.isLiked ? 'add' : 'remove'
    });
    
  } catch (error) {
    console.error('Ошибка переключения лайка:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при переключении лайка' 
    });
  }
});

// Получить все лайки
app.get('/api/likes', async (req, res) => {
  try {
    const allLikes = await getAllLikes(db);
    
    res.json({ 
      likes: allLikes,
      total: Object.keys(allLikes).length
    });
    
  } catch (error) {
    console.error('Ошибка получения всех лайков:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении всех лайков' 
    });
  }
});

// Тестовый эндпоинт для Telegram
app.post('/api/telegram/test', async (req, res) => {
  try {
    if (!telegram) {
      return res.status(503).json({
        error: 'Telegram не настроен',
        message: 'Проверьте переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID'
      });
    }
    
    const success = await telegram.sendTestMessage();
    
    if (success) {
      res.json({
        success: true,
        message: 'Тестовое сообщение отправлено в Telegram'
      });
    } else {
      res.status(500).json({
        error: 'Не удалось отправить тестовое сообщение'
      });
    }
    
  } catch (error) {
    console.error('Ошибка тестирования Telegram:', error);
    res.status(500).json({
      error: 'Ошибка при тестировании Telegram',
      message: error.message
    });
  }
});

// Уведомление об открытии модалки донатов
app.post('/api/telegram/donate-modal', async (req, res) => {
  try {
    if (!telegram) {
      return res.status(503).json({
        error: 'Telegram не настроен'
      });
    }
    
    const success = await telegram.sendDonateModalNotification();
    
    if (success) {
      res.json({
        success: true,
        message: 'Уведомление о донатах отправлено'
      });
    } else {
      res.status(500).json({
        error: 'Не удалось отправить уведомление о донатах'
      });
    }
    
  } catch (error) {
    console.error('Ошибка отправки уведомления о донатах:', error);
    res.status(500).json({
      error: 'Ошибка отправки уведомления о донатах',
      message: error.message
    });
  }
});

// Уведомление о копировании адреса доната
app.post('/api/telegram/donate-copy', async (req, res) => {
  try {
    const { walletName } = req.body;
    
    if (!walletName) {
      return res.status(400).json({
        error: 'Название кошелька обязательно'
      });
    }
    
    if (!telegram) {
      return res.status(503).json({
        error: 'Telegram не настроен'
      });
    }
    
    const success = await telegram.sendDonateAddressCopyNotification(walletName);
    
    if (success) {
      res.json({
        success: true,
        message: 'Уведомление о копировании отправлено'
      });
    } else {
      res.status(500).json({
        error: 'Не удалось отправить уведомление о копировании'
      });
    }
    
  } catch (error) {
    console.error('Ошибка отправки уведомления о копировании:', error);
    res.status(500).json({
      error: 'Ошибка отправки уведомления о копировании',
      message: error.message
    });
  }
});

// Уведомление о клике по проекту в портфолио
app.post('/api/telegram/portfolio-click', async (req, res) => {
  try {
    const { projectId, projectTitle } = req.body;
    
    if (!projectId) {
      return res.status(400).json({
        error: 'ID проекта обязателен'
      });
    }
    
    if (!telegram) {
      return res.status(503).json({
        error: 'Telegram не настроен'
      });
    }
    
    const success = await telegram.sendPortfolioClickNotification(projectId, projectTitle);
    
    if (success) {
      res.json({
        success: true,
        message: 'Уведомление о клике отправлено'
      });
    } else {
      res.status(500).json({
        error: 'Не удалось отправить уведомление о клике'
      });
    }
    
  } catch (error) {
    console.error('Ошибка отправки уведомления о клике:', error);
    res.status(500).json({
      error: 'Ошибка отправки уведомления о клике',
      message: error.message
    });
  }
});

// Получить информацию о Telegram боте
app.get('/api/telegram/info', async (req, res) => {
  try {
    if (!telegram) {
      return res.json({
        enabled: false,
        error: 'Telegram не настроен'
      });
    }
    
    const info = await telegram.getBotInfo();
    res.json(info);
    
  } catch (error) {
    console.error('Ошибка получения информации о боте:', error);
    res.status(500).json({
      error: 'Ошибка получения информации о боте',
      message: error.message
    });
  }
});

// 404 для неизвестных маршрутов
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Маршрут не найден',
    path: req.originalUrl
  });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Необработанная ошибка:', error);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера' 
  });
});

// Инициализация и запуск сервера
async function startServer() {
  try {
    console.log('🚀 Запуск сервера лайков...');
    
    // Инициализируем базу данных лайков
    db = await initDatabase();
    
    // Инициализируем CMS сервисы
    const { dbService } = await initializeServices();
    cmsDb = dbService.db;
    
    // Проверяем, нужна ли миграция данных
    const MigrationService = require('./services/migrationService');
    const migrationService = new MigrationService();
    const needsMigration = await migrationService.needsMigration();
    
    if (needsMigration) {
      console.log('🔄 Обнаружена пустая база данных, запускаем миграцию...');
      await migrationService.migrateAllData();
    } else {
      console.log('✅ База данных уже содержит данные, миграция не требуется');
    }
    
    await migrationService.close();
    
    // Запускаем сервер
    app.listen(PORT, () => {
      console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
      console.log(`📊 API доступен на http://localhost:${PORT}/api`);
      console.log(`❤️  Эндпоинты лайков:`);
      console.log(`   GET  /api/health - проверка работы`);
      console.log(`   GET  /api/likes/:projectId - получить лайки`);
      console.log(`   POST /api/likes/:projectId - добавить/убрать лайк`);
      console.log(`   GET  /api/likes - все лайки`);
      console.log(`🔐 Эндпоинты аутентификации:`);
      console.log(`   POST /api/auth/request-code - запросить код подтверждения`);
      console.log(`   POST /api/auth/verify-code - проверить код и создать сессию`);
      console.log(`   POST /api/auth/validate-session - проверить сессию`);
      console.log(`   GET  /api/auth/stats - статистика (только dev)`);
      console.log(`📂 Эндпоинты управления контентом:`);
      console.log(`   GET  /api/categories - получить категории`);
      console.log(`   POST /api/categories - создать категорию (админ)`);
      console.log(`   PUT  /api/categories/:id - обновить категорию (админ)`);
      console.log(`   DELETE /api/categories/:id - удалить категорию (админ)`);
      console.log(`   GET  /api/projects - получить проекты`);
      console.log(`   POST /api/projects - создать проект (админ)`);
      console.log(`   PUT  /api/projects/:id - обновить проект (админ)`);
      console.log(`   DELETE /api/projects/:id - удалить проект (админ)`);
      console.log(`📱 Эндпоинты Telegram:`);
      console.log(`   POST /api/telegram/test - тестовое сообщение`);
      console.log(`   GET  /api/telegram/info - информация о боте`);
      console.log(`   POST /api/telegram/donate-modal - уведомление об открытии донатов`);
      console.log(`   POST /api/telegram/donate-copy - уведомление о копировании адреса`);
      console.log(`   POST /api/telegram/portfolio-click - уведомление о клике по проекту`);
      console.log('');
      console.log('💡 Для остановки нажмите Ctrl+C');
    });
    
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал остановки...');
  
  const closePromises = [];
  
  if (db) {
    closePromises.push(new Promise((resolve) => {
      db.close((err) => {
        if (err) {
          console.error('Ошибка закрытия базы данных лайков:', err.message);
        } else {
          console.log('✅ База данных лайков закрыта');
        }
        resolve();
      });
    }));
  }
  
  if (cmsDb) {
    closePromises.push(closeServices().catch(err => {
      console.error('Ошибка закрытия CMS сервисов:', err.message);
    }));
  }
  
  try {
    await Promise.all(closePromises);
  } catch (error) {
    console.error('Ошибка при закрытии сервисов:', error);
  }
  
  process.exit(0);
});

// Запускаем сервер
startServer();