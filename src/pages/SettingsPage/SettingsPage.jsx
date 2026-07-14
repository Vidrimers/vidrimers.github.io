import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../components/Admin/AdminProvider';
import styles from './SettingsPage.module.css';

const TABS = [
  { id: 'db', label: 'БД' },
  { id: 'site', label: 'Настройки сайта' },
  { id: 'logs', label: 'Логи активности' },
];

const actionLabels = {
  CREATE_PROJECT: 'Создан проект',
  UPDATE_PROJECT: 'Обновлён проект',
  DELETE_PROJECT: 'Удалён проект',
  CREATE_CATEGORY: 'Создана категория',
  UPDATE_CATEGORY: 'Обновлена категория',
  DELETE_CATEGORY: 'Удалена категория',
  CREATE_SKILL: 'Создан навык',
  UPDATE_SKILL: 'Обновлён навык',
  DELETE_SKILL: 'Удалён навык',
  CREATE_CERTIFICATE: 'Создан сертификат',
  UPDATE_CERTIFICATE: 'Обновлён сертификат',
  DELETE_CERTIFICATE: 'Удалён сертификат',
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAdmin();
  const [activeTab, setActiveTab] = useState('db');

  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← На главную</button>
        <h1>Настройки</h1>
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'db' && <TabDB />}
        {activeTab === 'site' && <TabSite />}
        {activeTab === 'logs' && <TabLogs />}
      </div>
    </div>
  );
};

// ===== ТАБ "БД" =====
const TabDB = () => {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('admin_token');
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        fetch('/api/backup/list', { headers: authHeaders }),
        fetch('/api/backup/stats', { headers: authHeaders })
      ]);
      if (bRes.ok) setBackups(await bRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreate = async () => {
    setActionLoading('create');
    try {
      await fetch('/api/backup', { method: 'POST', headers: authHeaders });
      await loadBackups();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleRestore = async () => {
    if (!selected || !window.confirm(`Восстановить из ${selected}? Текущее состояние будет сохранено в бэкап.`)) return;
    setActionLoading('restore');
    try {
      const res = await fetch('/api/backup/restore', { method: 'POST', headers: authHeaders, body: JSON.stringify({ filename: selected }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (e) { setError(e.message); setActionLoading(null); }
  };

  const handleDownload = () => {
    if (!selected) return;
    window.open(`/api/backup/download/${selected}?token=${token}`, '_blank');
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Удалить ${selected}?`)) return;
    setActionLoading('delete');
    try {
      await fetch(`/api/backup/${selected}`, { method: 'DELETE', headers: authHeaders });
      setSelected(null);
      await loadBackups();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const totalSize = backups.reduce((s, b) => s + b.size, 0);

  return (
    <div className={styles.tabContent}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Статистика */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.dbSizeFormatted}</div>
            <div className={styles.statLabel}>Размер БД</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.uploadsSizeFormatted}</div>
            <div className={styles.statLabel}>Размер uploads/</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.uploadsFiles}</div>
            <div className={styles.statLabel}>Файлов в uploads/</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.tables.projects || 0}</div>
            <div className={styles.statLabel}>Проектов</div>
          </div>
        </div>
      )}

      {/* Кнопки */}
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.btnCreate}`} onClick={handleCreate} disabled={actionLoading === 'create'}>
          {actionLoading === 'create' ? '⏳...' : '💾 Создать бэкап'}
        </button>
        <button className={`${styles.btn} ${styles.btnRestore}`} onClick={handleRestore} disabled={!selected || actionLoading === 'restore'}>
          {actionLoading === 'restore' ? '⏳...' : '🔄 Восстановить'}
        </button>
        <button className={`${styles.btn} ${styles.btnDownload}`} onClick={handleDownload} disabled={!selected}>
          ⬇ Скачать
        </button>
        <button className={`${styles.btn} ${styles.btnDelete}`} onClick={handleDelete} disabled={!selected || actionLoading === 'delete'}>
          {actionLoading === 'delete' ? '⏳...' : '🗑 Удалить'}
        </button>
      </div>

      {/* Список */}
      {backups.length > 0 && (
        <div className={styles.listHeader}>
          <span>{backups.length} бэкап(ов)</span>
          <span>{(totalSize / 1024).toFixed(1)} KB</span>
        </div>
      )}
      <div className={styles.list}>
        {loading ? <div className={styles.empty}>Загрузка...</div> :
          backups.length === 0 ? <div className={styles.empty}>Нет бэкапов</div> :
          backups.map(b => (
            <div key={b.filename} className={`${styles.listItem} ${selected === b.filename ? styles.selected : ''}`}
              onClick={() => setSelected(selected === b.filename ? null : b.filename)}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{b.filename}</span>
                <span className={styles.itemMeta}>{b.createdFormatted} · {b.sizeFormatted}</span>
              </div>
              <div className={`${styles.radio} ${selected === b.filename ? styles.radioActive : ''}`} />
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ===== ТАБ "НАСТРОЙКИ САЙТА" =====
const TabSite = () => {
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletedCount, setDeletedCount] = useState(null);

  const token = localStorage.getItem('admin_token');
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadOrphans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backup/orphans', { headers: authHeaders });
      if (res.ok) setOrphans(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrphans(); }, [loadOrphans]);

  const handleDeleteOrphans = async () => {
    if (!window.confirm(`Удалить ${orphans.length} неиспользуемых файлов?`)) return;
    try {
      const res = await fetch('/api/backup/orphans', { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (data.success) { setDeletedCount(data.deleted); setOrphans([]); }
    } catch (e) { setError(e.message); }
  };

  return (
    <div className={styles.tabContent}>
      {error && <div className={styles.error}>{error}</div>}

      <h3 className={styles.sectionTitle}>Очистка orphan-изображений</h3>
      {deletedCount !== null && <div className={styles.success}>Удалено файлов: {deletedCount}</div>}

      {orphans.length > 0 && (
        <>
          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.btnDelete}`} onClick={handleDeleteOrphans}>
              🗑 Удалить {orphans.length} файл(ов)
            </button>
          </div>
          <div className={styles.list}>
            {orphans.map(o => (
              <div key={o.path} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{o.path}</span>
                  <span className={styles.itemMeta}>{o.sizeFormatted}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {orphans.length === 0 && !loading && <div className={styles.empty}>Orphan-файлов нет</div>}
    </div>
  );
};

// ===== ТАБ "ЛОГИ" =====
const TabLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('admin_token');
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    fetch('/api/backup/logs?limit=100', { headers: authHeaders })
      .then(r => r.json())
      .then(setLogs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.tabContent}>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.list}>
        {loading ? <div className={styles.empty}>Загрузка...</div> :
          logs.length === 0 ? <div className={styles.empty}>Нет логов</div> :
          logs.map(log => (
            <div key={log.id} className={styles.logItem}>
              <div className={styles.logAction}>{actionLabels[log.action] || log.action}</div>
              <div className={styles.logMeta}>
                <span>{log.entity_type}: {log.entity_id}</span>
                <span>{log.user_id}</span>
                <span>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default SettingsPage;
