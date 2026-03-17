import { useState, useEffect, useCallback } from 'react';
import { getLikes as apiGetLikes, toggleLike as apiToggleLike } from '../utils/api';

/**
 * Кастомный хук для работы с лайками проектов
 * @param {string} projectId - ID проекта (например, 'pet-1')
 * @param {string} projectTitle - Название проекта (опционально)
 * @returns {Object} - Объект с данными и функциями для работы с лайками
 */
export function useLikes(projectId, projectTitle) {
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ключи для localStorage
  const LIKES_CACHE_KEY = `likes_${projectId}`;
  const LIKED_STATE_KEY = `liked_${projectId}`;
  const CACHE_TIMESTAMP_KEY = `likes_timestamp_${projectId}`;
  
  // Время жизни кэша в миллисекундах (5 минут)
  const CACHE_DURATION = 5 * 60 * 1000;

  /**
   * Получить данные из localStorage
   */
  const getCachedData = useCallback(() => {
    try {
      const cachedLikes = localStorage.getItem(LIKES_CACHE_KEY);
      const cachedLikedState = localStorage.getItem(LIKED_STATE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      // Проверяем, не устарел ли кэш
      if (cacheTimestamp) {
        const now = Date.now();
        const timestamp = parseInt(cacheTimestamp, 10);
        
        if (now - timestamp > CACHE_DURATION) {
          // Кэш устарел, очищаем его
          localStorage.removeItem(LIKES_CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
          return null;
        }
      }
      
      if (cachedLikes !== null) {
        return {
          likes: parseInt(cachedLikes, 10) || 0,
          isLiked: cachedLikedState === 'true'
        };
      }
    } catch (error) {
      console.warn('Ошибка чтения кэша лайков:', error);
    }
    
    return null;
  }, [LIKES_CACHE_KEY, LIKED_STATE_KEY, CACHE_TIMESTAMP_KEY]);

  /**
   * Сохранить данные в localStorage
   */
  const setCachedData = useCallback((likesCount, likedState) => {
    try {
      localStorage.setItem(LIKES_CACHE_KEY, likesCount.toString());
      localStorage.setItem(LIKED_STATE_KEY, likedState.toString());
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Ошибка сохранения кэша лайков:', error);
    }
  }, [LIKES_CACHE_KEY, LIKED_STATE_KEY, CACHE_TIMESTAMP_KEY]);

  /**
   * Загрузить количество лайков с сервера
   */
  const fetchLikes = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Проверяем доступность API
      const { checkApiHealth } = await import('../utils/api');
      const isApiAvailable = await checkApiHealth();
      
      if (!isApiAvailable) {
        // API недоступен, используем кэшированные данные или 0
        const cachedData = getCachedData();
        if (cachedData) {
          setLikes(cachedData.likes);
          setIsLiked(cachedData.isLiked);
        }
        return;
      }
      
      const result = await apiGetLikes(projectId);
      setLikes(result.likes);
      setIsLiked(result.isLiked);
      
      // Сохраняем в кэш
      setCachedData(result.likes, result.isLiked);
      
    } catch (err) {
      console.error('Ошибка загрузки лайков:', err);
      setError(err.message);
      
      // При ошибке пытаемся использовать кэшированные данные
      const cachedData = getCachedData();
      if (cachedData) {
        setLikes(cachedData.likes);
        setIsLiked(cachedData.isLiked);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, getCachedData, setCachedData]);

  /**
   * Переключить лайк (добавить или убрать)
   */
  const toggleLike = useCallback(async () => {
    if (!projectId || isLoading) return;
    
    // Проверяем доступность API
    try {
      const { checkApiHealth } = await import('../utils/api');
      const isApiAvailable = await checkApiHealth();
      
      if (!isApiAvailable) {
        console.warn('API недоступен. Лайки будут работать после настройки backend.');
        return;
      }
    } catch (err) {
      console.warn('Не удалось проверить API:', err.message);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Оптимистичное обновление UI
    const newIsLiked = !isLiked;
    const optimisticLikes = newIsLiked ? likes + 1 : Math.max(0, likes - 1);
    
    setIsLiked(newIsLiked);
    setLikes(optimisticLikes);
    
    try {
      const result = await apiToggleLike(projectId, projectTitle);
      
      // Обновляем реальными данными с сервера
      setLikes(result.likes);
      setIsLiked(result.isLiked);
      
      // Сохраняем в кэш
      setCachedData(result.likes, result.isLiked);
      
    } catch (err) {
      console.error('Ошибка переключения лайка:', err);
      setError(err.message);
      
      // Откатываем оптимистичное обновление
      setIsLiked(!newIsLiked);
      setLikes(likes);
      
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isLiked, likes, isLoading, setCachedData]);

  /**
   * Инициализация при монтировании компонента
   */
  useEffect(() => {
    if (!projectId) return;
    
    // Сначала пытаемся загрузить из кэша
    const cachedData = getCachedData();
    if (cachedData) {
      setLikes(cachedData.likes);
      setIsLiked(cachedData.isLiked);
    }
    
    // Затем загружаем актуальные данные с сервера
    fetchLikes();
  }, [projectId, getCachedData, fetchLikes]);

  return {
    likes,
    isLiked,
    isLoading,
    error,
    toggleLike,
    refetch: fetchLikes
  };
}

/**
 * Хук для получения всех лайков (для предзагрузки)
 * @returns {Object} - Объект с данными о всех лайках
 */
export function useAllLikes() {
  const [allLikes, setAllLikes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllLikes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { getAllLikes } = await import('../utils/api');
      const likesData = await getAllLikes();
      setAllLikes(likesData);
    } catch (err) {
      console.error('Ошибка загрузки всех лайков:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLikes();
  }, [fetchAllLikes]);

  return {
    allLikes,
    isLoading,
    error,
    refetch: fetchAllLikes
  };
}