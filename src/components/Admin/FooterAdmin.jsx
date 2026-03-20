import React, { useState, useEffect, useRef } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import styles from './FooterAdmin.module.css';

// ─── Константы ───────────────────────────────────────────────────────────────

const ICON_TYPES = { FILE: 'file', EMOJI: 'emoji', FA: 'fa' };

const FOOTER_FIELDS = [
  { key: 'title',       label: 'Заголовок',             placeholder: 'Контакты' },
  { key: 'text',        label: 'Подзаголовок',          placeholder: 'Связаться со мной...' },
  { key: 'sendMessage', label: 'Кнопка "Написать"',     placeholder: 'Отправить сообщение' },
  { key: 'findMe',      label: 'Строка "Найти меня"',   placeholder: 'Найти меня можно' },
  { key: 'onSocial',    label: 'Строка "В соцсетях"',   placeholder: 'В линкедине и телеграме' },
  { key: 'thanks',      label: 'Строка "Спасибо"',      placeholder: 'СПАСИБО :-)' },
  { key: 'donate',      label: 'Кнопка "Донат"',        placeholder: 'Донатная' },
];

const emptyTextForm = () => ({
  ru: { title: '', text: '', sendMessage: '', findMe: '', onSocial: '', thanks: '', donate: '' },
  en: { title: '', text: '', sendMessage: '', findMe: '', onSocial: '', thanks: '', donate: '' }
});

const emptyWalletForm = { name: '', address: '', color: '#888888', isHidden: false };
const emptyLink = () => ({ key: '', value: '', iconType: ICON_TYPES.EMOJI, iconValue: '', isHidden: false });

// ─── Вкладка: Тексты ─────────────────────────────────────────────────────────

const TabTexts = ({ getAuthHeaders }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeLang, setActiveLang] = useState('ru');
  const [form, setForm] = useState(emptyTextForm());
  const [original, setOriginal] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/footer');
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      const loaded = { ru: { ...data.data.ru }, en: { ...data.data.en } };
      setForm(loaded);
      setOriginal(loaded);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleChange = (lang, key, value) => {
    setForm(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      const res = await fetch('/api/footer', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ru: form.ru, en: form.en })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Ошибка'); }
      setSuccess(true);
      setOriginal({ ru: { ...form.ru }, en: { ...form.en } });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const hasChanges = original && JSON.stringify(form) !== JSON.stringify(original);

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.tabContent}>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Сохранено</div>}

      <div className={styles.langTabs}>
        {['ru', 'en'].map(lang => (
          <button key={lang} className={`${styles.langTab} ${activeLang === lang ? styles.langTabActive : ''}`} onClick={() => setActiveLang(lang)}>
            {lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
          </button>
        ))}
      </div>

      <div className={styles.fields}>
        {FOOTER_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className={styles.formGroup}>
            <label>{label}</label>
            <input type="text" value={form[activeLang][key] || ''} onChange={e => handleChange(activeLang, key, e.target.value)} placeholder={placeholder} disabled={saving} />
          </div>
        ))}
      </div>

      <div className={styles.tabActions}>
        {hasChanges && <button className={styles.resetButton} onClick={() => { setForm({ ru: { ...original.ru }, en: { ...original.en } }); setError(null); }} disabled={saving}>Сбросить</button>}
        <button className={styles.saveButton} onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
};

// ─── Вкладка: Контакты ────────────────────────────────────────────────────────

const TabContacts = ({ getAuthHeaders }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [links, setLinks] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const dragOverIndex = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Ошибка загрузки контактов');
      const { data: c } = await res.json();
      setEmail(c.email || '');

      const allLinks = [];
      if (c.telegram) allLinks.push({ key: 'Telegram', value: c.telegram, iconType: ICON_TYPES.FA, iconValue: 'fa-brands fa-telegram', isHidden: false });
      if (c.linkedin) allLinks.push({ key: 'LinkedIn', value: c.linkedin, iconType: ICON_TYPES.FA, iconValue: 'fa-brands fa-linkedin', isHidden: false });
      if (c.github)   allLinks.push({ key: 'GitHub',   value: c.github,   iconType: ICON_TYPES.FA, iconValue: 'fa-brands fa-github',   isHidden: false });

      if (c.otherLinks) {
        Object.entries(c.otherLinks).forEach(([key, val]) => {
          if (['Telegram', 'LinkedIn', 'GitHub'].includes(key) && allLinks.find(l => l.key === key)) return;
          if (typeof val === 'object' && val !== null) {
            allLinks.push({ key, value: val.url || '', iconType: val.iconType || ICON_TYPES.EMOJI, iconValue: val.iconValue || '', isHidden: Boolean(val.isHidden) });
          } else {
            allLinks.push({ key, value: val || '', iconType: ICON_TYPES.EMOJI, iconValue: '', isHidden: false });
          }
        });
      }
      setLinks(allLinks);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLinkChange = (i, field, value) => {
    setLinks(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: value }; return u; });
    setSuccess(false);
  };

  const handleDragStart = (e, i) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, i) => { e.preventDefault(); dragOverIndex.current = i; };
  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); return; }
    setLinks(prev => {
      const u = [...prev]; const [m] = u.splice(dragIndex, 1); u.splice(i, 0, m); return u;
    });
    setDragIndex(null); dragOverIndex.current = null; setSuccess(false);
  };
  const handleDragEnd = () => { setDragIndex(null); dragOverIndex.current = null; };

  const validate = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Некорректный email';
    for (const l of links) {
      if (l.key && !l.value) return `Укажите URL для "${l.key}"`;
      if (!l.key && l.value) return 'Укажите название платформы';
      if (l.value && !l.value.startsWith('http')) return `Ссылка для "${l.key}" должна начинаться с http`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setLoading(true); setError(null); setSuccess(false);
    try {
      const otherLinksObj = {};
      links.filter(l => l.key.trim() && l.value.trim()).forEach(l => {
        otherLinksObj[l.key.trim()] = { url: l.value.trim(), iconType: l.iconType || ICON_TYPES.EMOJI, iconValue: l.iconValue?.trim() || '', isHidden: Boolean(l.isHidden) };
      });
      const res = await fetch('/api/contacts', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ email: email.trim() || null, telegram: null, linkedin: null, github: null, otherLinks: otherLinksObj })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Ошибка'); }
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const renderIconPreview = (link) => {
    if (!link.iconValue) return <span className={styles.iconPreviewEmpty}>—</span>;
    if (link.iconType === ICON_TYPES.FA) return <i className={`${link.iconValue} ${styles.iconPreviewFa}`} />;
    if (link.iconType === ICON_TYPES.EMOJI) return <span className={styles.iconPreviewEmoji}>{link.iconValue}</span>;
    if (link.iconType === ICON_TYPES.FILE) return <img src={link.iconValue} alt="icon" className={styles.iconPreviewImg} onError={e => { e.target.style.display = 'none'; }} />;
    return null;
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.tabContent}>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Контакты сохранены</div>}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Email</h3>
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setSuccess(false); }} placeholder="example@email.com" disabled={loading} className={styles.emailInput} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Социальные ссылки</h3>
          <button className={styles.addButton} onClick={() => setLinks(p => [...p, emptyLink()])} disabled={loading}>+ Добавить</button>
        </div>
        <p className={styles.dragHint}>💡 Перетаскивайте строки для изменения порядка</p>

        {links.length === 0 && <p className={styles.emptyHint}>Нет ссылок. Нажмите "+ Добавить".</p>}

        {links.map((link, i) => (
          <div key={i} className={`${styles.linkBlock} ${dragIndex === i ? styles.dragging : ''} ${link.isHidden ? styles.linkHidden : ''}`}
            draggable onDragStart={e => handleDragStart(e, i)} onDragOver={e => handleDragOver(e, i)}
            onDrop={e => handleDrop(e, i)} onDragEnd={handleDragEnd}>
            <div className={styles.dragHandle}>⋮⋮</div>
            <div className={styles.linkContent}>
              <div className={styles.linkRow}>
                <input type="text" value={link.key} onChange={e => handleLinkChange(i, 'key', e.target.value)} placeholder="Telegram, Behance..." className={styles.linkKey} disabled={loading} />
                <input type="url" value={link.value} onChange={e => handleLinkChange(i, 'value', e.target.value)} placeholder="https://..." className={styles.linkValue} disabled={loading} />
                <button className={styles.removeButton} onClick={() => { setLinks(p => p.filter((_, j) => j !== i)); setSuccess(false); }} disabled={loading}>✕</button>
              </div>
              <div className={styles.iconRow}>
                <span className={styles.iconLabel}>Иконка:</span>
                <div className={styles.iconTypeTabs}>
                  {[{ type: ICON_TYPES.EMOJI, label: 'Emoji' }, { type: ICON_TYPES.FA, label: 'Font Awesome' }, { type: ICON_TYPES.FILE, label: 'Файл/URL' }].map(({ type, label }) => (
                    <button key={type} type="button" className={`${styles.iconTypeTab} ${link.iconType === type ? styles.iconTypeTabActive : ''}`} onClick={() => handleLinkChange(i, 'iconType', type)} disabled={loading}>{label}</button>
                  ))}
                </div>
                <input type="text" value={link.iconValue} onChange={e => handleLinkChange(i, 'iconValue', e.target.value)}
                  placeholder={link.iconType === ICON_TYPES.FA ? 'fa-brands fa-telegram' : link.iconType === ICON_TYPES.EMOJI ? '✈️' : '/assets/img/ico/social/icon.png'}
                  className={styles.iconInput} disabled={loading} />
                <div className={styles.iconPreview}>{renderIconPreview(link)}</div>
              </div>
              {link.iconType === ICON_TYPES.FA && (
                <p className={styles.iconHint}>Классы на <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer">fontawesome.com/icons</a> — например: <code>fa-brands fa-telegram</code></p>
              )}
              <label className={styles.hiddenCheckbox}>
                <input type="checkbox" checked={Boolean(link.isHidden)} onChange={e => handleLinkChange(i, 'isHidden', e.target.checked)} disabled={loading} />
                <span>Скрыть ссылку</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tabActions}>
        <button className={styles.saveButton} onClick={handleSave} disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
};

// ─── Вкладка: Донаты ─────────────────────────────────────────────────────────

const TabDonate = ({ getAuthHeaders }) => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [draggedWallet, setDraggedWallet] = useState(null);
  const [form, setForm] = useState(emptyWalletForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/donate-wallets?includeHidden=true', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки кошельков');
      const data = await res.json();
      setWallets(data.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Название обязательно'); return; }
    if (!form.address.trim()) { setError('Адрес обязателен'); return; }
    setLoading(true); setError(null);
    try {
      const payload = { name: form.name.trim(), address: form.address.trim(), color: form.color, sortOrder: editingWallet ? editingWallet.sortOrder : wallets.length + 1, isHidden: form.isHidden };
      const url = editingWallet ? `/api/donate-wallets/${editingWallet.id}` : '/api/donate-wallets';
      const res = await fetch(url, { method: editingWallet ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Ошибка'); }
      await load(); setShowForm(false); setForm(emptyWalletForm); setEditingWallet(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (wallet) => {
    if (!confirm(`Удалить "${wallet.name}"?`)) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/donate-wallets/${wallet.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Ошибка'); }
      await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleToggle = async (wallet) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/donate-wallets/${wallet.id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ name: wallet.name, address: wallet.address, color: wallet.color, sortOrder: wallet.sortOrder, isHidden: !wallet.isHidden })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Ошибка'); }
      await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDragStart = (e, w) => { setDraggedWallet(w); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = async (e, target) => {
    e.preventDefault();
    if (!draggedWallet || draggedWallet.id === target.id) { setDraggedWallet(null); return; }
    const list = [...wallets];
    const from = list.findIndex(w => w.id === draggedWallet.id);
    const to = list.findIndex(w => w.id === target.id);
    const [removed] = list.splice(from, 1); list.splice(to, 0, removed);
    const updated = list.map((w, i) => ({ ...w, sortOrder: i + 1 }));
    setWallets(updated); setDraggedWallet(null);
    try {
      const res = await fetch('/api/donate-wallets/reorder', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ wallets: updated.map(w => ({ id: w.id, sort_order: w.sortOrder })) })
      });
      if (!res.ok) { await load(); throw new Error('Ошибка порядка'); }
    } catch (err) { setError(err.message); }
  };

  if (loading && wallets.length === 0) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.tabContent}>
      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Загрузка...</div>}

      {!showForm ? (
        <>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Кошельки</h3>
            <button className={styles.addButton} onClick={() => { setError(null); setForm(emptyWalletForm); setEditingWallet(null); setShowForm(true); }} disabled={loading}>+ Добавить</button>
          </div>
          <p className={styles.dragHint}>💡 Перетаскивайте для изменения порядка</p>

          {wallets.map(wallet => (
            <div key={wallet.id} className={`${styles.walletCard} ${wallet.isHidden ? styles.walletHidden : ''}`}
              draggable onDragStart={e => handleDragStart(e, wallet)} onDragOver={handleDragOver} onDrop={e => handleDrop(e, wallet)}>
              <div className={styles.dragHandle}>⋮⋮</div>
              <div className={styles.colorDot} style={{ backgroundColor: wallet.color }} />
              <div className={styles.walletInfo}>
                <div className={styles.walletName}>{wallet.name}</div>
                <div className={styles.walletAddress}>{wallet.address}</div>
                {wallet.isHidden && <span className={styles.hiddenFlag}>Скрыт</span>}
              </div>
              <div className={styles.walletActions}>
                <button className={styles.editButton} onClick={() => { setError(null); setForm({ name: wallet.name, address: wallet.address, color: wallet.color || '#888888', isHidden: wallet.isHidden }); setEditingWallet(wallet); setShowForm(true); }} disabled={loading}>Ред.</button>
                <button className={styles.visibilityButton} onClick={() => handleToggle(wallet)} disabled={loading}>{wallet.isHidden ? 'Показать' : 'Скрыть'}</button>
                <button className={styles.deleteButton} onClick={() => handleDelete(wallet)} disabled={loading}>Удалить</button>
              </div>
            </div>
          ))}
          {wallets.length === 0 && !loading && <p className={styles.emptyHint}>Нет кошельков. Нажмите "+ Добавить".</p>}
        </>
      ) : (
        <div className={styles.walletForm}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{editingWallet ? 'Редактирование' : 'Добавление'}</h3>
            <button className={styles.backButton} onClick={() => { setShowForm(false); setError(null); }}>← Назад</button>
          </div>
          <div className={styles.formGroup}>
            <label>Название *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Kaspa, TON..." disabled={loading} />
          </div>
          <div className={styles.formGroup}>
            <label>Адрес кошелька *</label>
            <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Адрес..." rows={3} disabled={loading} />
          </div>
          <div className={styles.formGroup}>
            <label>Цвет названия</label>
            <div className={styles.colorRow}>
              <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className={styles.colorPicker} disabled={loading} />
              <input type="text" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="#888888" className={styles.colorText} disabled={loading} />
              <span className={styles.colorPreview} style={{ color: form.color }}>{form.name || 'Название'}</span>
            </div>
          </div>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={form.isHidden} onChange={e => setForm(p => ({ ...p, isHidden: e.target.checked }))} />
            <span>Скрыть кошелёк</span>
          </label>
          <div className={styles.tabActions}>
            <button className={styles.cancelButton} onClick={() => { setShowForm(false); setError(null); }} disabled={loading}>Отмена</button>
            <button className={styles.saveButton} onClick={handleSave} disabled={loading}>{loading ? 'Сохранение...' : (editingWallet ? 'Обновить' : 'Создать')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Главный компонент ────────────────────────────────────────────────────────

const TABS = [
  { id: 'texts',    label: 'Тексты' },
  { id: 'contacts', label: 'Контакты' },
  { id: 'donate',   label: 'Донаты' },
];

const FooterAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [activeTab, setActiveTab] = useState('texts');

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json'
  });

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление футером" size="large">
      <div className={styles.container}>
        {/* Вкладки */}
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

        {/* Содержимое вкладки */}
        {activeTab === 'texts'    && <TabTexts    getAuthHeaders={getAuthHeaders} />}
        {activeTab === 'contacts' && <TabContacts getAuthHeaders={getAuthHeaders} />}
        {activeTab === 'donate'   && <TabDonate   getAuthHeaders={getAuthHeaders} />}
      </div>
    </AdminModal>
  );
};

export default FooterAdmin;
