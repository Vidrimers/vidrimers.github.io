import { useContext, useEffect, useRef, useState } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import { sendDonateAddressCopyNotification } from '../../../utils/telegramNotifications';
import styles from './DonateModal.module.css';

// Fallback кошельки если API недоступен
const FALLBACK_WALLETS = [
  { id: 1, name: 'Kaspa', address: 'kaspa:qzdkq9n6p0rgp7fg3cyhuq4uznfy6a4csh5jcqt4gs355zyf3r3t2eszhhc9c', color: '#70c7ba' },
  { id: 2, name: 'TON', address: 'UQB6VnvZJXUfq3CW-xS6ku38t3fIK7RJ30a5TMTGJiJal8tr', color: '#0088cc' },
  { id: 3, name: 'USDT (TRC-20)', address: 'TYYvAa7u8agTheFHoJK6sGqPV2E6UJd6Er', color: '#26a17b' }
];

const DonateModal = ({ isOpen, onClose }) => {
  const { translations } = useContext(LanguageContext);
  const { donate } = translations;
  const modalRef = useRef(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [wallets, setWallets] = useState(FALLBACK_WALLETS);

  // Загружаем кошельки из API при открытии
  useEffect(() => {
    if (isOpen) {
      loadWallets();
    }
  }, [isOpen]);

  const loadWallets = async () => {
    try {
      const response = await fetch('/api/donate-wallets');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        setWallets(data.data);
      }
    } catch {
      // Оставляем fallback
    }
  };

  // Генерация QR-кода
  const generateQRUrl = (text) =>
    `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(text)}`;

  const generateQRUrlFallback = (text) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;

  const copyAddress = async (address, walletName) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
      await sendDonateAddressCopyNotification(walletName);
    } catch (err) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
      await sendDonateAddressCopyNotification(walletName);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {donate?.title || 'Поддержать автора'}
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            {donate?.description || 'Спасибо за поддержку проекта ❤️'}
          </p>

          <div className={styles.wallets}>
            {wallets.map((wallet) => (
              <div key={wallet.id} className={styles.wallet}>
                <div className={styles.walletHeader}>
                  <h3 className={styles.walletName} style={{ color: wallet.color }}>
                    {wallet.name}
                  </h3>
                </div>

                <div className={styles.walletContent}>
                  <div className={styles.addressSection}>
                    <div className={styles.addressBox}>
                      {copiedAddress === wallet.address ? (
                        <span className={styles.copiedMessage}>
                          {donate?.copied || 'Адрес скопирован!'}
                        </span>
                      ) : (
                        wallet.address
                      )}
                    </div>
                    <button
                      className={styles.copyButton}
                      onClick={() => copyAddress(wallet.address, wallet.name)}
                    >
                      {donate?.copyAddress || 'Скопировать адрес'}
                    </button>
                  </div>

                  <div className={styles.qrSection}>
                    <img
                      src={generateQRUrl(wallet.address)}
                      alt={`QR код для ${wallet.name}`}
                      className={styles.qrCode}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = generateQRUrlFallback(wallet.address);
                        e.target.onerror = () => { e.target.style.display = 'none'; };
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonateModal;
