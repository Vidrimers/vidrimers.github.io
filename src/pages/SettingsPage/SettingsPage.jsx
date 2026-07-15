import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../components/Admin/AdminProvider';
import styles from './SettingsPage.module.css';

const TABS = [
  { id: 'db', label: 'БД' },
  { id: 'visitors', label: 'Посетители' },
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
        {activeTab === 'visitors' && <TabVisitors />}
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
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoSaved, setSeoSaved] = useState(false);
  const [excluded, setExcluded] = useState([]);
  const [named, setNamed] = useState([]);
  const [newVisitorId, setNewVisitorId] = useState('');
  const [newVisitorName, setNewVisitorName] = useState('');
  const [namedVisitorId, setNamedVisitorId] = useState('');
  const [namedVisitorName, setNamedVisitorName] = useState('');
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletedCount, setDeletedCount] = useState(null);

  const token = localStorage.getItem('admin_token');
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Загрузка SEO настроек
  useEffect(() => {
    fetch('/api/settings', { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setSeoTitle(d.data.seo_title || '');
          setSeoDescription(d.data.seo_description || '');
          setSeoKeywords(d.data.seo_keywords || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSeoSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ seoTitle, seoDescription, seoKeywords })
      });
      setSeoSaved(true);
      setTimeout(() => setSeoSaved(false), 2000);
    } catch (e) { setError(e.message); }
  };

  // Исключённые посетители
  const loadExcluded = useCallback(async () => {
    try {
      const res = await fetch('/api/track/excluded', { headers: authHeaders });
      if (res.ok) setExcluded(await res.json());
    } catch {}
  }, []);

  useEffect(() => { loadExcluded(); }, [loadExcluded]);

  const handleAddExcluded = async () => {
    if (!newVisitorId.trim()) return;
    try {
      await fetch('/api/track/excluded', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ visitorId: newVisitorId, name: newVisitorName })
      });
      setNewVisitorId('');
      setNewVisitorName('');
      loadExcluded();
    } catch (e) { setError(e.message); }
  };

  const handleDeleteExcluded = async (id) => {
    if (!window.confirm('Удалить из исключений?')) return;
    try {
      await fetch(`/api/track/excluded/${id}`, { method: 'DELETE', headers: authHeaders });
      loadExcluded();
    } catch (e) { setError(e.message); }
  };

  // Именованные посетители
  const loadNamed = useCallback(async () => {
    try {
      const res = await fetch('/api/track/named', { headers: authHeaders });
      if (res.ok) setNamed(await res.json());
    } catch {}
  }, []);

  useEffect(() => { loadNamed(); }, [loadNamed]);

  const handleAddNamed = async () => {
    if (!namedVisitorId.trim() || !namedVisitorName.trim()) return;
    try {
      await fetch('/api/track/named', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ visitorId: namedVisitorId, name: namedVisitorName })
      });
      setNamedVisitorId('');
      setNamedVisitorName('');
      loadNamed();
    } catch (e) { setError(e.message); }
  };

  const handleDeleteNamed = async (id) => {
    if (!window.confirm('Удалить имя?')) return;
    try {
      await fetch(`/api/track/named/${id}`, { method: 'DELETE', headers: authHeaders });
      loadNamed();
    } catch (e) { setError(e.message); }
  };

  // Orphan-очистка
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

      {/* SEO */}
      <h3 className={styles.sectionTitle}>SEO настройки</h3>
      <div className={styles.seoForm}>
        <label className={styles.fieldLabel}>
          Заголовок страницы
          <input className={styles.input} type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}
            placeholder="Vidrimers — Frontend разработчик" maxLength={100} />
        </label>
        <label className={styles.fieldLabel}>
          Описание
          <textarea className={styles.textarea} value={seoDescription} onChange={e => setSeoDescription(e.target.value)}
            placeholder="Портфолио frontend разработчика" maxLength={300} rows={3} />
        </label>
        <label className={styles.fieldLabel}>
          Ключевые слова (через запятую)
          <input className={styles.input} type="text" value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)}
            placeholder="frontend, react, разработчик" maxLength={300} />
        </label>
        <button className={`${styles.btn} ${styles.btnCreate}`} onClick={handleSeoSave}>
          {seoSaved ? '✓ Сохранено' : '💾 Сохранить'}
        </button>
      </div>

      {/* Исключённые + Именованные — два блока по 50% */}
      <div className={styles.twoColumns}>
        {/* Исключённые */}
        <div className={styles.column}>
          <h3 className={styles.sectionTitle}>Исключённые посетители</h3>
          <p className={styles.hint}>Полностью пропускают трекинг (нет БД, нет Telegram)</p>
          <div className={styles.excludedForm}>
            <input className={styles.input} type="text" value={newVisitorId} onChange={e => setNewVisitorId(e.target.value)}
              placeholder="Visitor ID" />
            <input className={styles.input} type="text" value={newVisitorName} onChange={e => setNewVisitorName(e.target.value)}
              placeholder="Имя (Мой телефон)" />
            <button className={`${styles.btn} ${styles.btnCreate}`} onClick={handleAddExcluded}
              disabled={!newVisitorId.trim()}>+</button>
          </div>
          <div className={styles.list}>
            {excluded.map(e => (
              <div key={e.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{e.visitor_id}</span>
                  <span className={styles.itemMeta}>{e.name || 'Без имени'}</span>
                </div>
                <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => handleDeleteExcluded(e.id)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}>✕</button>
              </div>
            ))}
            {excluded.length === 0 && <div className={styles.empty}>Пусто</div>}
          </div>
        </div>

        {/* Именованные */}
        <div className={styles.column}>
          <h3 className={styles.sectionTitle}>Именованные посетители</h3>
          <p className={styles.hint}>Трекинг работает, но в Telegram пишется имя</p>
          <div className={styles.excludedForm}>
            <input className={styles.input} type="text" value={namedVisitorId} onChange={e => setNamedVisitorId(e.target.value)}
              placeholder="Visitor ID" />
            <input className={styles.input} type="text" value={namedVisitorName} onChange={e => setNamedVisitorName(e.target.value)}
              placeholder="Имя (Мой телефон)" />
            <button className={`${styles.btn} ${styles.btnCreate}`} onClick={handleAddNamed}
              disabled={!namedVisitorId.trim() || !namedVisitorName.trim()}>+</button>
          </div>
          <div className={styles.list}>
            {named.map(n => (
              <div key={n.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{n.visitor_id}</span>
                  <span className={styles.itemMeta}>{n.name}</span>
                </div>
                <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => handleDeleteNamed(n.id)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}>✕</button>
              </div>
            ))}
            {named.length === 0 && <div className={styles.empty}>Пусто</div>}
          </div>
        </div>
      </div>

      {/* Orphan-очистка */}
      <h3 className={styles.sectionTitle} style={{ marginTop: 30 }}>Очистка orphan-изображений</h3>
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

// ===== ТАБ "ПОСЕТИТЕЛИ" =====
const TabVisitors = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('admin_token');
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    fetch('/api/track/stats', { headers: authHeaders })
      .then(r => r.json())
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.empty}>Загрузка...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return null;

  return (
    <div className={styles.tabContent}>
      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalVisits}</div>
          <div className={styles.statLabel}>Визитов</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.uniqueVisitors}</div>
          <div className={styles.statLabel}>Уникальных посетителей</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalClicks}</div>
          <div className={styles.statLabel}>Кликов</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalLikes}</div>
          <div className={styles.statLabel}>Лайков</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.donateClicks}</div>
          <div className={styles.statLabel}>Donate</div>
        </div>
      </div>

      {/* Браузеры/ОС */}
      {stats.browsers.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Браузеры / ОС</h3>
          <div className={styles.list}>
            {stats.browsers.map((b, i) => (
              <div key={i} className={styles.listItem}>
                <span className={styles.itemName}>{b.browser}</span>
                <span className={styles.itemMeta}>{b.cnt} визитов</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Топ проектов по кликам */}
      {stats.topProjects.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Топ проектов по кликам</h3>
          <div className={styles.list}>
            {stats.topProjects.map((p, i) => (
              <div key={i} className={styles.listItem}>
                <span className={styles.itemName}>{p.name}</span>
                <span className={styles.itemMeta}>{p.count} кликов</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Лайки по посетителям */}
      {stats.visitorLikes.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Лайки по посетителям</h3>
          <div className={styles.list}>
            {stats.visitorLikes.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.visitorId}</span>
                  <span className={styles.itemMeta}>лайкнул: {item.projects.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Последние визиты */}
      {stats.recentVisits.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Последние визиты</h3>
          <div className={styles.list}>
            {stats.recentVisits.map((v, i) => (
              <div key={i} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{v.visitor_id}</span>
                  <span className={styles.itemMeta}>{v.browser_info} — {v.path} — {new Date(v.created_at).toLocaleString('ru-RU')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
