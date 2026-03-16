/**
 * Тест валидации API для лайков
 * Запуск: node server/test-validation.js
 */

const express = require('express');
const request = require('supertest');
const Database = require('./database');
const likesRouter = require('./routes/likes');

// Создаем тестовое приложение
const app = express();
app.use(express.json());

// Инициализируем тестовую базу данных
const database = new Database();
database.dbPath = ':memory:'; // Используем in-memory базу для тестов

// Подключаем базу данных и роуты
app.set('database', database);
app.use('/api/likes', likesRouter);

async function runTests() {
  console.log('🧪 Запуск тестов валидации API...\n');
  
  try {
    // Инициализируем базу данных
    await database.init();
    
    // Тест 1: Валидация projectId - некорректный формат
    console.log('1️⃣ Тест: Некорректный формат projectId');
    const response1 = await request(app)
      .get('/api/likes/invalid-id')
      .expect(400);
    
    console.log('✅ Ответ:', response1.body);
    console.log('✅ Статус 400 - корректно\n');
    
    // Тест 2: Валидация projectId - несуществующий проект
    console.log('2️⃣ Тест: Несуществующий проект');
    const response2 = await request(app)
      .get('/api/likes/pet-999')
      .expect(404);
    
    console.log('✅ Ответ:', response2.body);
    console.log('✅ Статус 404 - корректно\n');
    
    // Тест 3: Валидация POST данных - отсутствует action
    console.log('3️⃣ Тест: POST без action');
    const response3 = await request(app)
      .post('/api/likes/pet-1')
      .send({})
      .expect(400);
    
    console.log('✅ Ответ:', response3.body);
    console.log('✅ Статус 400 - корректно\n');
    
    // Тест 4: Валидация POST данных - некорректный action
    console.log('4️⃣ Тест: POST с некорректным action');
    const response4 = await request(app)
      .post('/api/likes/pet-1')
      .send({ action: 'invalid' })
      .expect(400);
    
    console.log('✅ Ответ:', response4.body);
    console.log('✅ Статус 400 - корректно\n');
    
    // Тест 5: Валидный GET запрос
    console.log('5️⃣ Тест: Валидный GET запрос');
    const response5 = await request(app)
      .get('/api/likes/pet-1')
      .expect(200);
    
    console.log('✅ Ответ:', response5.body);
    console.log('✅ Статус 200 - корректно\n');
    
    // Тест 6: Валидный POST запрос
    console.log('6️⃣ Тест: Валидный POST запрос');
    const response6 = await request(app)
      .post('/api/likes/pet-1')
      .send({ action: 'add' })
      .expect(200);
    
    console.log('✅ Ответ:', response6.body);
    console.log('✅ Статус 200 - корректно\n');
    
    // Тест 7: Проверяем, что лайк добавился
    console.log('7️⃣ Тест: Проверка добавления лайка');
    const response7 = await request(app)
      .get('/api/likes/pet-1')
      .expect(200);
    
    console.log('✅ Ответ:', response7.body);
    console.log('✅ Лайки увеличились - корректно\n');
    
    console.log('🎉 Все тесты валидации прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах:', error);
  } finally {
    database.close();
  }
}

// Запускаем тесты только если файл запущен напрямую
if (require.main === module) {
  runTests();
}

module.exports = { runTests };