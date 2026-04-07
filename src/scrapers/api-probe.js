const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'config.json');

async function probeModel(base_url, api_key, model) {
  const startTime = Date.now();
  try {
    const res = await fetch(`${base_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const latency = Date.now() - startTime;
    return { model, status: res.ok ? 'up' : 'down', code: res.status, latency_ms: latency };
  } catch (err) {
    return { model, status: 'down', code: 0, latency_ms: Date.now() - startTime, error: err.message };
  }
}

async function probeProvider(provider) {
  const { name, base_url, api_key, deep_check } = provider;
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
        status_code: res.status,
        latency_ms: latency,
        error: `HTTP ${res.status}`,
        models: [],
        model_details: [],
      };
    }

    const data = await res.json();
    const models = (data.data || []).map(m => m.id).sort();

    let model_details = models.map(m => ({ model: m, status: 'listed', code: 200 }));

    // Deep check: test each model with a real request
    if (deep_check) {
      console.log(`[api-probe] Deep checking ${models.length} models for ${name}...`);
      model_details = await Promise.all(models.map(m => probeModel(base_url, api_key, m)));
    }

    return {
      name,
      base_url,
      status: 'up',
      status_code: 200,
      latency_ms: latency,
      models,
      model_count: models.length,
      model_details,
    };
  } catch (err) {
    return {
      name,
      base_url,
      status: 'down',
      status_code: 0,
      latency_ms: Date.now() - startTime,
      error: err.message,
      models: [],
      model_details: [],
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
      status_code: r.status_code,
      ping_ms: r.latency_ms,
      message: r.error || `${r.model_count} models`,
      checked_at: new Date().toISOString(),
      uptime_24h: null,
      model_list: r.models,
      model_details: r.model_details,
    })),
  };
}

module.exports = { scrape };
