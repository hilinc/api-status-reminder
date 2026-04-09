async function notify(title, markdown) {
  const webhook = process.env.FEISHU_WEBHOOK;
  if (!webhook) return;

  const card = {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: title },
        template: markdown.includes('DOWN') || /\b[45]\d{2}\b/.test(markdown) || markdown.includes('超时') ? 'red' : 'green',
      },
      elements: [
        { tag: 'markdown', content: markdown },
      ],
    },
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Feishu failed: ${res.status} ${text}`);
  }

  console.log('[Feishu] Notification sent:', title);
}

export { notify };
