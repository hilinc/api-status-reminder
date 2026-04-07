async function notify(title, markdown) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const text = `*${title}*\n\n${markdown}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram failed: ${res.status} ${err}`);
  }

  console.log('[Telegram] Notification sent:', title);
}

module.exports = { notify };
