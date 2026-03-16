# CORS Configuration для API лайков

## Обзор

API лайков настроен для работы с доменом `vidrimers.site` через CORS (Cross-Origin Resource Sharing). Это позволяет frontend приложению делать запросы к API, размещенному на том же домене, но на другом порту.

## Настройки CORS

### Разрешенные домены

В файле `.env` настроена переменная `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://vidrimers.site,https://www.vidrimers.site
```

### Конфигурация в server.js

```javascript
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
```

## Разрешенные домены

1. **http://localhost:3000** - для разработки
2. **https://vidrimers.site** - production домен
3. **https://www.vidrimers.site** - production домен с www

## Разрешенные методы

- GET - получение данных о лайках
- POST - добавление/удаление лайков
- PUT - обновление данных (зарезервировано)
- DELETE - удаление данных (зарезервировано)
- OPTIONS - preflight запросы

## Разрешенные заголовки

- Content-Type - для JSON запросов
- Authorization - для будущей аутентификации

## Тестирование CORS

### Автоматическое тестирование

Запустите тестовый скрипт:

```bash
# Сначала запустите сервер
node server/server.js

# В другом терминале запустите тесты
node server/test-cors.js
```

### Ручное тестирование с curl

#### Разрешенный домен (должен работать):

```bash
curl -v -H "Origin: https://vidrimers.site" http://localhost:1989/api/health
```

Ожидаемый результат:
- Статус: 200 OK
- Заголовок: `Access-Control-Allow-Origin: https://vidrimers.site`

#### Неразрешенный домен (должен блокироваться):

```bash
curl -v -H "Origin: https://malicious-site.com" http://localhost:1989/api/health
```

Ожидаемый результат:
- Статус: 403 Forbidden
- Тело ответа: `{"error":"CORS Error","message":"Запрос заблокирован CORS политикой"}`

#### Preflight запрос:

```bash
curl -v -X OPTIONS \
  -H "Origin: https://vidrimers.site" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:1989/api/likes/1
```

Ожидаемый результат:
- Статус: 204 No Content
- Заголовки:
  - `Access-Control-Allow-Origin: https://vidrimers.site`
  - `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type,Authorization`

## Безопасность

1. **Строгая проверка Origin** - только разрешенные домены могут делать запросы
2. **Credentials поддержка** - включена для будущих cookie/auth токенов
3. **Ограниченные методы** - только необходимые HTTP методы
4. **Ограниченные заголовки** - только необходимые заголовки

## Добавление нового домена

Чтобы добавить новый разрешенный домен:

1. Обновите переменную `ALLOWED_ORIGINS` в `.env`:
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,https://vidrimers.site,https://www.vidrimers.site,https://new-domain.com
   ```

2. Перезапустите сервер

3. Протестируйте новый домен:
   ```bash
   curl -v -H "Origin: https://new-domain.com" http://localhost:1989/api/health
   ```

## Troubleshooting

### Проблема: CORS ошибка в браузере

**Симптомы:**
```
Access to fetch at 'http://localhost:1989/api/likes/1' from origin 'https://vidrimers.site' has been blocked by CORS policy
```

**Решение:**
1. Проверьте, что домен добавлен в `ALLOWED_ORIGINS`
2. Убедитесь, что сервер запущен на правильном порту (1989)
3. Проверьте, что используется правильный протокол (http/https)

### Проблема: 403 Forbidden

**Причина:** Домен не в списке разрешенных

**Решение:** Добавьте домен в `ALLOWED_ORIGINS` в `.env` файле

### Проблема: Preflight запросы не работают

**Причина:** Неправильные заголовки в OPTIONS запросе

**Решение:** Убедитесь, что браузер отправляет правильные preflight заголовки