const TelegramBot = require('node-telegram-bot-api');

/**
 * Модуль для отправки уведомлений в Telegram
 */
class Telegram {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram не настроен: отсутствуют TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
      this.isEnabled = false;
      return;
    }
    
    this.isEnabled = true;
    this.bot = new TelegramBot(this.botToken);
    
    console.log('Telegram бот инициализирован');
  }

  /**
   * Получить название проекта по ID
   * @param {string} projectId - ID проекта
   * @returns {string} - Название проекта
   */
  getProjectTitle(projectId) {
    // Маппинг ID проектов к их названиям
    const projectTitles = {
      'pet-1': 'Страница колориста',
      'pet-2': 'ЛФК "Креатив"',
      'pet-3': 'НПП Полет',
      'layout-1': 'Mavic 2 Pro',
      'layout-2': 'Итоговая работа в AcademyTOP'
    };
    
    return projectTitles[projectId] || `Проект ${projectId}`;
  }

  /**
   * Форматировать сообщение о лайке
   * @param {string} projectId - ID проекта
   * @param {number} likesCount - Количество лайков
   * @returns {string} - Отформатированное сообщение
   */
  formatLikeMessage(projectId, likesCount) {
    const projectTitle = this.getProjectTitle(projectId);
    const heartEmoji = '❤️';
    const projectEmoji = '🚀';
    
    let message = `${projectEmoji} Новый лайк!\n\n`;
    message += `Проект: ${projectTitle}\n`;
    message += `${heartEmoji} Всего лайков: ${likesCount}\n\n`;
    message += `#портфолио #лайк #vidrimers`;
    
    return message;
  }

  /**
   * Отправить уведомление о лайке в Telegram
   * @param {string} projectId - ID проекта
   * @param {number} likesCount - Количество лайков
   * @returns {Promise<boolean>} - Успешность отправки
   */
  async sendLikeNotification(projectId, likesCount) {
    if (!this.isEnabled) {
      console.log(`[Telegram отключен] Проект ${projectId} получил лайк! Всего лайков: ${likesCount}`);
      return false;
    }

    try {
      const message = this.formatLikeMessage(projectId, likesCount);
      
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      
      console.log(`[Telegram] Уведомление отправлено: ${projectId} - ${likesCount} лайков`);
      return true;
      
    } catch (error) {
      console.error('[Telegram] Ошибка отправки уведомления:', error.message);
      
      // Логируем детали ошибки для отладки
      if (error.response) {
        console.error('[Telegram] Детали ошибки:', {
          status: error.response.statusCode,
          body: error.response.body
        });
      }
      
      return false;
    }
  }

  /**
   * Отправить уведомление об открытии модалки донатов
   * @returns {Promise<boolean>} - Успешность отправки
   */
  async sendDonateModalNotification() {
    if (!this.isEnabled) {
      console.log(`[Telegram отключен] Открыта модалка донатов`);
      return false;
    }

    try {
      const message = `💰 Открыта модалка донатов!\n\n` +
                     `Кто-то заинтересовался поддержкой проекта ❤️\n\n` +
                     `#донаты #поддержка #vidrimers`;
      
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      
      console.log(`[Telegram] Уведомление о донатах отправлено`);
      return true;
      
    } catch (error) {
      console.error('[Telegram] Ошибка отправки уведомления о донатах:', error.message);
      return false;
    }
  }

  /**
   * Отправить уведомление о копировании адреса доната
   * @param {string} walletName - Название кошелька
   * @returns {Promise<boolean>} - Успешность отправки
   */
  async sendDonateAddressCopyNotification(walletName) {
    if (!this.isEnabled) {
      console.log(`[Telegram отключен] Скопирован адрес ${walletName}`);
      return false;
    }

    try {
      const message = `💳 Скопирован адрес кошелька!\n\n` +
                     `Кошелёк: ${walletName}\n` +
                     `Возможно, готовятся к донату! 🎉\n\n` +
                     `#донаты #копирование #vidrimers`;
      
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      
      console.log(`[Telegram] Уведомление о копировании ${walletName} отправлено`);
      return true;
      
    } catch (error) {
      console.error('[Telegram] Ошибка отправки уведомления о копировании:', error.message);
      return false;
    }
  }

  /**
   * Отправить уведомление о клике по проекту в портфолио
   * @param {string} projectId - ID проекта
   * @param {string} projectTitle - Название проекта
   * @returns {Promise<boolean>} - Успешность отправки
   */
  async sendPortfolioClickNotification(projectId, projectTitle) {
    if (!this.isEnabled) {
      console.log(`[Telegram отключен] Клик по проекту ${projectId}`);
      return false;
    }

    try {
      // Используем переданное название или fallback к старому методу
      const title = projectTitle || this.getProjectTitle(projectId);
      const message = `🔗 Переход к проекту!\n\n` +
                     `Проект: ${title}\n` +
                     `Кто-то заинтересовался работой! 👀\n\n` +
                     `#портфолио #переход #vidrimers`;
      
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      
      console.log(`[Telegram] Уведомление о клике по ${projectId} отправлено`);
      return true;
      
    } catch (error) {
      console.error('[Telegram] Ошибка отправки уведомления о клике:', error.message);
      return false;
    }
  }

  /**
   * Отправить тестовое сообщение
   * @returns {Promise<boolean>} - Успешность отправки
   */
  async sendTestMessage() {
    if (!this.isEnabled) {
      console.log('[Telegram отключен] Тестовое сообщение не отправлено');
      return false;
    }

    try {
      const message = '🧪 Тестовое сообщение от vidrimers.site\n\nСистема уведомлений работает!';
      
      await this.bot.sendMessage(this.chatId, message);
      
      console.log('[Telegram] Тестовое сообщение отправлено');
      return true;
      
    } catch (error) {
      console.error('[Telegram] Ошибка отправки тестового сообщения:', error.message);
      return false;
    }
  }

  /**
   * Проверить статус бота
   * @returns {Promise<Object>} - Информация о боте
   */
  async getBotInfo() {
    if (!this.isEnabled) {
      return { enabled: false, error: 'Telegram не настроен' };
    }

    try {
      const botInfo = await this.bot.getMe();
      return {
        enabled: true,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name
        }
      };
    } catch (error) {
      return {
        enabled: false,
        error: error.message
      };
    }
  }
}

module.exports = Telegram;