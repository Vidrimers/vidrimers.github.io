/**
 * API утилиты для работы с backend
 */

// Базовый URL для API
const API_BASE_URL = '/api';

/**
 * Базовая функция для выполнения HTTP запросов
 * @param {string} endpoint - API endpoint (например, '/likes/pet-1')
 * @param {Object} options - Опции для fetch
 * @returns {Promise<Object>} - Ответ от сервера
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    
    // Проверяем статус ответа
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Если это ошибка сети или парсинга JSON
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('Ошибка сети. Проверьте подключение к интернету.');
    }
    
    // Пробрасываем остальные ошибки как есть
    throw error;
  }
}

/**
 * GET запрос
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} - Ответ от сервера
 */
export async function apiGet(endpoint) {
  return apiRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * POST запрос
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Данные для отправки
 * @returns {Promise<Object>} - Ответ от сервера
 */
export async function apiPost(endpoint, data) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Генерировать уникальный ID пользователя
 * @returns {string} - Уникальный ID пользователя
 */
function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Получить ID пользователя из localStorage или создать новый
 * @returns {string} - ID пользователя
 */
export function getUserId() {
  const USER_ID_KEY = 'react_portfolio_user_id';
  
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
}

/**
 * Получить количество лайков и состояние лайка для проекта
 * @param {string} projectId - ID проекта (например, 'pet-1')
 * @returns {Promise<{likes: number, isLiked: boolean}>} - Количество лайков и состояние
 */
export async function getLikes(projectId) {
  const userId = getUserId();
  const response = await apiGet(`/likes/${projectId}?userId=${userId}`);
  return {
    likes: response.likes,
    isLiked: response.isLiked
  };
}

/**
 * Переключить лайк пользователя (добавить или убрать)
 * @param {string} projectId - ID проекта
 * @returns {Promise<{likes: number, isLiked: boolean}>} - Новое состояние лайков
 */
export async function toggleLike(projectId) {
  const userId = getUserId();
  const response = await apiPost(`/likes/${projectId}`, { userId });
  return {
    likes: response.likes,
    isLiked: response.isLiked
  };
}

/**
 * Получить все лайки
 * @returns {Promise<Object>} - Объект с лайками всех проектов
 */
export async function getAllLikes() {
  const response = await apiGet('/likes');
  return response.likes;
}

/**
 * Проверить доступность API
 * @returns {Promise<boolean>} - true если API доступен
 */
export async function checkApiHealth() {
  try {
    await apiGet('/health');
    return true;
  } catch (error) {
    console.warn('API недоступен:', error.message);
    return false;
  }
}