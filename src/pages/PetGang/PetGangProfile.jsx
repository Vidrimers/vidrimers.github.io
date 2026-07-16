import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PetGang.module.css';

const PetGangProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '', phones: [''], country: '', city: '', instagram: '', telegram: '', email: '',
    visibility_settings: { show_name: false, show_phones: false, show_instagram: false, show_telegram: false, show_email: false, show_city: false }
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
    document.title = 'Профиль — Pet Gang';
    document.body.style.background = 'var(--pg-bg)';
    return () => { document.body.style.background = ''; };
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/pet-gang/api/profile');
      const data = await res.json();
      if (data.success && data.data) {
        const profileData = data.data;
        // Гарантируем что phones — массив и каждый номер начинается с +
        if (!Array.isArray(profileData.phones) || profileData.phones.length === 0) {
          profileData.phones = ['+7'];
        } else {
          profileData.phones = profileData.phones.map(p => p && !p.startsWith('+') ? '+' + p : p);
        }
        setProfile(profileData);
      }
    } catch (e) {
      console.error('Ошибка загрузки профиля:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch('/pet-gang/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    }
  };

  const addPhone = () => setProfile({ ...profile, phones: [...profile.phones, '+7'] });
  const removePhone = (i) => setProfile({ ...profile, phones: profile.phones.filter((_, idx) => idx !== i) });
  const updatePhone = (i, val) => {
    const phones = [...profile.phones];
    // Если поле было пустым и пользователь вводит цифру — добавляем +7
    if ((phones[i] === '' || phones[i] === '+') && /^\d$/.test(val)) {
      phones[i] = '+7' + val;
    } else {
      phones[i] = val;
    }
    setProfile({ ...profile, phones });
  };

  const toggleVisibility = (key) => {
    setProfile({
      ...profile,
      visibility_settings: { ...profile.visibility_settings, [key]: !profile.visibility_settings[key] }
    });
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/pet-gang')}>← Назад</button>
        <h1 className={styles.title}>Профиль владельца</h1>
      </header>

      <div className={styles.formGrid}>
        <label>Имя
          <input className={styles.input} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
        </label>

        <label>Страна
          <input className={styles.input} value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })} />
        </label>

        <label>Город
          <input className={styles.input} value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })} />
        </label>

        <label>Instagram
          <input className={styles.input} value={profile.instagram} onChange={e => setProfile({ ...profile, instagram: e.target.value })} placeholder="username" />
        </label>

        <label>Telegram
          <input className={styles.input} value={profile.telegram} onChange={e => setProfile({ ...profile, telegram: e.target.value })} placeholder="username" />
        </label>

        <label>Электронная почта
          <input className={styles.input} type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
        </label>

        {/* Телефоны */}
        <div className={styles.fullWidth}>
          <label>Телефоны</label>
          {profile.phones.map((phone, i) => (
            <div key={i} className={styles.phoneRow}>
              <input className={styles.input} value={phone} onChange={e => updatePhone(i, e.target.value)} placeholder="+7 (999) 123-45-67" />
              {i > 0 && (
                <button className={styles.removeBtn} onClick={() => removePhone(i)}>×</button>
              )}
            </div>
          ))}
          <button className={styles.addPhoneBtn} onClick={addPhone}>+ Добавить телефон</button>
        </div>
      </div>

      {/* Настройки видимости */}
      <div className={styles.visibilitySection}>
        <h2>Настройки видимости</h2>
        <p className={styles.visibilityHint}>Выберите, какие данные будут видны при сканировании QR-кода</p>
        {[
          ['show_name', 'Имя владельца'],
          ['show_phones', 'Телефон(ы)'],
          ['show_instagram', 'Instagram'],
          ['show_telegram', 'Telegram'],
          ['show_email', 'Электронная почта'],
          ['show_city', 'Город']
        ].map(([key, label]) => (
          <label key={key} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!!profile.visibility_settings[key]}
              onChange={() => toggleVisibility(key)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className={styles.formActions}>
        <button className={styles.btnPrimary} onClick={saveProfile}>
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
};

export default PetGangProfile;
