import React, { useState, useEffect, useCallback } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import styles from './AboutAdmin.module.css';

// Компонент предпросмотра контента "Обо мне"
const ContentPreview = ({ content, lang }) => {
  // Разбиваем текст на параграфы по двойному переносу строки
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  // Простой рендер markdown: **текст** → <strong>, [текст](url) → <a>
  const renderParagraph = (text, index) => {
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Ищем ссылку [текст](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Ищем жирный **текст**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      const linkPos = linkMatch ? remaining.indexOf(linkMatch[0]) : Infinity;
      const boldPos = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;

      if (linkPos === Infinity && boldPos === Infinity) {
        parts.push(remaining);
        break;
      }

      if (linkPos < boldPos) {
        if (linkPos > 0) parts.push(remaining.substring(0, linkPos));
        parts.push(<a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>);
        remaining = remaining.substring(linkPos + linkMatch[0].length);
      } else {
        if (boldPos > 0) parts.push(remaining.substring(0, boldPos));
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldPos + boldMatch[0].length);
      }
    }

    return <p key={index}>{parts}</p>;
  };

  return (
    <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#333' }}>
      {paragraphs.length > 0
        ? paragraphs.map((p, i) => renderParagraph(p, i))
        : <p style={{ color: '#999', fontStyle: 'italic' }}>
            {lang === 'ru' ? 'Нет контента для предпросмотра' : 'No content to preview'}
          </p>
      }
    </div>
  );
};

// Вспомогательная функция: вставка текста/тега в позицию курсора textarea
const insertAtCursor = (textarea, before, after = '') => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const newValue =
    textarea.value.substring(0, start) +
    before +
    selected +
    after +
    textarea.value.substring(end);
  return { newValue, cursorPos: start + before.length + selected.length + after.length };
};

// Компонент простого rich-text тулбара для textarea
const RichTextToolbar = ({ textareaRef, value, onChange }) => {
  const handleBold = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { newValue, cursorPos } = insertAtCursor(ta, '**', '**');
    onChange(newValue);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleLink = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    const url = prompt('Введите URL ссылки:', 'https://');
    if (!url) return;
    const linkText = selected || 'текст ссылки';
    const linkMarkup = `[${linkText}](${url})`;
    const newValue =
      ta.value.substring(0, ta.selectionStart) +
      linkMarkup +
      ta.value.substring(ta.selectionEnd);
    onChange(newValue);
    setTimeout(() => ta.focus(), 0);
  };

  const handleNewParagraph = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { newValue, cursorPos } = insertAtCursor(ta, '\n\n');
    onChange(newValue);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={handleBold}
        title="Жирный текст (**текст**)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={handleLink}
        title="Вставить ссылку [текст](url)"
      >
        🔗
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={handleNewParagraph}
        title="Новый параграф (двойной перенос строки)"
      >
        ¶
      </button>
      <span className={styles.toolbarHint}>
        Параграфы разделяются пустой строкой
      </span>
    </div>
  );
};

const AboutAdmin = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('ru'); // 'ru' | 'en'
  const [showPreview, setShowPreview] = useState(false);

  // Состояние формы
  const [form, setForm] = useState({
    contentRu: '',
    contentEn: ''
  });

  // Оригинальные данные для сброса
  const [originalData, setOriginalData] = useState(null);

  // Refs для textarea (нужны для вставки в позицию курсора)
  const textareaRuRef = React.useRef(null);
  const textareaEnRef = React.useRef(null);

  // Загрузка данных при открытии
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAboutContent();
    }
  }, [isOpen, isAuthenticated]);

  const loadAboutContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/about', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки контента');
      }

      const data = await response.json();

      // rawContent — строка с \n\n разделителями параграфов
      const contentRu = data.data.rawContentRu || data.data.contentRu?.join('\n\n') || '';
      const contentEn = data.data.rawContentEn || data.data.contentEn?.join('\n\n') || '';

      setForm({ contentRu, contentEn });
      setOriginalData({ contentRu, contentEn });

    } catch (err) {
      console.error('Ошибка загрузки контента "Обо мне":', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Валидация
    if (!form.contentRu.trim()) {
      setError('Контент на русском языке обязателен');
      setActiveTab('ru');
      return;
    }
    if (!form.contentEn.trim()) {
      setError('Контент на английском языке обязателен');
      setActiveTab('en');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/about', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentRu: form.contentRu.trim(),
          contentEn: form.contentEn.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка сохранения');
      }

      setSuccessMsg('Контент успешно сохранён');
      setOriginalData({ ...form });

      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccessMsg(null), 3000);

    } catch (err) {
      console.error('Ошибка сохранения контента "Обо мне":', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalData) {
      setForm({ ...originalData });
      setError(null);
    }
  };

  const hasChanges = originalData &&
    (form.contentRu !== originalData.contentRu || form.contentEn !== originalData.contentEn);

  const activeTextareaRef = activeTab === 'ru' ? textareaRuRef : textareaEnRef;
  const activeContent = activeTab === 'ru' ? form.contentRu : form.contentEn;
  const activeField = activeTab === 'ru' ? 'contentRu' : 'contentEn';

  if (!isAuthenticated) return null;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title='Управление разделом "Обо мне"'
      size="large"
    >
      <div className={styles.container}>
        {/* Сообщения */}
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        {successMsg && (
          <div className={styles.success}>{successMsg}</div>
        )}

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <>
            {/* Переключатель языка */}
            <div className={styles.langTabs}>
              <button
                className={`${styles.langTab} ${activeTab === 'ru' ? styles.langTabActive : ''}`}
                onClick={() => setActiveTab('ru')}
              >
                🇷🇺 Русский
                {form.contentRu.trim() === '' && (
                  <span className={styles.emptyBadge}>пусто</span>
                )}
              </button>
              <button
                className={`${styles.langTab} ${activeTab === 'en' ? styles.langTabActive : ''}`}
                onClick={() => setActiveTab('en')}
              >
                🇬🇧 English
                {form.contentEn.trim() === '' && (
                  <span className={styles.emptyBadge}>empty</span>
                )}
              </button>
              <button
                className={`${styles.previewToggle} ${showPreview ? styles.previewToggleActive : ''}`}
                onClick={() => setShowPreview(prev => !prev)}
              >
                {showPreview ? '✕ Скрыть' : '👁 Предпросмотр'}
              </button>
            </div>

            {/* Редактор + предпросмотр */}
            <div className={`${styles.editorLayout} ${showPreview ? styles.editorLayoutSplit : ''}`}>
              {/* Левая часть — редактор */}
              <div className={styles.editorPane}>
                <RichTextToolbar
                  textareaRef={activeTextareaRef}
                  value={activeContent}
                  onChange={(val) => setForm(prev => ({ ...prev, [activeField]: val }))}
                />

                {activeTab === 'ru' && (
                  <textarea
                    ref={textareaRuRef}
                    className={styles.textarea}
                    value={form.contentRu}
                    onChange={(e) => setForm(prev => ({ ...prev, contentRu: e.target.value }))}
                    placeholder="Введите текст на русском языке. Разделяйте параграфы пустой строкой."
                    rows={14}
                  />
                )}

                {activeTab === 'en' && (
                  <textarea
                    ref={textareaEnRef}
                    className={styles.textarea}
                    value={form.contentEn}
                    onChange={(e) => setForm(prev => ({ ...prev, contentEn: e.target.value }))}
                    placeholder="Enter text in English. Separate paragraphs with an empty line."
                    rows={14}
                  />
                )}

                <div className={styles.charCount}>
                  Символов: {activeContent.length} | Параграфов:{' '}
                  {activeContent.split('\n\n').filter(p => p.trim()).length}
                </div>
              </div>

              {/* Правая часть — предпросмотр (только если включён) */}
              {showPreview && (
                <div className={styles.previewPane}>
                  <div className={styles.previewHeader}>
                    Предпросмотр ({activeTab === 'ru' ? 'RU' : 'EN'})
                  </div>
                  <ContentPreview content={activeContent} lang={activeTab} />
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className={styles.formActions}>
              {hasChanges && (
                <button
                  className={styles.resetButton}
                  onClick={handleReset}
                  disabled={saving}
                >
                  Сбросить изменения
                </button>
              )}
              <button
                className={styles.cancelButton}
                onClick={onClose}
                disabled={saving}
              >
                Закрыть
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
};

export default AboutAdmin;
