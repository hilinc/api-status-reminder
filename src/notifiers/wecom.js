async function notify(title, markdown) {
  const webhook = process.env.WECOM_WEBHOOK;
  if (!webhook) return;

  const body = {
    msgtype: 'markdown',
    markdown: {
      content: `## ${title}\n\n${markdown}`,
    },
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WeCom failed: ${res.status} ${text}`);
  }

  console.log('[WeCom] Notification sent:', title);
}

export { notify };
