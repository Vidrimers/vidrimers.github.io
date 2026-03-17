/**
 * Утилиты для отправки уведомлений в Telegram
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1989';

/**
 * Отправить уведомление об открытии модалки донатов
 */
export const sendDonateModalNotification = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/telegram/donate-modal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Не удалось отправить уведомление о донатах');
      return false;
    }

    console.log('Уведомление о донатах отправлено');
    return true;
  } catch (error) {
    console.warn('Ошибка отправки уведомления о донатах:', error);
    return false;
  }
};

/**
 * Отправить уведомление о копировании адреса доната
 * @param {string} walletName - Название кошелька
 */
export const sendDonateAddressCopyNotification = async (walletName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/telegram/donate-copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletName }),
    });

    if (!response.ok) {
      console.warn('Не удалось отправить уведомление о копировании');
      return false;
    }

    console.log(`Уведомление о копировании ${walletName} отправлено`);
    return true;
  } catch (error) {
    console.warn('Ошибка отправки уведомления о копировании:', error);
    return false;
  }
};

/**
 * Отправить уведомление о клике по проекту в портфолио
 * @param {string} projectId - ID проекта
 * @param {string} projectTitle - Название проекта
 */
export const sendPortfolioClickNotification = async (projectId, projectTitle) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/telegram/portfolio-click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId, projectTitle }),
    });

    if (!response.ok) {
      console.warn('Не удалось отправить уведомление о клике');
      return false;
    }

    console.log(`Уведомление о клике по ${projectId} отправлено`);
    return true;
  } catch (error) {
    console.warn('Ошибка отправки уведомления о клике:', error);
    return false;
  }
};