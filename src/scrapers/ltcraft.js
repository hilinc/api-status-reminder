const UPTIME_KUMA_BASE = process.env.UPTIME_KUMA_BASE || 'https://ai.ltcraft.cn';
const SLUG = process.env.UPTIME_KUMA_SLUG || 'ai-status';

async function fetchMonitors() {
  const res = await fetch(`${UPTIME_KUMA_BASE}/api/status-page/${SLUG}`);
  if (!res.ok) throw new Error(`Status page API failed: ${res.status}`);
  const data = await res.json();

  const monitors = {};
  for (const group of data.publicGroupList) {
    for (const m of group.monitorList) {
      monitors[m.id] = { name: m.name.trim(), type: m.type, group: group.name };
    }
  }
  return monitors;
}

async function fetchHeartbeats() {
  const res = await fetch(`${UPTIME_KUMA_BASE}/api/status-page/heartbeat/${SLUG}`);
  if (!res.ok) throw new Error(`Heartbeat API failed: ${res.status}`);
  return res.json();
}

async function scrape() {
  const [monitors, hbData] = await Promise.all([fetchMonitors(), fetchHeartbeats()]);

  const models = [];
  for (const [id, info] of Object.entries(monitors)) {
    const beats = hbData.heartbeatList[id] || [];
    const latest = beats.length > 0 ? beats[beats.length - 1] : null;
    const uptime24 = hbData.uptimeList[`${id}_24`];

    models.push({
      id: Number(id),
      name: info.name,
      group: info.group,
      status: latest ? (latest.status === 1 ? 'up' : 'down') : 'unknown',
      ping_ms: latest?.ping ?? null,
      message: latest?.msg || '',
      checked_at: latest?.time || null,
      uptime_24h: uptime24 ?? null,
    });
  }

  return {
    source: 'ltcraft',
    url: `${UPTIME_KUMA_BASE}/status/${SLUG}`,
    checked_at: new Date().toISOString(),
    models,
  };
}

module.exports = { scrape };
