import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import { useAdmin } from './AdminProvider';
import styles from './AdminDonate.module.css';

const AdminDonate = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAdmin();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [draggedWallet, setDraggedWallet] = useState(null);

  const emptyForm = { name: '', address: '', color: '#888888', isHidden: false };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadWallets();
    }
  }, [isOpen, isAuthenticated]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json'
  });

  const loadWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/donate-wallets?includeHidden=true', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Ошибка загрузки кошельков');
      const data = await response.json();
      setWallets(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setError(null);
    setForm({ ...emptyForm });
    setEditingWallet(null);
    setShowForm(true);
  };

  const handleEdit = (wallet) => {
    setError(null);
    setForm({
      name: wallet.name,
      address: wallet.address,
      color: wallet.color || '#888888',
      isHidden: wallet.isHidden
    });
    setEditingWallet(wallet);
    setShowForm(true);
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Название кошелька обязательно';
    if (!form.address.trim()) return 'Адрес кошелька обязателен';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        color: form.color,
        sortOrder: editingWallet ? editingWallet.sortOrder : wallets.length + 1,
        isHidden: form.isHidden
      };

      const url = editingWallet ? `/api/donate-wallets/${editingWallet.id}` : '/api/donate-wallets';
      const method = editingWallet ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка сохранения');
      }

      await loadWallets();
      setShowForm(false);
      setForm(emptyForm);
      setEditingWallet(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (wallet) => {
    if (!confirm(`Удалить кошелёк "${wallet.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/donate-wallets/${wallet.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка удаления');
      }
      await loadWallets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (wallet) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/donate-wallets/${wallet.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: wallet.name,
          address: wallet.address,
          color: wallet.color,
          sortOrder: wallet.sortOrder,
          isHidden: !wallet.isHidden
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ошибка изменения видимости');
      }
      await loadWallets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, wallet) => {
    setDraggedWallet(wallet);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetWallet) => {
    e.preventDefault();
    if (!draggedWallet || draggedWallet.id === targetWallet.id) {
      setDraggedWallet(null);
      return;
    }

    const newList = [...wallets];
    const fromIndex = newList.findIndex(w => w.id === draggedWallet.id);
    const toIndex = newList.findIndex(w => w.id === targetWallet.id);
    const [removed] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, removed);

    const updated = newList.map((w, i) => ({ ...w, sortOrder: i + 1 }));
    setWallets(updated);
    setDraggedWallet(null);

    try {
      const response = await fetch('/api/donate-wallets/reorder', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          wallets: updated.map(w => ({ id: w.id, sort_order: w.sortOrder }))
        })
      });
      if (!response.ok) {
        await loadWallets();
        throw new Error('Ошибка сохранения порядка');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="Управление кошельками донатов" size="medium">
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}
        {loading && <div className={styles.loading}>Загрузка...</div>}

        {!showForm ? (
          <div className={styles.list}>
            <div className={styles.header}>
              <h3>Кошельки</h3>
              <button className={styles.createButton} onClick={handleCreate} disabled={loading}>
                + Добавить кошелёк
              </button>
            </div>

            <div className={styles.dragInfo}>
              💡 Перетаскивайте кошельки для изменения порядка
            </div>

            {wallets.map(wallet => (
              <div
                key={wallet.id}
                className={`${styles.card} ${wallet.isHidden ? styles.hidden : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, wallet)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, wallet)}
              >
                <div className={styles.dragHandle}>⋮⋮</div>
                <div className={styles.colorDot} style={{ backgroundColor: wallet.color }} />
                <div className={styles.walletInfo}>
                  <div className={styles.walletName}>{wallet.name}</div>
                  <div className={styles.walletAddress}>{wallet.address}</div>
                  {wallet.isHidden && <span className={styles.hiddenFlag}>Скрыт</span>}
                </div>
                <div className={styles.actions}>
                  <button className={styles.editButton} onClick={() => handleEdit(wallet)} disabled={loading}>
                    Редактировать
                  </button>
                  <button className={styles.visibilityButton} onClick={() => handleToggleVisibility(wallet)} disabled={loading}>
                    {wallet.isHidden ? 'Показать' : 'Скрыть'}
                  </button>
                  <button className={styles.deleteButton} onClick={() => handleDelete(wallet)} disabled={loading}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}

            {wallets.length === 0 && !loading && (
              <div className={styles.emptyState}>Кошельки не найдены. Добавьте первый.</div>
            )}
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.formHeader}>
              <h3>{editingWallet ? 'Редактирование кошелька' : 'Добавление кошелька'}</h3>
              <button className={styles.backButton} onClick={() => { setShowForm(false); setError(null); }}>
                ← Назад
              </button>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="walletName">Название *</label>
              <input
                id="walletName"
                type="text"
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Kaspa, TON, Bitcoin..."
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="walletAddress">Адрес кошелька *</label>
              <textarea
                id="walletAddress"
                value={form.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                placeholder="Адрес кошелька..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="walletColor">Цвет названия</label>
              <div className={styles.colorRow}>
                <input
                  id="walletColor"
                  type="color"
                  value={form.color}
                  onChange={(e) => handleFormChange('color', e.target.value)}
                  className={styles.colorPicker}
                  disabled={loading}
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => handleFormChange('color', e.target.value)}
                  placeholder="#888888"
                  className={styles.colorText}
                  disabled={loading}
                />
                <span className={styles.colorPreview} style={{ color: form.color }}>
                  {form.name || 'Название'}
                </span>
              </div>
            </div>

            <div className={styles.flagsSection}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.isHidden}
                  onChange={(e) => handleFormChange('isHidden', e.target.checked)}
                />
                <span>Скрыть кошелёк</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelButton} onClick={() => { setShowForm(false); setError(null); }} disabled={loading}>
                Отмена
              </button>
              <button className={styles.saveButton} onClick={handleSave} disabled={loading}>
                {loading ? 'Сохранение...' : (editingWallet ? 'Обновить' : 'Создать')}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default AdminDonate;
