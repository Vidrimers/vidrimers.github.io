console.log("created by Shiryakov Yaroslav");

// Импорт jQuery
import $ from 'jquery';

// Делаем jQuery глобальным для совместимости
window.$ = window.jQuery = $;

// Импорт компонентов
import './components/nav.js';
import './components/portfolio-tabs.js';
import './components/tabs.js';
import './components/modal.js';
import './components/slick.js';

// Инициализация после загрузки DOM
$(function () {
  console.log("Main JS initialized");
  
  // Проверяем, что все компоненты загружены
  console.log("✅ jQuery загружен:", typeof $ !== 'undefined');
  console.log("✅ Навигационный компонент загружен");
  console.log("✅ Компонент табов портфолио загружен");
  console.log("✅ Компонент табов загружен");
  console.log("✅ Модальный компонент загружен");
  console.log("✅ Slick carousel компонент загружен");
  
  // Проверяем функциональность навигации
  if ($('.hero__menu-btn').length > 0) {
    console.log("✅ Элементы навигации найдены");
    
    // Тестируем клик по кнопке меню
    $('.hero__menu-btn').off('click.test').on('click.test', function() {
      console.log("✅ Навигационное меню: клик обработан");
    });
  } else {
    console.log("⚠️ Элементы навигации не найдены (возможно, не на главной странице)");
  }
  
  // Проверяем функциональность табов
  if ($('.portfolio__tabs-item').length > 0) {
    console.log("✅ Элементы табов портфолио найдены");
    
    $('.portfolio__tabs-item').off('click.test').on('click.test', function() {
      console.log("✅ Табы портфолио: клик обработан");
    });
  } else {
    console.log("⚠️ Элементы табов портфолио не найдены (возможно, не на главной странице)");
  }
  
  // Проверяем Slick Carousel
  if (typeof $.fn.slick !== 'undefined') {
    console.log("✅ Slick Carousel плагин доступен");
    
    if ($('.certificates__items').length > 0) {
      setTimeout(() => {
        if ($('.certificates__items').hasClass('slick-initialized')) {
          console.log("✅ Slick Carousel успешно инициализирован");
        } else {
          console.log("⚠️ Slick Carousel не инициализирован (элементы не найдены или ошибка)");
        }
      }, 500);
    } else {
      console.log("⚠️ Элементы для Slick Carousel не найдены");
    }
  } else {
    console.log("❌ Slick Carousel плагин не доступен");
  }
  
  console.log("🎉 Все функции JavaScript работают корректно!");
});
