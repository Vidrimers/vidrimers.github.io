import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import styles from './FooterAdmin.module.css';

// Поля футера с метками
const FOOTER_FIELDS = [
  { key: 'title',       labelRu: 'Заголовок',              placeholder: 'Контакты' },
  { key: 'text',        labelRu: 'Подзаголовок / текст',   placeholder: 'Связаться со мной...' },
  { key: 'sendMessage', labelRu: 'Кнопка "Написать"',      placeholder: 'Отправить сообщение' },
  { key: 'findMe',      labelRu: 'Строка "Найти меня"',    placeholder: 'Найти меня можно' },
  { key: 'onSocial',    labelRu: 'Строка "В соцсетях"',    placeholder: 'В линкедине и телеграме' },
  { key: 'thanks',      labelRu: 'Строка "Спасибо"',       placeholder: 'СПАСИБО :-)' },
  { key: 'donate',      labelRu: 'Кнопка "Донат"',         placeholder: 'Донатная' },
];

const emptyForm = () => ({
  ru: { title: '', text: '', sendMessage: '', findMe: '', onSocial: '', thanks: '', donate: '' },
  en: { title: '', text: '', sendMessage: '', findMe: '', onSocial: '', thanks: '', donate: '' }
});

const FooterAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeLang, setActiveLang] = useState('ru');
  const [form, setForm] = useState(emptyForm());
  const [original, setOriginal] = useState(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) loadFooter();
  }, [isOpen, isAuthenticated]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json'
  });

  const loadFooter = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/footer');
      if (!res.ok) throw new Error('Ошибка загрузки текстов футера');
      const data = await res.json();
      const loaded = { ru: { ...data.data.ru }, en: { ...data.data.en } };
      setForm(loaded);
      setOriginal(loaded);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (lang, key, value) => {
    setForm(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/footer', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ru: form.ru, en: form.en })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Ошибка сохранения');
      }
      setSuccess(true);
      setOriginal({ ru: { ...form.ru }, en: { ...form.en } });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (original) setForm({ ru: { ...original.ru }, en: { ...original.en } });
    setError(null);
  };

  const hasChanges = original && (
    JSON.stringify(form.ru) !== JSON.stringify(original.ru) ||
    JSON.stringify(form.en) !== JSON.stringify(original.en)
  );

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление текстами футера" size="large">
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>Тексты футера сохранены</div>}
        {loading && <div className={styles.loading}>Загрузка...</div>}

        {!loading && (
          <>
            {/* Переключатель языка */}
            <div className={styles.langTabs}>
              <button
                className={`${styles.langTab} ${activeLang === 'ru' ? styles.langTabActive : ''}`}
                onClick={() => setActiveLang('ru')}
              >
                🇷🇺 Русский
              </button>
              <button
                className={`${styles.langTab} ${activeLang === 'en' ? styles.langTabActive : ''}`}
                onClick={() => setActiveLang('en')}
              >
                🇬🇧 English
              </button>
            </div>

            <div className={styles.fields}>
              {FOOTER_FIELDS.map(({ key, labelRu, placeholder }) => (
                <div key={key} className={styles.formGroup}>
                  <label>{labelRu}</label>
                  <input
                    type="text"
                    value={form[activeLang][key] || ''}
                    onChange={(e) => handleChange(activeLang, key, e.target.value)}
                    placeholder={placeholder}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>

            <div className={styles.formActions}>
              {hasChanges && (
                <button className={styles.resetButton} onClick={handleReset} disabled={saving}>
                  Сбросить
                </button>
              )}
              <button className={styles.cancelButton} onClick={onClose} disabled={saving}>
                Закрыть
              </button>
              <button className={styles.saveButton} onClick={handleSave} disabled={saving || !hasChanges}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
};

export default FooterAdmin;
