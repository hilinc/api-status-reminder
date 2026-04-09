async function notify(title, markdown) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) return;

  const res = await fetch('https://www.pushplus.plus/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      title,
      content: markdown,
      template: 'markdown',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PushPlus failed: ${res.status} ${text}`);
  }

  console.log('[PushPlus] Notification sent:', title);
}

export { notify };
