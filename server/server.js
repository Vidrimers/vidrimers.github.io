require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 1989;

// Инициализация базы данных
let database;

// CORS настройки
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://vidrimers.site', 'https://www.vidrimers.site'];
    
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Не разрешено CORS политикой'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для обработки ошибок парсинга JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Некорректный JSON',
      message: 'Тело запроса содержит некорректный JSON. Ожидается объект с полем "action"'
    });
  }
  next(err);
});

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Инициализация приложения
async function initializeApp() {
  try {
    // Инициализируем базу данных
    database = new Database();
    await database.init();
    app.set('database', database);
    
    // Инициализируем Telegram (опционально)
    try {
      const Telegram = require('./telegram');
      const telegram = new Telegram();
      app.set('telegram', telegram);
      console.log('Telegram бот инициализирован');
    } catch (error) {
      console.log('Telegram бот не настроен (это нормально для разработки)');
    }
    
    console.log('Приложение инициализировано успешно');
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);
    process.exit(1);
  }
}

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// API маршруты
app.use('/api/likes', require('./routes/likes'));

// Обработка 404 для API
app.use('/api', (req, res) => {
  // Если маршрут не найден, возвращаем 404
  return res.status(404).json({
    error: 'Endpoint не найден',
    message: `API endpoint ${req.path} не существует`
  });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Необработанная ошибка:', error);
  
  if (error.message === 'Не разрешено CORS политикой') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Запрос заблокирован CORS политикой'
    });
  }
  
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nПолучен сигнал SIGINT. Закрываем сервер...');
  
  if (database) {
    database.close();
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Получен сигнал SIGTERM. Закрываем сервер...');
  
  if (database) {
    database.close();
  }
  
  process.exit(0);
});

// Запуск сервера
async function startServer() {
  await initializeApp();
  
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`🏥 Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`💾 База данных: ${process.env.DB_PATH || './database/vidrimers.db'}`);
    console.log(`🌍 Окружение: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Запускаем сервер только если файл запущен напрямую
if (require.main === module) {
  startServer().catch(error => {
    console.error('Ошибка запуска сервера:', error);
    process.exit(1);
  });
}

module.exports = app;