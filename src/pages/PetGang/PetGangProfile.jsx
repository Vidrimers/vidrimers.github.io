import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PetGang.module.css';

const PetGangProfile = () => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('visibility');
  const [profile, setProfile] = useState({
    name: '', phones: [''], country: '', city: '', instagram: '', telegram: '', email: '',
    visibility_settings: { show_name: false, show_phones: false, show_instagram: false, show_telegram: false, show_email: false, show_city: false }
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // QR codes state
  const [qrList, setQrList] = useState([]);
  const [pets, setPets] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [bindModal, setBindModal] = useState(null); // qr id or null
  const [qrSaved, setQrSaved] = useState(false);
  const [showCreatePet, setShowCreatePet] = useState(false);
  const [newPet, setNewPet] = useState({ name: '', species: 'Кошка', sex: 'Мужской', customSpecies: '' });

  useEffect(() => {
    const token = localStorage.getItem('petgang_token');
    if (!token) { navigate('/pet-gang'); return; }
    fetch('/pet-gang/api/auth/check', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAuthorized(true);
          loadProfile();
        } else {
          localStorage.removeItem('petgang_token');
          navigate('/pet-gang');
        }
      })
      .catch(() => {
        localStorage.removeItem('petgang_token');
        navigate('/pet-gang');
      });
    document.title = 'Профиль — Pet Gang';
    document.body.style.background = 'var(--pg-bg)';
    return () => { document.body.style.background = ''; };
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/pet-gang/api/profile');
      const data = await res.json();
      if (data.success && data.data) {
        const profileData = data.data;
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

  // === QR TAB ===

  const loadQrList = async () => {
    setQrLoading(true);
    try {
      const token = localStorage.getItem('petgang_token');
      const [qrRes, petsRes] = await Promise.all([
        fetch('/pet-gang/api/qr', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/pet-gang/api/pets', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const qrData = await qrRes.json();
      const petsData = await petsRes.json();
      if (qrData.success) setQrList(qrData.data);
      if (petsData.success) setPets(petsData.data);
    } catch (e) {
      console.error('Ошибка загрузки QR:', e);
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && activeTab === 'qr') loadQrList();
  }, [authorized, activeTab]);

  const bindQr = async (qrId, petId) => {
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch('/pet-gang/api/qr/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qr_id: qrId, pet_id: petId })
      });
      const data = await res.json();
      if (data.success) {
        setBindModal(null);
        setQrSaved(true);
        setTimeout(() => setQrSaved(false), 2000);
        loadQrList();
      }
    } catch (e) {
      console.error('Ошибка привязки QR:', e);
    }
  };

  const unbindQr = async (qrId) => {
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch('/pet-gang/api/qr/unbind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qr_id: qrId })
      });
      const data = await res.json();
      if (data.success) loadQrList();
    } catch (e) {
      console.error('Ошибка отвязки QR:', e);
    }
  };

  const createPet = async () => {
    if (!newPet.name.trim()) return;
    const species = newPet.species === 'Другое' && newPet.customSpecies?.trim()
      ? newPet.customSpecies.trim()
      : newPet.species;
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch('/pet-gang/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newPet, species })
      });
      const data = await res.json();
      if (data.success) {
        const pet = { ...data.data, photos: data.data.photos || [] };
        setPets([pet, ...pets]);
        setShowCreatePet(false);
        setNewPet({ name: '', species: 'Кошка', sex: 'Мужской', customSpecies: '' });

        // Если был QR для привязки — привязываем к новому питомцу
        if (bindModal) {
          await bindQr(bindModal, data.data.id);
          setBindModal(null);
        }
      }
    } catch (e) {
      console.error('Ошибка создания питомца:', e);
    }
  };

  if (!authorized) return <div className={styles.loading}>Проверка авторизации...</div>;
  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  // Питомцы без QR
  const petsWithoutQr = pets.filter(p => !qrList.some(q => q.is_bound && q.pet_id === p.id));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/pet-gang')}>← Назад</button>
        <h1 className={styles.title}>Профиль владельца</h1>
      </header>

      {/* Форма профиля */}
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
        <div className={styles.fullWidth}>
          <label>Телефоны</label>
          {profile.phones.map((phone, i) => (
            <div key={i} className={styles.phoneRow}>
              <input className={styles.input} value={phone} onChange={e => updatePhone(i, e.target.value)} placeholder="+7 (999) 123-45-67" />
              {i > 0 && <button className={styles.removeBtn} onClick={() => removePhone(i)}>×</button>}
            </div>
          ))}
          <button className={styles.addPhoneBtn} onClick={addPhone}>+ Добавить телефон</button>
        </div>
      </div>

      <div className={styles.formActions}>
        <button className={styles.btnPrimary} onClick={saveProfile}>
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      {/* Табы */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'visibility' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('visibility')}
        >
          Настройки видимости
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'qr' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          Мои QR-коды
        </button>
      </div>

      {/* Таб: Настройки видимости */}
      {activeTab === 'visibility' && (
        <div className={styles.visibilitySection}>
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
          <div className={styles.formActions}>
            <button className={styles.btnPrimary} onClick={saveProfile}>
              {saved ? 'Сохранено!' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Таб: Мои QR-коды */}
      {activeTab === 'qr' && (
        <div className={styles.qrTabSection}>
          {qrLoading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : (
            <>
              {/* Привязанные QR */}
              {qrList.filter(q => q.is_bound).length > 0 && (
                <div className={styles.qrGroup}>
                  <h3 className={styles.qrGroupTitle}>Привязанные к питомцам</h3>
                  {qrList.filter(q => q.is_bound).map(qr => (
                    <div key={qr.id} className={styles.qrItem}>
                      <div className={styles.qrItemInfo}>
                        <span className={styles.qrItemPet}>{qr.pet_name} ({qr.pet_species})</span>
                        <span className={styles.qrItemToken}>{qr.token.slice(0, 12)}...</span>
                      </div>
                      <div className={styles.qrItemActions}>
                        <a href={qr.url} target="_blank" rel="noreferrer" className={styles.btn}>Открыть</a>
                        <button className={styles.btn} onClick={() => navigate(`/pet-gang/pet/${qr.pet_id}`)}>Редактировать</button>
                        <button className={styles.btnDangerSmall} onClick={() => unbindQr(qr.id)}>Отвязать</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Свободные QR */}
              {qrList.filter(q => !q.is_bound).length > 0 && (
                <div className={styles.qrGroup}>
                  <h3 className={styles.qrGroupTitle}>Свободные (не привязаны)</h3>
                  {qrList.filter(q => !q.is_bound).map(qr => (
                    <div key={qr.id} className={styles.qrItem}>
                      <div className={styles.qrItemInfo}>
                        <span className={styles.qrItemToken}>{qr.token.slice(0, 16)}...</span>
                      </div>
                      <div className={styles.qrItemActions}>
                        <button
                          className={styles.btnPrimary}
                          onClick={() => setBindModal(qr.id)}
                        >
                          Привязать
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {qrList.length === 0 && (
                <p className={styles.empty}>Нет QR-кодов. Создайте в карточке питомца.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Модалка привязки */}
      {bindModal && (
        <div className={styles.modal} onClick={() => setBindModal(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Привязать QR к питомцу</h2>
            {pets.length === 0 ? (
              <>
                <p className={styles.empty}>Нет карточек животных</p>
                <button className={styles.btnPrimary} onClick={() => { setShowCreatePet(true); }}>
                  Создать карточку
                </button>
              </>
            ) : petsWithoutQr.length === 0 ? (
              <>
                <p className={styles.empty}>У всех карточек уже есть QR-код</p>
                <button className={styles.btnPrimary} onClick={() => { setShowCreatePet(true); }}>
                  Создать новую карточку
                </button>
              </>
            ) : (
              <div className={styles.bindList}>
                {petsWithoutQr.map(pet => (
                  <button key={pet.id} className={styles.bindItem} onClick={() => bindQr(bindModal, pet.id)}>
                    <span>{pet.name}</span>
                    <span className={styles.bindItemSpecies}>{pet.species}</span>
                  </button>
                ))}
              </div>
            )}
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setBindModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания питомца (для привязки QR) */}
      {showCreatePet && (
        <div className={styles.modal} onClick={() => setShowCreatePet(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Новый питомец</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Кличка</label>
              <input className={styles.input} placeholder="Введите кличку" value={newPet.name}
                onChange={e => setNewPet({ ...newPet, name: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Вид</label>
              <select className={styles.select} value={newPet.species}
                onChange={e => setNewPet({ ...newPet, species: e.target.value })}>
                <option>Кошка</option><option>Собака</option><option>Другое</option>
              </select>
            </div>
            {newPet.species === 'Другое' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название вида</label>
                <input className={styles.input} placeholder="Введите вид" value={newPet.customSpecies || ''}
                  onChange={e => setNewPet({ ...newPet, customSpecies: e.target.value })} />
              </div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Пол</label>
              <select className={styles.select} value={newPet.sex}
                onChange={e => setNewPet({ ...newPet, sex: e.target.value })}>
                <option>Мужской</option><option>Женский</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setShowCreatePet(false)}>Отмена</button>
              <button className={styles.btnPrimary} onClick={createPet}>Создать и привязать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetGangProfile;
