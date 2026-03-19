import { useContext, useState, useEffect, useMemo } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { useAdmin } from '../Admin/AdminProvider';
import { certificates as staticCertificates } from '../../data/certificatesData';
import AdminIndicator from '../Admin/AdminIndicator';
import CertificatesAdmin from '../Admin/CertificatesAdmin';
import styles from './Certificates.module.css';

/**
 * Компонент секции сертификатов
 * Данные загружаются из API (БД), с fallback на статические данные
 */
const Certificates = () => {
  const { translations, language } = useContext(LanguageContext);
  const { isAuthenticated } = useAdmin();
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [apiCertificates, setApiCertificates] = useState(null);
  const [isCertificatesAdminOpen, setIsCertificatesAdminOpen] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const response = await fetch('/api/certificates');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setApiCertificates(data.data || []);
    } catch {
      setApiCertificates(null); // fallback на статические данные
    }
  };

  // Нормализуем данные из API в формат, совместимый со статическими данными
  const certificates = useMemo(() => {
    if (apiCertificates !== null) {
      return apiCertificates.map(cert => ({
        id: cert.id,
        image: cert.image_path,
        alt: cert.title_ru || `Сертификат #${cert.id}`,
        altEn: cert.title_en || `Certificate #${cert.id}`,
        link: cert.link || '#'
      }));
    }
    return staticCertificates;
  }, [apiCertificates]);

  const handleCertificateClick = (certificate) => {
    setSelectedCertificate(certificate);
  };

  const handleCloseModal = () => {
    setSelectedCertificate(null);
  };

  const certificateItems = useMemo(() => {
    if (!certificates || certificates.length === 0) return [];

    return certificates.map((certificate, index) => (
      <div
        key={certificate.id}
        className={styles.item}
        role="gridcell"
        tabIndex={0}
        onClick={() => handleCertificateClick(certificate)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCertificateClick(certificate);
          }
        }}
        aria-label={`Сертификат ${index + 1}`}
      >
        <img
          className={styles.img}
          src={certificate.image}
          alt={language === 'ru' ? certificate.alt : certificate.altEn}
          loading="lazy"
        />
      </div>
    ));
  }, [certificates, language]);

  if (!certificates || certificates.length === 0) {
    return (
      <section className={styles.certificates} id="certificates" data-testid="certificates-section">
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div className={styles.titleWrapper}>
              <h2 className={styles.title}>
                {translations.certificates.title}
                <AdminIndicator
                  section="Сертификаты"
                  onClick={() => setIsCertificatesAdminOpen(true)}
                />
              </h2>
            </div>
            <div className={styles.empty}>
              <p>{translations.certificates.empty || 'Сертификаты не найдены'}</p>
            </div>
          </div>
        </div>
        {isAuthenticated && (
          <CertificatesAdmin
            isOpen={isCertificatesAdminOpen}
            onClose={() => {
              setIsCertificatesAdminOpen(false);
              loadCertificates();
            }}
          />
        )}
      </section>
    );
  }

  return (
    <section className={styles.certificates} id="certificates" data-testid="certificates-section">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>
              {translations.certificates.title}
              <AdminIndicator
                section="Сертификаты"
                onClick={() => setIsCertificatesAdminOpen(true)}
              />
            </h2>
          </div>

          {translations.certificates.description && (
            <p className={styles.description}>
              {translations.certificates.description}
            </p>
          )}

          <div className={styles.items} role="grid" aria-label={translations.certificates.title}>
            {certificateItems}
          </div>

          <div className={styles.counter}>
            <span className={styles.counterText}>
              {translations.certificates.total || 'Всего сертификатов'}: {certificates.length}
            </span>
          </div>
        </div>
      </div>

      {/* Просмотр сертификата */}
      {selectedCertificate && (
        <div
          className={styles.modal}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={handleCloseModal}
              aria-label={translations.certificates.close || 'Закрыть'}
            >
              ×
            </button>

            <img
              className={styles.modalImg}
              src={selectedCertificate.image}
              alt={language === 'ru' ? selectedCertificate.alt : selectedCertificate.altEn}
              id="certificate-modal-title"
            />

            {selectedCertificate.link && selectedCertificate.link !== '#' && (
              <div className={styles.modalActions}>
                <a
                  href={selectedCertificate.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalButton}
                >
                  {translations.certificates.viewOriginal || 'Посмотреть оригинал'}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модал управления сертификатами */}
      {isAuthenticated && (
        <CertificatesAdmin
          isOpen={isCertificatesAdminOpen}
          onClose={() => {
            setIsCertificatesAdminOpen(false);
            loadCertificates();
          }}
        />
      )}
    </section>
  );
};

export default Certificates;
