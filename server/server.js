/**
 * Express сервер для API лайков
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { 
  initDatabase, 
  projectExists,
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
const { authRateLimiter, apiRateLimiter, uploadRateLimiter, csrfTokenEndpoint } = require('./middleware/security');

// Импортируем роуты
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const categoriesRoutes = require('./routes/categories');
const skillsRoutes = require('./routes/skills');
const certificatesRoutes = require('./routes/certificates');
const aboutRoutes = require('./routes/about');
const contactsRoutes = require('./routes/contacts');
const filesRoutes = require('./routes/files');
const settingsRoutes = require('./routes/settings');
const donateWalletsRoutes = require('./routes/donate-wallets');
const footerRoutes = require('./routes/footer');

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

// Статическая раздача загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
    status: 'OK', 
    port: PORT.toString(),
    message: 'API сервер работает',
    timestamp: new Date().toISOString(),
    services: {
      likes: db ? 'connected' : 'disconnected',
      cms: cmsDb ? 'connected' : 'disconnected',
      telegram: telegram ? 'enabled' : 'disabled'
    }
  });
});

// Подключаем роуты аутентификации (с rate limiting)
app.use('/api/auth', authRateLimiter, authRoutes);

// CSRF токен эндпоинт (без rate limiting — нужен для инициализации)
app.get('/api/csrf-token', csrfTokenEndpoint);

// Подключаем роуты управления контентом (с общим rate limiting)
app.use('/api/projects', apiRateLimiter, projectsRoutes);
app.use('/api/categories', apiRateLimiter, categoriesRoutes);
app.use('/api/skills', apiRateLimiter, skillsRoutes);
app.use('/api/certificates', apiRateLimiter, certificatesRoutes);
app.use('/api/about', apiRateLimiter, aboutRoutes);
app.use('/api/contacts', apiRateLimiter, contactsRoutes);
app.use('/api/files', uploadRateLimiter, filesRoutes);
app.use('/api/settings', apiRateLimiter, settingsRoutes);
app.use('/api/donate-wallets', apiRateLimiter, donateWalletsRoutes);
app.use('/api/footer', apiRateLimiter, footerRoutes);

// Получить лайки для конкретного проекта
app.get('/api/likes/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID обязателен' 
      });
    }
    
    // Валидация формата projectId
    const validIdPattern = /^(pet|layout)-\d+$/;
    if (!validIdPattern.test(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный формат Project ID'
      });
    }
    
    // Проверяем существует ли проект
    const exists = await projectExists(db, projectId);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Проект не найден'
      });
    }
    
    const likesCount = await getLikes(db, projectId);
    
    // Если передан userId, проверяем лайкал ли пользователь
    let isLiked = false;
    if (userId) {
      isLiked = await isUserLiked(db, userId, projectId);
    }
    
    res.json({ 
      success: true,
      likes: likesCount,
      projectId: projectId,
      isLiked: isLiked
    });
    
  } catch (error) {
    console.error('Ошибка получения лайков:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера при получении лайков' 
    });
  }
});

// Переключить лайк пользователя
app.post('/api/likes/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, projectTitle, action } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID обязателен' 
      });
    }
    
    // Валидация формата projectId
    const validIdPattern = /^(pet|layout)-\d+$/;
    if (!validIdPattern.test(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный формат Project ID'
      });
    }
    
    // Проверяем существует ли проект
    const exists = await projectExists(db, projectId);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Проект не найден'
      });
    }
    
    // Поддерживаем два формата: старый (с userId) и новый (с action)
    if (action) {
      // Новый формат для тестов
      if (!action || typeof action !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Action обязателен и должен быть строкой'
        });
      }
      
      if (action !== 'add' && action !== 'remove') {
        return res.status(400).json({
          success: false,
          error: 'Action должен быть "add" или "remove"'
        });
      }
      
      let newLikes;
      if (action === 'add') {
        newLikes = await addLike(db, projectId);
      } else {
        newLikes = await removeLike(db, projectId);
      }
      
      res.json({
        success: true,
        likes: newLikes,
        projectId: projectId,
        action: action
      });
      
    } else if (userId) {
      // Старый формат с userId
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
        success: true,
        likes: result.likes,
        isLiked: result.isLiked,
        projectId: projectId,
        userId: userId,
        action: result.isLiked ? 'add' : 'remove'
      });
      
    } else {
      return res.status(400).json({
        success: false,
        error: 'Требуется userId или action'
      });
    }
    
  } catch (error) {
    console.error('Ошибка переключения лайка:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера при переключении лайка' 
    });
  }
});

// Получить все лайки
app.get('/api/likes', async (req, res) => {
  try {
    const allLikes = await getAllLikes(db);
    
    res.json({ 
      success: true,
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

// Раздача статики из dist/
app.use(express.static(path.join(__dirname, '..', 'dist')));

// SPA fallback — все не-API маршруты отдают index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
    await migrationService.initialize();
    
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
      console.log(`   POST /api/auth/logout - выход из системы`);
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
      console.log(`   GET  /api/skills - получить навыки`);
      console.log(`   GET  /api/skills/:id - получить навык по ID`);
      console.log(`   GET  /api/certificates - получить сертификаты`);
      console.log(`   GET  /api/certificates/:id - получить сертификат по ID`);
      console.log(`   GET  /api/about - получить контент "Обо мне"`);
      console.log(`   GET  /api/contacts - получить контактную информацию`);
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