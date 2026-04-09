async function notify(title, markdown) {
  const webhook = process.env.DINGDING_WEBHOOK;
  if (!webhook) return;

  const body = {
    msgtype: 'markdown',
    markdown: {
      title,
      text: `## ${title}\n\n${markdown}`,
    },
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DingDing failed: ${res.status} ${text}`);
  }

  console.log('[DingDing] Notification sent:', title);
}

export { notify };
