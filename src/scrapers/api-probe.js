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
  const { name, base_url, deep_check, models: configModels, models_path } = provider;
  const keys = provider.api_keys || [{ key: provider.api_key }];
  const endpoint = models_path || '/v1/models';

  let allModels = new Set();
  let allDetails = [];
  let bestLatency = Infinity;
  let overallStatus = 'down';
  let overallCode = 0;
  let lastError = '';

  for (const keyConfig of keys) {
    const api_key = typeof keyConfig === 'string' ? keyConfig : keyConfig.key;
    const label = (typeof keyConfig === 'object' && keyConfig.label) || '';
    const startTime = Date.now();

    try {
      const res = await fetch(`${base_url}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${api_key}` },
        signal: AbortSignal.timeout(15000),
      });
      const latency = Date.now() - startTime;
      if (latency < bestLatency) bestLatency = latency;

      if (res.ok) {
        overallStatus = 'up';
        overallCode = 200;
        const data = await res.json();
        const rawModels = data.data || data.models || [];
        const models = rawModels.map(m => m.id || m.name).filter(Boolean);

        if (deep_check) {
          const prefix = label ? `[${label}] ` : '';
          console.log(`[api-probe] Deep checking ${models.length} models for ${name} ${prefix}...`);
          const details = await Promise.all(models.map(m => probeModel(base_url, api_key, m)));
          for (const d of details) {
            const existing = allDetails.find(e => e.model === d.model);
            if (!existing) {
              allDetails.push({ ...d, label });
            } else if (d.status === 'up' && existing.status !== 'up') {
              Object.assign(existing, d, { label });
            }
          }
        }

        for (const m of models) {
          allModels.add(m);
        }
      } else {
        if (overallCode === 0) overallCode = res.status;
        lastError = `HTTP ${res.status}`;
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      if (latency < bestLatency) bestLatency = latency;
      lastError = err.message;
    }
  }

  if (allModels.size === 0 && configModels?.length > 0) {
    console.log(`[api-probe] Using configured models for ${name}`);
    allModels = new Set(configModels);
    if (deep_check) {
      const api_key = typeof keys[0] === 'string' ? keys[0] : keys[0].key;
      allDetails = await Promise.all([...allModels].map(m => probeModel(base_url, api_key, m)));
      if (allDetails.some(d => d.status === 'up')) overallStatus = 'up';
    }
  }

  const sortedModels = [...allModels].sort();
  if (!deep_check && sortedModels.length > 0) {
    allDetails = sortedModels.map(m => ({ model: m, status: 'listed', code: 200 }));
  }

  return {
    name, base_url,
    status: overallStatus,
    status_code: overallCode,
    latency_ms: bestLatency === Infinity ? 0 : bestLatency,
    error: overallStatus === 'down' ? lastError : undefined,
    models: sortedModels,
    model_count: sortedModels.length,
    model_details: allDetails,
  };
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
