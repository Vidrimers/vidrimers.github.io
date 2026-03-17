import React, { createContext, useContext, useState, useEffect } from 'react';

// Создаем контекст для админского состояния
const AdminContext = createContext();

// Хук для использования админского контекста
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin должен использоваться внутри AdminProvider');
  }
  return context;
};

// Провайдер админского состояния
export const AdminProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Проверяем сохраненную сессию при загрузке
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      // Проверяем валидность токена
      validateToken(token);
    }
  }, []);

  // Функция валидации токена
  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Ошибка валидации токена:', error);
      localStorage.removeItem('admin_token');
      setIsAuthenticated(false);
    }
  };

  // Функция запроса кода аутентификации
  const requestAuthCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Ошибка запроса кода');
      }

      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Функция верификации кода
  const verifyCode = async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Неверный код');
      }

      // Сохраняем токен и устанавливаем аутентификацию
      localStorage.setItem('admin_token', data.data.token);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Функция выхода
  const logout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setError(null);
  };

  // Функция очистки ошибок
  const clearError = () => {
    setError(null);
  };

  const value = {
    isAuthenticated,
    isLoading,
    error,
    requestAuthCode,
    verifyCode,
    logout,
    clearError
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminProvider;