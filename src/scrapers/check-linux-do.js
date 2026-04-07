const CHECK_CX_BASE = process.env.CHECK_CX_BASE || 'https://check.linux.do';

async function scrape() {
  const res = await fetch(`${CHECK_CX_BASE}/api/dashboard?trendPeriod=7d`);
  if (!res.ok) throw new Error(`check-cx dashboard API failed: ${res.status}`);
  const data = await res.json();

  const models = [];

  if (data.groups) {
    for (const group of data.groups) {
      const groupName = group.name || group.group_name || 'unknown';
      const items = group.models || group.items || [];
      for (const item of items) {
        models.push({
          id: item.id || item.model_id,
          name: item.name || item.model || 'unknown',
          group: groupName,
          status: parseStatus(item),
          latency_ms: item.latency ?? item.avg_latency ?? null,
          uptime_7d: item.uptime ?? item.availability ?? null,
          checked_at: item.last_check || item.checked_at || null,
        });
      }
    }
  }

  return {
    source: 'check-linux-do',
    url: CHECK_CX_BASE,
    checked_at: new Date().toISOString(),
    models,
  };
}

function parseStatus(item) {
  if (item.status === 'up' || item.status === true || item.status === 1) return 'up';
  if (item.status === 'down' || item.status === false || item.status === 0) return 'down';
  if (item.available !== undefined) return item.available ? 'up' : 'down';
  return 'unknown';
}

module.exports = { scrape };
