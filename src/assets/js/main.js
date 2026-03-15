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
});
