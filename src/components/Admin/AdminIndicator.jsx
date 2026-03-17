import React from 'react';
import { useAdmin } from './AdminProvider';
import styles from './AdminIndicator.module.css';

// Компонент для отображения + иконок в админском режиме
const AdminIndicator = ({ onClick, section }) => {
  const { isAuthenticated } = useAdmin();

  // Показываем индикатор только если пользователь аутентифицирован
  if (!isAuthenticated) {
    return null;
  }

  return (
    <button 
      className={styles.indicator}
      onClick={onClick}
      title={`Управление разделом "${section}"`}
      aria-label={`Открыть панель управления для раздела ${section}`}
    >
      <span className={styles.icon}>+</span>
    </button>
  );
};

export default AdminIndicator;