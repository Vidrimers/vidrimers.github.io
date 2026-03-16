import { useContext, useState } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { certificates } from '../../data/certificatesData';
import styles from './Certificates.module.css';

/**
 * Компонент секции сертификатов
 * Отображает сетку сертификатов с возможностью просмотра
 */
const Certificates = () => {
  const { translations, language } = useContext(LanguageContext);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Обработчик клика по сертификату
  const handleCertificateClick = (certificate) => {
    setSelectedCertificate(certificate);
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setSelectedCertificate(null);
  };

  // Проверка наличия данных
  if (!certificates || certificates.length === 0) {
    return (
      <section className={styles.certificates} id="certificates" data-testid="certificates-section">
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <h2 className={styles.title}>
              {translations.certificates.title}
            </h2>
            <div className={styles.empty}>
              <p>{translations.certificates.empty || 'Сертификаты не найдены'}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.certificates} id="certificates" data-testid="certificates-section">
      <div className={styles.wrapper}>
        <div className={styles.container}>
          {/* Заголовок секции */}
          <h2 className={styles.title}>
            {translations.certificates.title}
          </h2>
          
          {/* Описание секции */}
          {translations.certificates.description && (
            <p className={styles.description}>
              {translations.certificates.description}
            </p>
          )}
          
          {/* Сетка сертификатов */}
          <div className={styles.items} role="grid" aria-label={translations.certificates.title}>
            {certificates.map((certificate, index) => (
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
            ))}
          </div>
          
          {/* Счетчик сертификатов */}
          <div className={styles.counter}>
            <span className={styles.counterText}>
              {translations.certificates.total || 'Всего сертификатов'}: {certificates.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* Модальное окно для просмотра сертификата */}
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
            
            {/* Кнопка для перехода к оригиналу сертификата */}
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
    </section>
  );
};

export default Certificates;