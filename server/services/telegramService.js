/**
 * Сервис для работы с Telegram Bot API
 * Отправка кодов подтверждения и уведомлений администратору
 */

const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    }
    
    if (!this.adminChatId) {
      throw new Error('TELEGRAM_ADMIN_CHAT_ID не найден в переменных окружения');
    }

    // Инициализируем бота
    this.bot = new TelegramBot(this.botToken, { polling: false });
  }

  /**
   * Отправляет код подтверждения администратору
   * @param {string} verificationCode - 6-значный код подтверждения
   * @returns {Promise<boolean>} Результат отправки
   */
  async sendVerificationCode(verificationCode) {
    try {
      const message = `🔐 Код подтверждения для входа в админ-панель:\n\n` +
                     `<code>${verificationCode}</code>\n\n` +
                     `⏰ Код действителен 5 минут\n` +
                     `🌐 Сайт: vidrimers.site`;

      await this.bot.sendMessage(this.adminChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      return true;
    } catch (error) {
      console.error('Ошибка отправки кода в Telegram:', error);
      return false;
    }
  }

  /**
   * Отправляет уведомление о входе в админ-панель
   * @param {string} sessionInfo - Информация о сессии
   * @returns {Promise<boolean>} Результат отправки
   */
  async sendLoginNotification(sessionInfo = {}) {
    try {
      const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow'
      });

      const message = `✅ Вход в админ-панель выполнен\n\n` +
                     `🕐 Время: ${timestamp}\n` +
                     `🌐 IP: ${sessionInfo.ip || 'неизвестен'}\n` +
                     `🖥️ User-Agent: ${sessionInfo.userAgent ? sessionInfo.userAgent.substring(0, 50) + '...' : 'неизвестен'}\n` +
                     `🔗 Сайт: vidrimers.site`;

      await this.bot.sendMessage(this.adminChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      return true;
    } catch (error) {
      console.error('Ошибка отправки уведомления о входе:', error);
      return false;
    }
  }

  /**
   * Отправляет уведомление о неудачной попытке входа
   * @param {string} attemptInfo - Информация о попытке
   * @returns {Promise<boolean>} Результат отправки
   */
  async sendFailedLoginNotification(attemptInfo = {}) {
    try {
      const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow'
      });

      const message = `❌ Неудачная попытка входа в админ-панель\n\n` +
                     `🕐 Время: ${timestamp}\n` +
                     `🌐 IP: ${attemptInfo.ip || 'неизвестен'}\n` +
                     `🔢 Введенный код: ${attemptInfo.code ? attemptInfo.code.substring(0, 2) + '****' : 'неизвестен'}\n` +
                     `🖥️ User-Agent: ${attemptInfo.userAgent ? attemptInfo.userAgent.substring(0, 50) + '...' : 'неизвестен'}\n` +
                     `🔗 Сайт: vidrimers.site`;

      await this.bot.sendMessage(this.adminChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      return true;
    } catch (error) {
      console.error('Ошибка отправки уведомления о неудачном входе:', error);
      return false;
    }
  }

  /**
   * Отправляет уведомление об активности в админ-панели
   * @param {string} action - Выполненное действие
   * @param {object} details - Детали действия
   * @returns {Promise<boolean>} Результат отправки
   */
  async sendActivityNotification(action, details = {}) {
    try {
      const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow'
      });

      let message = `🔧 Активность в админ-панели\n\n` +
                   `📝 Действие: ${action}\n` +
                   `🕐 Время: ${timestamp}\n`;

      // Добавляем детали в зависимости от типа действия
      if (details.entityType) {
        message += `📂 Тип: ${details.entityType}\n`;
      }
      
      if (details.entityId) {
        message += `🆔 ID: ${details.entityId}\n`;
      }
      
      if (details.title) {
        message += `📄 Название: ${details.title}\n`;
      }

      message += `🔗 Сайт: vidrimers.site`;

      await this.bot.sendMessage(this.adminChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      return true;
    } catch (error) {
      console.error('Ошибка отправки уведомления об активности:', error);
      return false;
    }
  }

  /**
   * Проверяет работоспособность бота
   * @returns {Promise<object>} Информация о боте
   */
  async getBotInfo() {
    try {
      const botInfo = await this.bot.getMe();
      return {
        enabled: true,
        botUsername: botInfo.username,
        botId: botInfo.id,
        adminChatId: this.adminChatId
      };
    } catch (error) {
      console.error('Ошибка получения информации о боте:', error);
      return {
        enabled: false,
        error: error.message
      };
    }
  }

  /**
   * Отправляет тестовое сообщение
   * @returns {Promise<boolean>} Результат отправки
   */
  async sendTestMessage() {
    try {
      const message = `🧪 Тестовое сообщение от админ-панели\n\n` +
                     `✅ Telegram интеграция работает корректно\n` +
                     `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n` +
                     `🔗 Сайт: vidrimers.site`;

      await this.bot.sendMessage(this.adminChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      return true;
    } catch (error) {
      console.error('Ошибка отправки тестового сообщения:', error);
      return false;
    }
  }
}

module.exports = TelegramService;