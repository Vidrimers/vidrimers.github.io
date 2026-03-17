import React, { useState, useEffect } from 'react';
import { useAdmin } from './AdminProvider';
import AdminModal from './AdminModal';
import styles from './AuthModal.module.css';

// Модальное окно для аутентификации администратора
const AuthModal = ({ isOpen, onClose }) => {
  const { requestAuthCode, verifyCode, isLoading, error, clearError } = useAdmin();
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [wasOpen, setWasOpen] = useState(false);

  // Сброс состояния при первом открытии модального окна
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setStep('request');
      setCode('');
      setCountdown(0);
      clearError();
      setWasOpen(true);
    } else if (!isOpen) {
      setWasOpen(false);
    }
  }, [isOpen, wasOpen, clearError]);

  // Обратный отсчет для повторной отправки кода
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Запрос кода аутентификации
  const handleRequestCode = async () => {
    const result = await requestAuthCode();
    if (result.success) {
      setStep('verify');
      setCountdown(300); // 5 минут
    }
  };

  // Верификация кода
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      return;
    }

    const result = await verifyCode(code);
    if (result.success) {
      onClose();
    }
  };

  // Обработка ввода кода
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  // Возврат к запросу нового кода
  const handleBackToRequest = () => {
    setStep('request');
    setCode('');
    clearError();
  };

  // Форматирование времени обратного отсчета
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Вход в админскую панель"
      size="small"
    >
      <div className={styles.authContent}>
        {step === 'request' ? (
          // Шаг 1: Запрос кода
          <div className={styles.requestStep}>
            <p className={styles.description}>
              Для входа в админскую панель будет отправлен код подтверждения в Telegram.
            </p>
            
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <button
              className={styles.requestButton}
              onClick={handleRequestCode}
              disabled={isLoading}
            >
              {isLoading ? 'Отправка...' : 'Отправить код'}
            </button>
          </div>
        ) : (
          // Шаг 2: Ввод кода
          <div className={styles.verifyStep}>
            <p className={styles.description}>
              Введите 6-значный код, отправленный в Telegram:
            </p>

            <form onSubmit={handleVerifyCode} className={styles.codeForm}>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className={styles.codeInput}
                maxLength={6}
                autoFocus
                disabled={isLoading}
              />

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.verifyButton}
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? 'Проверка...' : 'Войти'}
                </button>

                <button
                  type="button"
                  className={styles.backButton}
                  onClick={handleBackToRequest}
                  disabled={isLoading}
                >
                  Запросить новый код
                </button>
              </div>

              {countdown > 0 && (
                <div className={styles.countdown}>
                  Код действителен: {formatCountdown(countdown)}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

export default AuthModal;