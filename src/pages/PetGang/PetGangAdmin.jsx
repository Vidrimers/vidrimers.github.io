import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PetGangLogin from './PetGangLogin';
import ConfirmModal from './ConfirmModal';
import styles from './PetGang.module.css';

// Компонент карусели фото
const PhotoCarousel = ({ photos, name }) => {
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);

  // Автослайд каждые 5 сек
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % photos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [photos.length]);

  // Прокрутка к текущему фото
  useEffect(() => {
    if (!scrollRef.current) return;
    const photoWidth = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({ left: photoWidth * current, behavior: 'smooth' });
  }, [current]);

  // Свайп
  const touchStartX = useRef(0);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setCurrent(prev => Math.min(prev + 1, photos.length - 1));
      else setCurrent(prev => Math.max(prev - 1, 0));
    }
  };

  return (
    <div
      className={styles.petPhotosScroll}
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {photos.map((photo, i) => (
        <img key={i} src={`/uploads/pets/${photo}`} alt={name} className={styles.petPhoto} />
      ))}
    </div>
  );
};

const PetGangAdmin = () => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pets, setPets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPet, setNewPet] = useState({ name: '', species: 'Кошка', sex: 'Мужской' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    checkAuth();
    document.title = 'Pet Gang — Управление питомцами';
    document.body.style.background = 'var(--pg-bg)';
    return () => { document.body.style.background = ''; };
  }, []);

  // Drag vs click
  const dragRef = useRef({ startX: 0, startY: 0, dragged: false });

  const handleMouseDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, dragged: false };
  };

  const handleMouseMove = (e) => {
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 5 || dy > 5) dragRef.current.dragged = true;
  };

  const handleCardClick = (petId) => {
    if (dragRef.current.dragged) { dragRef.current.dragged = false; return; }
    navigate(`/pet-gang/pet/${petId}`);
  };

  const getToken = () => localStorage.getItem('petgang_token');

  const checkAuth = async () => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    try {
      const res = await fetch('/pet-gang/api/auth/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAuthorized(true);
        loadPets();
        loadStats();
      } else {
        localStorage.removeItem('petgang_token');
      }
    } catch (e) {
      localStorage.removeItem('petgang_token');
    } finally {
      setChecking(false);
    }
  };

  const loadPets = async () => {
    try {
      const token = getToken();
      const res = await fetch('/pet-gang/api/pets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPets(data.data);
    } catch (e) {
      console.error('Ошибка загрузки питомцев:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = getToken();
      const res = await fetch('/pet-gang/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    }
  };

  const createPet = async () => {
    if (!newPet.name.trim()) return;
    const species = newPet.species === 'Другое' && newPet.customSpecies?.trim()
      ? newPet.customSpecies.trim()
      : newPet.species;
    try {
      const token = getToken();
      const res = await fetch('/pet-gang/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newPet, species })
      });
      const data = await res.json();
      if (data.success) {
        const pet = { ...data.data, photos: data.data.photos || [] };
        setPets([pet, ...pets]);
        setShowCreateForm(false);
        setNewPet({ name: '', species: 'Кошка', sex: 'Мужской', customSpecies: '' });
      }
    } catch (e) {
      console.error('Ошибка создания питомца:', e);
    }
  };

  const deletePet = async (id) => {
    setConfirmDelete(null);
    try {
      const token = getToken();
      await fetch(`/pet-gang/api/pets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPets(pets.filter(p => p.id !== id));
    } catch (e) {
      console.error('Ошибка удаления:', e);
    }
  };

  const logout = () => {
    localStorage.removeItem('petgang_token');
    setAuthorized(false);
  };

  if (checking) return <div className={styles.loading}>Загрузка...</div>;

  if (!authorized) {
    return <PetGangLogin onLogin={() => { setAuthorized(true); setLoading(true); loadPets(); loadStats(); }} />;
  }

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pet Gang</h1>
        <p className={styles.subtitle}>Управление паспортами питомцев</p>
        <button className={styles.logoutBtn} onClick={logout}>Выйти</button>
      </header>

      {stats && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.total_pets}</span>
            <span className={styles.statLabel}>Питомцев</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.bound_qr}</span>
            <span className={styles.statLabel}>Активных QR</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.unbound_qr}</span>
            <span className={styles.statLabel}>Свободных QR</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.total_scans}</span>
            <span className={styles.statLabel}>Сканирований</span>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => navigate('/pet-gang/profile')}>Профиль</button>
        <button className={styles.btnPrimary} onClick={() => setShowCreateForm(true)}>+ Добавить питомца</button>
      </div>

      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Новый питомец</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Кличка</label>
              <input
                className={styles.input}
                placeholder="Введите кличку"
                value={newPet.name}
                onChange={e => setNewPet({ ...newPet, name: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Вид</label>
              <select
                className={styles.select}
                value={newPet.species}
                onChange={e => setNewPet({ ...newPet, species: e.target.value })}
              >
                <option>Кошка</option>
                <option>Собака</option>
                <option>Другое</option>
              </select>
            </div>
            {newPet.species === 'Другое' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название вида</label>
                <input
                  className={styles.input}
                  placeholder="Введите вид животного"
                  value={newPet.customSpecies || ''}
                  onChange={e => setNewPet({ ...newPet, customSpecies: e.target.value })}
                />
              </div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Пол</label>
              <select
                className={styles.select}
                value={newPet.sex}
                onChange={e => setNewPet({ ...newPet, sex: e.target.value })}
              >
                <option>Мужской</option>
                <option>Женский</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setShowCreateForm(false)}>Отмена</button>
              <button className={styles.btnPrimary} onClick={createPet}>Создать</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.petsGrid}>
        {pets.length === 0 ? (
          <p className={styles.empty}>Нет карточек питомцев. Добавьте первого!</p>
        ) : (
          pets.map(pet => (
            <div
              key={pet.id}
              className={styles.petCard}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onClick={() => handleCardClick(pet.id)}
            >
              {pet.photos.length > 0 ? (
                <PhotoCarousel photos={pet.photos} name={pet.name} />
              ) : (
                <div className={styles.petPhotoPlaceholder}>Нет фото</div>
              )}
              <div className={styles.petInfo}>
                <h3 className={styles.petName}>{pet.name}</h3>
                <p className={styles.petSpecies}>{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</p>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(pet.id); }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Удалить карточку?"
          message="Питомец и все его фотографии будут удалены безвозвратно."
          onConfirm={() => deletePet(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default PetGangAdmin;
