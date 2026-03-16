# Header Component

## Описание
Header компонент для React портфолио с навигацией, переключателем языка и smooth scroll.

## Функциональность

### 1. Навигация
- Ссылки на все секции сайта (Home, About, Skills, Portfolio, Certificates, Contacts)
- Smooth scroll при клике на ссылку
- Подсветка активной секции при скролле
- Hover эффекты на ссылках

### 2. Переключатель языка
- Кнопка RU/EN для переключения языка
- Интеграция с LanguageContext
- Сохранение выбранного языка в localStorage
- Мгновенное обновление всех переводов

### 3. Адаптивность
- Desktop (> 768px): горизонтальное меню
- Mobile (< 768px): бургер-меню
- Блокировка скролла при открытом меню
- Анимация открытия/закрытия меню

### 4. Стили
- CSS Modules для изоляции стилей
- Миграция стилей из старого header
- Адаптивные медиа-запросы
- Плавные transitions

## Использование

```jsx
import Header from './components/Layout/Header/Header';

function App() {
  return (
    <LanguageProvider>
      <Header />
      {/* остальные компоненты */}
    </LanguageProvider>
  );
}
```

## Зависимости
- React 18+
- LanguageContext (src/context/LanguageContext.jsx)
- Переводы (src/data/translations/ru.json, en.json)

## Структура файлов
```
Header/
├── Header.jsx           # Основной компонент
├── Header.module.css    # Стили компонента
└── README.md           # Документация
```

## Props
Компонент не принимает props, использует LanguageContext.

## Состояние
- `isMenuOpen` - состояние бургер-меню (открыто/закрыто)
- `activeSection` - текущая активная секция

## События
- `scrollToSection(sectionId)` - прокрутка к секции
- `toggleMenu()` - переключение бургер-меню
- `toggleLanguage()` - переключение языка

## Тестирование
1. Запустите dev-сервер: `npm run dev`
2. Проверьте навигацию - клик по ссылкам
3. Проверьте переключатель языка
4. Проверьте адаптивность (< 768px)
5. Проверьте бургер-меню на мобильных

## Миграция из старого кода
Стили мигрированы из:
- `src/assets/sass/blocks/_header.scss`
- `src/assets/sass/blocks/_media.scss`

Функциональность мигрирована из:
- `src/assets/js/components/nav.js`
- `src/templates/parts/header.html`
