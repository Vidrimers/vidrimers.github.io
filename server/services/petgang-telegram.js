/**
 * Сервис уведомлений Pet Gang в Telegram
 */

class PetGangTelegram {
  constructor(telegramBot) {
    this.bot = telegramBot;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  /**
   * Отправить уведомление о сканировании QR-кода
   */
  async sendScanNotification(petName, dateTime, lat, lon, ip) {
    if (!this.bot || !this.bot.isEnabled) {
      console.log(`[PetGang Telegram отключен] Сканирование: ${petName}`);
      return false;
    }

    try {
      const geoText = (lat && lon)
        ? `GPS координаты: ${lat}, ${lon}`
        : 'GPS координаты: не предоставлены';

      const message =
        `‼️ Паспорт питомца «${petName}» был отсканирован.\n` +
        `Дата и время: ${dateTime}\n` +
        `${geoText}\n` +
        `IP адрес: ${ip || 'не определён'}`;

      await this.bot.bot.sendMessage(this.chatId, message);
      console.log(`[PetGang Telegram] Уведомление о сканировании ${petName} отправлено`);

      // Второе сообщение — карта
      if (lat && lon) {
        const mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
        await this.bot.bot.sendMessage(this.chatId, mapUrl);
        console.log(`[PetGang Telegram] Карта отправлена`);
      }

      return true;
    } catch (error) {
      console.error('[PetGang Telegram] Ошибка отправки:', error.message);
      return false;
    }
  }
}

module.exports = PetGangTelegram;
