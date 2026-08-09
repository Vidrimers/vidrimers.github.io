import React from 'react';
// Filerobot Image Editor ожидает React в глобальной области
window.React = React;
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './assets/sass/style.scss';
import './styles/global.css';

// Создаем корневой элемент React приложения
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);