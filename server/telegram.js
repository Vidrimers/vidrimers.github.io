// Заглушка для Telegram модуля
// Будет реализован в Task 11.6

class Telegram {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram не настроен: отсутствуют TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
    }
  }

  async sendLikeNotification(projectId, likesCount) {
    // Заглушка - будет реализовано в Task 11.6
    console.log(`[Telegram заглушка] Проект ${projectId} получил лайк! Всего лайков: ${likesCount}`);
    return Promise.resolve();
  }
}

module.exports = Telegram;