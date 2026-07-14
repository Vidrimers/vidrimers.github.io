import React, { useState, useEffect, useCallback } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import styles from './BackupAdmin.module.css';

const BackupAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadBackups = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/backup/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ошибка загрузки списка');
      const data = await res.json();
      setBackups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadBackups();
      setSelected(null);
    }
  }, [isOpen, isAuthenticated, loadBackups]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleCreate = async () => {
    setActionLoading('create');
    setError(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Ошибка создания бэкапа');
      await loadBackups();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!selected) return;
    if (!window.confirm(`Восстановить БД из ${selected}?\n\nТекущая БД будет заменена. Перед восстановлением будет создан бэкап текущей БД.`)) {
      return;
    }
    setActionLoading('restore');
    setError(null);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ filename: selected })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка восстановления');
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const handleDownload = () => {
    if (!selected) return;
    const token = localStorage.getItem('admin_token');
    window.open(`/api/backup/download/${selected}?token=${token}`, '_blank');
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Удалить бэкап ${selected}?\n\nЭто действие нельзя отменить.`)) {
      return;
    }
    setActionLoading('delete');
    setError(null);
    try {
      const res = await fetch(`/api/backup/${selected}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      setSelected(null);
      await loadBackups();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление бэкапами" size="medium">
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}

        {/* Кнопки */}
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnCreate}`}
            onClick={handleCreate}
            disabled={actionLoading === 'create'}
          >
            {actionLoading === 'create' ? '⏳ Создание...' : '💾 Создать бэкап'}
          </button>
          <button
            className={`${styles.btn} ${styles.btnRestore}`}
            onClick={handleRestore}
            disabled={!selected || actionLoading === 'restore'}
          >
            {actionLoading === 'restore' ? '⏳ Восстановление...' : '🔄 Восстановить'}
          </button>
          <button
            className={`${styles.btn} ${styles.btnDownload}`}
            onClick={handleDownload}
            disabled={!selected || actionLoading === 'download'}
          >
            ⬇ Скачать
          </button>
          <button
            className={`${styles.btn} ${styles.btnDelete}`}
            onClick={handleDelete}
            disabled={!selected || actionLoading === 'delete'}
          >
            {actionLoading === 'delete' ? '⏳ Удаление...' : '🗑 Удалить'}
          </button>
        </div>

        {/* Список бэкапов */}
        <div className={styles.backupList}>
          {loading ? (
            <div className={styles.empty}>Загрузка...</div>
          ) : backups.length === 0 ? (
            <div className={styles.empty}>Нет бэкапов. Создайте первый бэкап.</div>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.filename}
                className={`${styles.backupItem} ${selected === backup.filename ? styles.selected : ''}`}
                onClick={() => setSelected(backup.filename === selected ? null : backup.filename)}
              >
                <div className={styles.backupInfo}>
                  <span className={styles.backupName}>{backup.filename}</span>
                  <span className={styles.backupMeta}>
                    {backup.createdFormatted} · {backup.sizeFormatted}
                  </span>
                </div>
                <div className={styles.backupRadio}>
                  <div className={`${styles.radio} ${selected === backup.filename ? styles.radioActive : ''}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminModal>
  );
};

export default BackupAdmin;
