
# Yaroslav Shiryakov

<img src="https://vidrimers.github.io/assets/img/photo.jpg" width=600>

Современное портфолио-приложение, построенное на React и Vite с компонентной архитектурой и поддержкой мультиязычности.

## 🚀 Технологии

- **React 19** - Современная библиотека для построения UI
- **Vite** - Быстрый сборщик и dev-сервер
- **CSS Modules** - Изолированные стили для компонентов
- **Sass** - Препроцессор CSS
- **Vitest** - Фреймворк для тестирования
- **Express.js** - Backend сервер с REST API
- **SQLite** - База данных для хранения контента
- **JWT + Telegram Bot** - Аутентификация через Telegram


## 📝 Как добавить новый проект в портфолио

1. Откройте файл `src/data/portfolioData.js`
2. Добавьте новый объект в массив `portfolioProjects`:

```javascript
{
  id: 7, // следующий уникальный ID
  title: 'Название проекта',
  description: 'Описание проекта на русском языке',
  image: '/assets/img/portfolio/project-image.jpg',
  link: 'https://example.com',
  category: 'pet' // 'pet' для собственных проектов, 'layout' для учебных
}
```

3. Добавьте изображение проекта в папку `public/assets/img/portfolio/`
4. Сохраните файл - проект автоматически появится в портфолио!

## 🌐 Мультиязычность

Приложение поддерживает русский и английский языки:

- Переводы хранятся в `src/data/translations/`
- Переключение языка через кнопку в header
- Выбранный язык сохраняется в localStorage

### Добавление нового перевода

1. Откройте `src/data/translations/ru.json` и `en.json`
2. Добавьте новый ключ в оба файла:

```json
{
  "newSection": {
    "title": "Заголовок",
    "description": "Описание"
  }
}
```

3. Используйте в компоненте через LanguageContext

## 🧪 Тестирование

Проект использует Vitest для unit-тестирования:

```bash
# Запуск всех тестов
npm run test

# Запуск тестов в watch режиме
npm run test:watch
```

Тесты находятся рядом с компонентами (например, `Hero.test.jsx`)

## 🚀 Деплой

Деплой на сервер через скрипт (выполняется на сервере):

```bash
./deploy.sh
```

Скрипт делает `git pull origin master`, `npm install`, `npm run build` и перезапускает PM2.

Сайт доступен по адресу: [https://vidrimers.site](https://vidrimers.site)

## 📱 Адаптивность

Приложение полностью адаптивно и корректно работает на:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

## 🎨 Стилизация

- **CSS Modules** - изолированные стили для каждого компонента
- **Sass** - использование переменных, миксинов и вложенности
- **Автопрефиксы** - автоматическое добавление vendor prefixes

## 📞 Контакты

**Email:** vidrimers2@gmail.com  
**Telegram:** [@Vidrimers](https://t.me/Vidrimers)  
**Discord:** Yaro Shiryakov (@Vidrimers)  
**LinkedIn:** [Yaroslav Shiryakov](https://www.linkedin.com/in/yaroslav-shiryakov-79a426183/)

---

## 🔧 Разработка

### Архитектурные принципы

1. **Компонентный подход** - каждая секция это отдельный React компонент
2. **Разделение данных и представления** - данные хранятся в отдельных файлах
3. **CSS Modules** - изолированные стили без конфликтов
4. **Мультиязычность** - поддержка нескольких языков через Context API

### Добавление нового компонента

1. Создайте папку в `src/components/`
2. Создайте файлы `ComponentName.jsx` и `ComponentName.module.css`
3. Импортируйте и используйте в `App.jsx`

Пример:
```jsx
// src/components/NewSection/NewSection.jsx
import styles from './NewSection.module.css';

const NewSection = () => {
  return (
    <section className={styles.newSection}>
      <h2>Новая секция</h2>
    </section>
  );
};

export default NewSection;
```

### Миграция с Gulp

Этот проект был мигрирован с Gulp + Handlebars на React + Vite:
- ✅ Статические HTML шаблоны → React компоненты
- ✅ Gulp сборка → Vite
- ✅ Handlebars → JSX
- ✅ Глобальные стили → CSS Modules
- ✅ Статические данные → JavaScript модули

---

**Версия:** 3.0.0  
**Последнее обновление:** Март 2026