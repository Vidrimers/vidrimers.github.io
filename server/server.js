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

const app = express();
const PORT = process.env.PORT || 1989;

// Глобальная переменная для базы данных
let db;

// Middleware
app.use(express.json());

// CORS настройки для локальной разработки
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API сервер работает',
    timestamp: new Date().toISOString()
  });
});

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
    const { userId } = req.body;
    
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
    
    const action = result.isLiked ? 'add' : 'remove';
    console.log(`${result.isLiked ? '➕' : '➖'} Лайк ${result.isLiked ? 'добавлен' : 'убран'} для ${projectId} пользователем ${userId}, всего: ${result.likes}`);
    
    res.json({ 
      likes: result.likes,
      isLiked: result.isLiked,
      projectId: projectId,
      userId: userId,
      action: action
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
    
    // Инициализируем базу данных
    db = await initDatabase();
    
    // Запускаем сервер
    app.listen(PORT, () => {
      console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
      console.log(`📊 API доступен на http://localhost:${PORT}/api`);
      console.log(`❤️  Эндпоинты лайков:`);
      console.log(`   GET  /api/health - проверка работы`);
      console.log(`   GET  /api/likes/:projectId - получить лайки`);
      console.log(`   POST /api/likes/:projectId - добавить/убрать лайк`);
      console.log(`   GET  /api/likes - все лайки`);
      console.log('');
      console.log('💡 Для остановки нажмите Ctrl+C');
    });
    
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал остановки...');
  
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Ошибка закрытия базы данных:', err.message);
      } else {
        console.log('✅ База данных закрыта');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Запускаем сервер
startServer();