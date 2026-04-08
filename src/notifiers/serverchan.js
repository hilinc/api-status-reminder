const SERVERCHAN_KEY = process.env.SERVERCHAN_KEY;

async function notify(title, markdown) {
  if (!SERVERCHAN_KEY) {
    console.log('[ServerChan] SERVERCHAN_KEY not set, skipping notification');
    console.log('[ServerChan] Would send:', title);
    console.log(markdown);
    return;
  }

  const res = await fetch(`https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, desp: markdown }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ServerChan failed: ${res.status} ${text}`);
  }

  console.log('[ServerChan] Notification sent:', title);
}

module.exports = { notify };
