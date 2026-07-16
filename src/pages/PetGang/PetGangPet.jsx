import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import styles from './PetGang.module.css';

const PetGangPet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [authorized, setAuthorized] = useState(false);
  const [pet, setPet] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Проверка авторизации
  useEffect(() => {
    const token = localStorage.getItem('petgang_token');
    if (!token) {
      navigate('/pet-gang');
      return;
    }
    fetch('/pet-gang/api/auth/check', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAuthorized(true);
        } else {
          localStorage.removeItem('petgang_token');
          navigate('/pet-gang');
        }
      })
      .catch(() => {
        localStorage.removeItem('petgang_token');
        navigate('/pet-gang');
      });
  }, [navigate]);

  useEffect(() => {
    if (authorized) loadPet();
    document.body.style.background = 'var(--pg-bg)';
    return () => { document.body.style.background = ''; };
  }, [id, authorized]);

  // Lightbox
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(null);
  const [qrData, setQrData] = useState(null); // { id, token, url, qr_image }
  const [qrLoading, setQrLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateQr = async () => {
    setQrLoading(true);
    try {
      const token = localStorage.getItem('petgang_token');
      // Генерируем QR
      const genRes = await fetch('/pet-gang/api/qr/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const genData = await genRes.json();
      if (!genData.success) { alert(genData.error); return; }

      // Привязываем к питомцу
      const bindRes = await fetch('/pet-gang/api/qr/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qr_id: genData.data.id, pet_id: parseInt(id) })
      });
      const bindData = await bindRes.json();
      if (bindData.success) {
        setQrData(genData.data);
      }
    } catch (e) {
      console.error('Ошибка генерации QR:', e);
    } finally {
      setQrLoading(false);
    }
  };

  const downloadQr = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.href = qrData.qr_image;
    link.download = `qr_${pet.name}.png`;
    link.click();
  };

  const copyQrUrl = async () => {
    if (!qrData) return;
    try {
      await navigator.clipboard.writeText(qrData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = qrData.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const photos = editing ? form.photos : (pet?.photos || []);

  const openLightbox = (index) => {
    if (editing) return;
    setLightbox({ open: true, index });
  };

  const closeLightbox = () => setLightbox({ open: false, index: 0 });

  const nextPhoto = useCallback(() => {
    setLightbox(prev => ({
      ...prev,
      index: (prev.index + 1) % photos.length
    }));
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    setLightbox(prev => ({
      ...prev,
      index: (prev.index - 1 + photos.length) % photos.length
    }));
  }, [photos.length]);

  // Клавиатура
  useEffect(() => {
    if (!lightbox.open) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox.open, nextPhoto, prevPhoto]);

  // Свайп
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) nextPhoto();
      else prevPhoto();
    }
  };

  useEffect(() => {
    loadPet();
    document.body.style.background = 'var(--pg-bg)';
    return () => { document.body.style.background = ''; };
  }, [id]);

  const loadPet = async () => {
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch(`/pet-gang/api/pets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const petData = { ...data.data.pet, photos: data.data.pet.photos || [] };
        setPet(petData);
        setForm(petData);
      }
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  };

  const savePet = async () => {
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch(`/pet-gang/api/pets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setPet(data.data);
        setForm(data.data);
        setEditing(false);
      }
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('petgang_token');
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/pet-gang/api/pets/${id}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPet({ ...pet, photos: data.data.photos });
        setForm({ ...form, photos: data.data.photos });
      } else {
        alert(data.error || 'Ошибка загрузки');
      }
    } catch (e) {
      console.error('Ошибка загрузки фото:', e);
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (index) => {
    setConfirmDeletePhoto(null);
    try {
      const token = localStorage.getItem('petgang_token');
      const res = await fetch(`/pet-gang/api/pets/${id}/photos/${index}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPet({ ...pet, photos: data.data.photos });
        setForm({ ...form, photos: data.data.photos });
      }
    } catch (e) {
      console.error('Ошибка удаления фото:', e);
    }
  };

  if (!authorized) return <div className={styles.loading}>Проверка авторизации...</div>;
  if (loading) return <div className={styles.loading}>Загрузка...</div>;
  if (!pet) return <div className={styles.loading}>Питомец не найден</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/pet-gang')}>← Назад</button>
        <h1 className={styles.title}>{editing ? 'Редактирование' : pet.name}</h1>
        {!editing && (
          <button className={styles.btnPrimary} onClick={() => setEditing(true)}>Редактировать</button>
        )}
      </header>

      {/* Фотографии */}
      <div className={styles.photosSection}>
        <div className={styles.photosGrid}>
          {(editing ? form.photos : pet.photos).map((photo, i) => (
            <div key={i} className={styles.photoWrapper} onClick={() => openLightbox(i)}>
              <img src={`/uploads/pets/${photo}`} alt="" className={styles.petPhoto} />
              {editing && (
                <button className={styles.photoDelete} onClick={(e) => { e.stopPropagation(); setConfirmDeletePhoto(i); }}>×</button>
              )}
            </div>
          ))}
          {editing && form.photos.length < 3 && (
            <div
              className={styles.photoAdd}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? '...' : '+'}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => uploadPhoto(e.target.files[0])}
        />
        {editing && <p className={styles.photoHint}>Макс. 3 фото, до 5 МБ каждое</p>}
      </div>

      {/* QR-код */}
      {!editing && (
        <div className={styles.qrSection}>
          <button className={styles.qrToggle} onClick={() => setQrOpen(!qrOpen)}>
            {qrOpen ? 'Скрыть QR-код ▲' : 'QR-код ▼'}
          </button>
          {qrOpen && (
            <div className={styles.qrCard}>
              {qrData ? (
                <>
                  <img src={qrData.qr_image} alt="QR-код" className={styles.qrImage} />
                  <p className={styles.qrUrl} onClick={copyQrUrl} title="Нажмите чтобы скопировать">
                    {copied ? 'Скопировано!' : qrData.url}
                  </p>
                  <div className={styles.qrActions}>
                    <button className={styles.btnPrimary} onClick={downloadQr}>Скачать</button>
                    <button className={styles.btn} onClick={copyQrUrl}>{copied ? 'Скопировано!' : 'Копировать ссылку'}</button>
                  </div>
                </>
              ) : (
                <button className={styles.btnPrimary} onClick={generateQr} disabled={qrLoading}>
                  {qrLoading ? 'Генерация...' : 'Создать QR-код'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Данные питомца */}
      <div className={styles.detailsSection}>
        {editing ? (
          <div className={styles.formGrid}>
            <label>Кличка *
              <input className={styles.input} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Вид *
              <select className={styles.select} value={form.species || ''} onChange={e => setForm({ ...form, species: e.target.value })}>
                <option>Кошка</option>
                <option>Собака</option>
                <option>Другое</option>
              </select>
            </label>
            <label>Порода
              <input className={styles.input} value={form.breed || ''} onChange={e => setForm({ ...form, breed: e.target.value })} />
            </label>
            <label>Пол *
              <select className={styles.select} value={form.sex || ''} onChange={e => setForm({ ...form, sex: e.target.value })}>
                <option>Мужской</option>
                <option>Женский</option>
              </select>
            </label>
            <label>Дата рождения
              <input className={styles.input} type="date" value={form.birth_date || ''} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
            </label>
            <label>Номер чипа
              <input className={styles.input} value={form.chip_number || ''} onChange={e => setForm({ ...form, chip_number: e.target.value })} />
            </label>
            <label>Номер клейма
              <input className={styles.input} value={form.tag_number || ''} onChange={e => setForm({ ...form, tag_number: e.target.value })} />
            </label>
            <label>Окрас
              <input className={styles.input} value={form.color || ''} onChange={e => setForm({ ...form, color: e.target.value })} />
            </label>
            <label>Адрес проживания
              <input className={styles.input} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={!!form.sterilized} onChange={e => setForm({ ...form, sterilized: e.target.checked })} />
              Стерилизация
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={!!form.free_walking} onChange={e => setForm({ ...form, free_walking: e.target.checked })} />
              Свободный выгул
            </label>
            <label className={styles.fullWidth}>Особые приметы
              <textarea className={styles.textarea} value={form.special_marks || ''} onChange={e => setForm({ ...form, special_marks: e.target.value })} />
            </label>
            <div className={styles.formActions}>
              <button className={styles.btn} onClick={() => { setEditing(false); setForm(pet); }}>Отмена</button>
              <button className={styles.btnPrimary} onClick={savePet}>Сохранить</button>
            </div>
          </div>
        ) : (
          <div className={styles.detailsGrid}>
            <DetailRow label="Вид" value={pet.species} />
            <DetailRow label="Порода" value={pet.breed} />
            <DetailRow label="Пол" value={pet.sex} />
            <DetailRow label="Дата рождения" value={pet.birth_date} />
            <DetailRow label="Номер чипа" value={pet.chip_number} />
            <DetailRow label="Номер клейма" value={pet.tag_number} />
            <DetailRow label="Стерилизация" value={pet.sterilized ? 'Да' : 'Нет'} />
            <DetailRow label="Окрас" value={pet.color} />
            <DetailRow label="Свободный выгул" value={pet.free_walking ? 'Да' : 'Нет'} />
            <DetailRow label="Адрес" value={pet.address} />
            {pet.special_marks && (
              <div className={styles.fullWidth}>
                <strong>Особые приметы:</strong>
                <p>{pet.special_marks}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Лайтбокс */}
      {lightbox.open && photos.length > 0 && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button className={styles.lightboxClose} onClick={closeLightbox}>×</button>
          {photos.length > 1 && (
            <>
              <button className={styles.lightboxPrev} onClick={(e) => { e.stopPropagation(); prevPhoto(); }}>‹</button>
              <button className={styles.lightboxNext} onClick={(e) => { e.stopPropagation(); nextPhoto(); }}>›</button>
            </>
          )}
          <div
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img src={`/uploads/pets/${photos[lightbox.index]}`} alt="" />
          </div>
          {photos.length > 1 && (
            <div className={styles.lightboxCounter}>
              {lightbox.index + 1} / {photos.length}
            </div>
          )}
        </div>
      )}

      {confirmDeletePhoto !== null && (
        <ConfirmModal
          title="Удалить фото?"
          message="Фотография будет удалена безвозвратно."
          onConfirm={() => deletePhoto(confirmDeletePhoto)}
          onCancel={() => setConfirmDeletePhoto(null)}
        />
      )}
    </div>
  );
};

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
};

export default PetGangPet;
