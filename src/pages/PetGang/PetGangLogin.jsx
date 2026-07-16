import { useState } from 'react';
import styles from './PetGang.module.css';

const PetGangLogin = ({ onLogin }) => {
  const [step, setStep] = useState('phone'); // phone | code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  const requestCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/pet-gang/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStep('code');
        // В dev-режиме показываем код
        if (data.data.code) {
          setError(`Dev код: ${data.data.code}`);
        }
      } else {
        setError(data.error || 'Ошибка отправки кода');
      }
    } catch (e) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/pet-gang/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('petgang_token', data.data.token);
        onLogin();
      } else {
        setError(data.error || 'Неверный код');
      }
    } catch (e) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Pet Gang</h1>
        <p className={styles.loginSubtitle}>Вход в паспорт питомца</p>

        {error && (
          <div className={styles.loginError}>{error}</div>
        )}

        {step === 'phone' ? (
          <div className={styles.loginForm}>
            <p className={styles.loginHint}>
              Нажмите кнопку чтобы получить код подтверждения в Telegram
            </p>
            <button
              className={styles.btnPrimary}
              onClick={requestCode}
              disabled={loading}
            >
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </div>
        ) : (
          <div className={styles.loginForm}>
            <p className={styles.loginHint}>
              Код отправлен в Telegram. Введите его ниже:
            </p>
            <input
              className={styles.input}
              type="text"
              placeholder="6-значный код"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={6}
              autoFocus
            />
            <button
              className={styles.btnPrimary}
              onClick={verifyCode}
              disabled={loading || code.length < 6}
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <button
              className={styles.btn}
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
            >
              Отправить код заново
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetGangLogin;
