import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PetGang.module.css';

const PetGangScan = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | unbound | pet | error
  const [petData, setPetData] = useState(null);
  const [ownerContact, setOwnerContact] = useState(null);
  const [qrId, setQrId] = useState(null);

  useEffect(() => {
    if (token) {
      loadQrData();
      requestGeolocation();
    }
  }, [token]);

  const loadQrData = async () => {
    try {
      const res = await fetch(`/pet-gang/api/qr/${token}`);
      const data = await res.json();

      if (!data.success) {
        setStatus('error');
        return;
      }

      if (data.data.bound) {
        setPetData(data.data.pet);
        setOwnerContact(data.data.ownerContact);
        setStatus('pet');
        // Отправляем лог сканирования
        sendScanLog(token);
      } else {
        setQrId(data.data.qr_id);
        setStatus('unbound');
      }
    } catch (e) {
      console.error('Ошибка:', e);
      setStatus('error');
    }
  };

  const requestGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.__petgang_geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        },
        () => {
          window.__petgang_geo = null;
        },
        { timeout: 5000 }
      );
    }
  };

  const sendScanLog = async (qrToken) => {
    try {
      const geo = window.__petgang_geo;
      await fetch('/pet-gang/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: qrToken,
          latitude: geo?.lat || null,
          longitude: geo?.lon || null
        })
      });
    } catch (e) {
      console.error('Ошибка логирования:', e);
    }
  };

  if (status === 'loading') return <div className={styles.scanContainer}><div className={styles.loading}>Загрузка...</div></div>;

  if (status === 'error') return (
    <div className={styles.scanContainer}>
      <div className={styles.scanError}>
        <h2>Ошибка</h2>
        <p>QR-код не найден или недействителен</p>
      </div>
    </div>
  );

  if (status === 'unbound') return (
    <div className={styles.scanContainer}>
      <div className={styles.scanUnbound}>
        <h2>Бейдж не активирован</h2>
        <p>Этот QR-код ещё не привязан к питомцу.</p>
        <p>Обратитесь к владельцу бейджа для активации.</p>
      </div>
    </div>
  );

  return (
    <div className={styles.scanContainer}>
      <div className={styles.scanPetCard}>
        {/* Фото */}
        {petData.photos.length > 0 && (
          <div className={styles.scanPhotos}>
            {petData.photos.map((photo, i) => (
              <img key={i} src={`/uploads/pets/${photo}`} alt={petData.name} className={styles.scanPhoto} />
            ))}
          </div>
        )}

        <h1 className={styles.scanPetName}>{petData.name}</h1>

        <div className={styles.scanDetails}>
          <ScanRow label="Вид" value={petData.species} />
          <ScanRow label="Порода" value={petData.breed} />
          <ScanRow label="Пол" value={petData.sex} />
          <ScanRow label="Дата рождения" value={petData.birth_date} />
          <ScanRow label="Номер чипа" value={petData.chip_number} />
          <ScanRow label="Номер клейма" value={petData.tag_number} />
          <ScanRow label="Стерилизация" value={petData.sterilized ? 'Да' : 'Нет'} />
          <ScanRow label="Окрас" value={petData.color} />
          <ScanRow label="Свободный выгул" value={petData.free_walking ? 'Да' : 'Нет'} />
          <ScanRow label="Адрес" value={petData.address} />
          {petData.special_marks && (
            <div className={styles.scanSpecial}>
              <strong>Особые приметы:</strong>
              <p>{petData.special_marks}</p>
            </div>
          )}
        </div>

        {/* Контакты владельца */}
        {ownerContact && Object.keys(ownerContact).length > 0 && (
          <div className={styles.scanOwner}>
            <h2>Владелец</h2>
            {ownerContact.name && <p><strong>{ownerContact.name}</strong></p>}
            {ownerContact.phones?.map((phone, i) => (
              <a key={i} href={`tel:${phone}`} className={styles.scanContact}>{phone}</a>
            ))}
            {ownerContact.instagram && (
              <a href={`https://instagram.com/${ownerContact.instagram}`} target="_blank" rel="noreferrer" className={styles.scanContact}>
                Instagram: {ownerContact.instagram}
              </a>
            )}
            {ownerContact.telegram && (
              <a href={`https://t.me/${ownerContact.telegram}`} target="_blank" rel="noreferrer" className={styles.scanContact}>
                Telegram: {ownerContact.telegram}
              </a>
            )}
            {ownerContact.email && (
              <a href={`mailto:${ownerContact.email}`} className={styles.scanContact}>{ownerContact.email}</a>
            )}
            {ownerContact.city && <p>Город: {ownerContact.city}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const ScanRow = ({ label, value }) => {
  if (!value) return null;
  return <p className={styles.scanRow}><span>{label}:</span> {value}</p>;
};

export default PetGangScan;
