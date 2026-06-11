import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `שלום! ה-chat ID שלך הוא: ${chatId}\nהכנס אותו בהגדרות החשבון שלך באתר.`,
  );
});

export default bot;
