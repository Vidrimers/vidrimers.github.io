import React from 'react';
import { useAdmin } from './AdminProvider';
import styles from './AdminLogout.module.css';

// Компонент для отображения крестика выхода из админского режима
const AdminLogout = () => {
  const { isAuthenticated, logout } = useAdmin();

  // Показываем крестик только если пользователь аутентифицирован
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <button 
      className={styles.logoutButton}
      onClick={handleLogout}
      title="Выйти из админского режима"
      aria-label="Выйти из админского режима"
    >
      <span className={styles.icon}>×</span>
    </button>
  );
};

export default AdminLogout;