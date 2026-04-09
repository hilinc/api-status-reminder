async function notify(title, markdown) {
  const url = process.env.GOTIFY_URL;
  const token = process.env.GOTIFY_TOKEN;
  if (!url || !token) return;

  const priority = parseInt(process.env.GOTIFY_PRIORITY || '9', 10);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gotify-Key': token,
    },
    body: JSON.stringify({
      title,
      message: markdown,
      priority,
      extras: { 'client::display': { contentType: 'text/markdown' } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gotify failed: ${res.status} ${text}`);
  }

  console.log('[Gotify] Notification sent:', title);
}

export { notify };
