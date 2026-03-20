import React, { useState, useEffect, useRef } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import styles from './ContactsAdmin.module.css';

// Типы иконок
const ICON_TYPES = { FILE: 'file', EMOJI: 'emoji', FA: 'fa' };

// Пустая платформа
const emptyLink = () => ({ key: '', value: '', iconType: ICON_TYPES.EMOJI, iconValue: '' });

const ContactsAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [links, setLinks] = useState([]); // массив { key, value, iconType, iconValue }
  const [dragIndex, setDragIndex] = useState(null);
  const dragOverIndex = useRef(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) loadContacts();
  }, [isOpen, isAuthenticated]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json'
  });

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Ошибка загрузки контактов');
      const data = await res.json();
      const c = data.data;

      setEmail(c.email || '');

      // Собираем все ссылки: сначала основные (telegram, linkedin, github) если есть,
      // потом otherLinks
      const allLinks = [];

      // Основные поля — переносим в otherLinks если они заполнены
      if (c.telegram) {
        allLinks.push({ key: 'Telegram', value: c.telegram, iconType: ICON_TYPES.FA, iconValue: 'fa-brands fa-telegram' });
      }
      if (c.linkedin) {
        allLinks.push({ key: 'LinkedIn', value: c.linkedin, iconType: ICON_TYPES.FA, iconValue: 'fa-brands fa-linkedin' });
      }
      if (c.github) {
        allLinks.push({ key: 'GitHub', value: c.github, iconType: ICON_TYPES.FA, iconValue: 'fa-brands fa-github' });
      }

      // otherLinks из БД
      if (c.otherLinks) {
        Object.entries(c.otherLinks).forEach(([key, val]) => {
          // Не дублируем если уже добавили из основных полей
          if (['Telegram', 'LinkedIn', 'GitHub'].includes(key) && allLinks.find(l => l.key === key)) return;
          if (typeof val === 'object' && val !== null) {
            allLinks.push({ key, value: val.url || '', iconType: val.iconType || ICON_TYPES.EMOJI, iconValue: val.iconValue || '' });
          } else {
            allLinks.push({ key, value: val || '', iconType: ICON_TYPES.EMOJI, iconValue: '' });
          }
        });
      }

      setLinks(allLinks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChange = (index, field, value) => {
    setLinks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSuccess(false);
  };

  const handleAdd = () => {
    setLinks(prev => [...prev, emptyLink()]);
  };

  const handleRemove = (index) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  // Drag & drop
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    setLinks(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(null);
    dragOverIndex.current = null;
    setSuccess(false);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    dragOverIndex.current = null;
  };

  const validate = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Некорректный формат email';
    for (const link of links) {
      if (link.key && !link.value) return `Укажите URL для "${link.key}"`;
      if (!link.key && link.value) return 'Укажите название платформы';
      if (link.value && !link.value.startsWith('http')) return `Ссылка для "${link.key}" должна начинаться с http`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Всё сохраняем в otherLinks, основные поля обнуляем
      const otherLinksObj = {};
      links
        .filter(l => l.key.trim() && l.value.trim())
        .forEach(l => {
          otherLinksObj[l.key.trim()] = {
            url: l.value.trim(),
            iconType: l.iconType || ICON_TYPES.EMOJI,
            iconValue: l.iconValue?.trim() || ''
          };
        });

      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: email.trim() || null,
          telegram: null,
          linkedin: null,
          github: null,
          otherLinks: otherLinksObj
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Ошибка сохранения');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderIconPreview = (link) => {
    if (!link.iconValue) return <span className={styles.iconPreviewEmpty}>—</span>;
    if (link.iconType === ICON_TYPES.FA) return <i className={`${link.iconValue} ${styles.iconPreviewFa}`} />;
    if (link.iconType === ICON_TYPES.EMOJI) return <span className={styles.iconPreviewEmoji}>{link.iconValue}</span>;
    if (link.iconType === ICON_TYPES.FILE) return <img src={link.iconValue} alt="icon" className={styles.iconPreviewImg} onError={e => { e.target.style.display = 'none'; }} />;
    return null;
  };

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление контактами" size="large">
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>Контакты сохранены</div>}
        {loading && <div className={styles.loading}>Загрузка...</div>}

        {/* Email */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Email</h3>
          <div className={styles.formGroup}>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSuccess(false); }}
              placeholder="example@email.com"
              disabled={loading}
            />
          </div>
        </div>

        {/* Платформы */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Социальные ссылки</h3>
            <button className={styles.addButton} onClick={handleAdd} disabled={loading}>+ Добавить</button>
          </div>

          <p className={styles.dragHint}>💡 Перетаскивайте строки для изменения порядка</p>

          {links.length === 0 && (
            <p className={styles.emptyHint}>Нет ссылок. Нажмите "+ Добавить".</p>
          )}

          {links.map((link, index) => (
            <div
              key={index}
              className={`${styles.linkBlock} ${dragIndex === index ? styles.dragging : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.dragHandle} title="Перетащить">⋮⋮</div>

              <div className={styles.linkContent}>
                {/* Строка: название + URL + удалить */}
                <div className={styles.linkRow}>
                  <input
                    type="text"
                    value={link.key}
                    onChange={(e) => handleLinkChange(index, 'key', e.target.value)}
                    placeholder="Название (Telegram, Behance...)"
                    className={styles.linkKey}
                    disabled={loading}
                  />
                  <input
                    type="url"
                    value={link.value}
                    onChange={(e) => handleLinkChange(index, 'value', e.target.value)}
                    placeholder="https://..."
                    className={styles.linkValue}
                    disabled={loading}
                  />
                  <button className={styles.removeButton} onClick={() => handleRemove(index)} disabled={loading} title="Удалить">✕</button>
                </div>

                {/* Строка: тип иконки + значение + превью */}
                <div className={styles.iconRow}>
                  <span className={styles.iconLabel}>Иконка:</span>
                  <div className={styles.iconTypeTabs}>
                    {[
                      { type: ICON_TYPES.EMOJI, label: 'Emoji' },
                      { type: ICON_TYPES.FA,    label: 'Font Awesome' },
                      { type: ICON_TYPES.FILE,  label: 'Файл/URL' }
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        type="button"
                        className={`${styles.iconTypeTab} ${link.iconType === type ? styles.iconTypeTabActive : ''}`}
                        onClick={() => handleLinkChange(index, 'iconType', type)}
                        disabled={loading}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={link.iconValue}
                    onChange={(e) => handleLinkChange(index, 'iconValue', e.target.value)}
                    placeholder={
                      link.iconType === ICON_TYPES.FA ? 'fa-brands fa-telegram' :
                      link.iconType === ICON_TYPES.EMOJI ? '✈️' :
                      '/assets/img/ico/social/icon.png'
                    }
                    className={styles.iconInput}
                    disabled={loading}
                  />
                  <div className={styles.iconPreview}>{renderIconPreview(link)}</div>
                </div>

                {link.iconType === ICON_TYPES.FA && (
                  <p className={styles.iconHint}>
                    Классы на <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer">fontawesome.com/icons</a> — например: <code>fa-brands fa-telegram</code>, <code>fa-brands fa-linkedin</code>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.formActions}>
          <button className={styles.cancelButton} onClick={onClose} disabled={loading}>Отмена</button>
          <button className={styles.saveButton} onClick={handleSave} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </AdminModal>
  );
};

export default ContactsAdmin;
