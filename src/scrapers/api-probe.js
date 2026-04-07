const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'config.json');

async function probeProvider(provider) {
  const { name, base_url, api_key } = provider;
  const startTime = Date.now();

  try {
    const res = await fetch(`${base_url}/v1/models`, {
      headers: { 'Authorization': `Bearer ${api_key}` },
      signal: AbortSignal.timeout(15000),
    });

    const latency = Date.now() - startTime;

    if (!res.ok) {
      return {
        name,
        base_url,
        status: 'down',
        latency_ms: latency,
        error: `HTTP ${res.status}`,
        models: [],
      };
    }

    const data = await res.json();
    const models = (data.data || []).map(m => m.id).sort();

    return {
      name,
      base_url,
      status: 'up',
      latency_ms: latency,
      models,
      model_count: models.length,
    };
  } catch (err) {
    return {
      name,
      base_url,
      status: 'down',
      latency_ms: Date.now() - startTime,
      error: err.message,
      models: [],
    };
  }
}

async function scrape() {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }

  const providers = config.providers || [];
  if (providers.length === 0) return null;

  const results = await Promise.all(providers.map(probeProvider));

  return {
    source: 'api-probe',
    url: '',
    checked_at: new Date().toISOString(),
    models: results.map(r => ({
      id: r.name,
      name: r.name,
      group: 'API Probe',
      status: r.status,
      ping_ms: r.latency_ms,
      message: r.error || `${r.model_count} models`,
      checked_at: new Date().toISOString(),
      uptime_24h: null,
      model_list: r.models,
    })),
  };
}

module.exports = { scrape };
