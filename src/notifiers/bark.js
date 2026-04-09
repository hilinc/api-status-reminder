async function notify(title, markdown) {
  const key = process.env.BARK_KEY;
  if (!key) return;

  const server = process.env.BARK_SERVER || 'https://api.day.app';

  const res = await fetch(`${server}/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      body: markdown,
      group: 'api-status',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bark failed: ${res.status} ${text}`);
  }

  console.log('[Bark] Notification sent:', title);
}

export { notify };
