#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки CORS настроек
 * Использование: node server/test-cors.js
 */

const http = require('http');

const testCORS = (origin, expectedStatus = 200) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 1989,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Origin': origin,
        'User-Agent': 'CORS-Test-Script'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          origin,
          status: res.statusCode,
          headers: res.headers,
          body: data,
          expected: expectedStatus,
          passed: res.statusCode === expectedStatus
        };
        resolve(result);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
};

async function runTests() {
  console.log('🧪 Тестирование CORS настроек для API лайков...\n');
  
  const tests = [
    { origin: 'https://vidrimers.site', expected: 200 },
    { origin: 'https://www.vidrimers.site', expected: 200 },
    { origin: 'http://localhost:3000', expected: 200 },
    { origin: 'https://malicious-site.com', expected: 403 },
    { origin: 'https://example.com', expected: 403 }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await testCORS(test.origin, test.expected);
      
      if (result.passed) {
        console.log(`✅ ${test.origin} - статус ${result.status} (ожидался ${test.expected})`);
        if (result.status === 200) {
          console.log(`   CORS заголовок: ${result.headers['access-control-allow-origin'] || 'отсутствует'}`);
        }
        passed++;
      } else {
        console.log(`❌ ${test.origin} - статус ${result.status} (ожидался ${test.expected})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.origin} - ошибка: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Результаты: ${passed} прошли, ${failed} провалились`);
  
  if (failed === 0) {
    console.log('🎉 Все CORS тесты прошли успешно!');
    process.exit(0);
  } else {
    console.log('⚠️  Некоторые CORS тесты провалились');
    process.exit(1);
  }
}

// Проверяем, что сервер запущен
const checkServer = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 1989,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      resolve(true);
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
};

// Запуск тестов
checkServer()
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.log('❌ Сервер не запущен на порту 1989');
    console.log('💡 Запустите сервер: node server/server.js');
    process.exit(1);
  });