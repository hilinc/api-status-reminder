import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { validateConfig } from '../validate.js';

const USER_CONFIG_FILE = path.join(os.homedir(), '.api-status', 'config.json');
const CC_SWITCH_DB = path.join(os.homedir(), '.cc-switch', 'cc-switch.db');

function loadFromCcSwitch() {
  try {
    if (!fs.existsSync(CC_SWITCH_DB)) return null;

    const rows = execSync(
      `sqlite3 -json "${CC_SWITCH_DB}" "SELECT p.id, p.name, p.settings_config, pe.url AS endpoint_url FROM providers p LEFT JOIN provider_endpoints pe ON p.id = pe.provider_id WHERE p.name != 'default'"`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const data = JSON.parse(rows);
    if (!data.length) return null;

    const providers = [];
    for (const row of data) {
      const settings = JSON.parse(row.settings_config || '{}');
      const apiKey = settings.env?.ANTHROPIC_AUTH_TOKEN;
      if (!apiKey) continue;

      // Use endpoint_url (real remote URL) if available, otherwise ANTHROPIC_BASE_URL
      let baseUrl = row.endpoint_url || settings.env?.ANTHROPIC_BASE_URL;
      if (!baseUrl) continue;

      // Strip trailing slash
      baseUrl = baseUrl.replace(/\/+$/, '');

      providers.push({ name: row.name, base_url: baseUrl, api_key: apiKey, deep_check: true });
    }

    return providers.length ? { providers } : null;
  } catch {
    console.warn('[api-probe] cc-switch 数据库读取失败，跳过');
    return null;
  }
}

function loadConfig() {
  // 1. ./config.json (project-local) takes highest priority when present
  const localConfig = path.join(process.cwd(), 'config.json');
  try {
    const c = JSON.parse(fs.readFileSync(localConfig, 'utf-8'));
    if (c.providers?.length) {
      if (c.use_cc_switch) {
        const ccConfig = loadFromCcSwitch();
        if (ccConfig) return { ...ccConfig, _source: 'cc-switch' };
      }
      return { ...c, _source: 'config.json' };
    }
  } catch {
    // no local config, continue
  }

  // 2. env var
  if (process.env.API_PROBE_CONFIG) {
    try {
      const c = JSON.parse(process.env.API_PROBE_CONFIG);
      if (c.providers?.length) return { ...c, _source: 'API_PROBE_CONFIG' };
    } catch {
      console.warn('[api-probe] API_PROBE_CONFIG 环境变量 JSON 解析失败');
    }
  }

  // 3. ~/.api-status/config.json
  try {
    const userConfig = JSON.parse(fs.readFileSync(USER_CONFIG_FILE, 'utf-8'));
    if (userConfig.use_cc_switch) {
      const ccConfig = loadFromCcSwitch();
      if (ccConfig) return { ...ccConfig, _source: 'cc-switch' };
    }
    if (userConfig.providers?.length) return { ...userConfig, _source: '~/.api-status/config.json' };
  } catch {
    console.warn('[api-probe] ~/.api-status/config.json 读取失败，跳过');
  }

  return null;
}

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

async function probeProviderUptimeKuma(provider) {
  const { name, uptime_kuma } = provider;
  const base = uptime_kuma.base || process.env.UPTIME_KUMA_BASE || 'https://ai.ltcraft.cn';
  const slug = uptime_kuma.slug || process.env.UPTIME_KUMA_SLUG || 'ai-status';

  let hbData;
  try {
    const res = await fetch(`${base}/api/status-page/heartbeat/${slug}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    hbData = await res.json();
  } catch (err) {
    const cause = err.cause?.message || err.cause?.code || '';
    return {
      name, base_url: base,
      status: 'down', status_code: 0,
      latency_ms: 0, models: [], model_count: 0, model_details: [],
      error: `Uptime Kuma 请求失败: ${err.message}${cause ? ` (${cause})` : ''}`,
    };
  }

  const ids = uptime_kuma.ids
    ? uptime_kuma.ids.map(String)
    : Object.keys(hbData.heartbeatList);

  const model_details = [];
  for (const id of ids) {
    const beats = hbData.heartbeatList[id] || [];
    const latest = beats[beats.length - 1] ?? null;
    model_details.push({
      model: id,
      status: latest ? (latest.status === 1 ? 'up' : 'down') : 'unknown',
      latency_ms: latest?.ping ?? null,
      message: latest?.msg || '',
    });
  }

  const overallStatus = model_details.some(m => m.status === 'up') ? 'up' : 'down';

  return {
    name, base_url: base,
    status: overallStatus,
    status_code: overallStatus === 'up' ? 200 : 0,
    latency_ms: model_details.find(m => m.latency_ms != null)?.latency_ms ?? 0,
    models: ids,
    model_count: ids.length,
    model_details,
  };
}

async function probeProvider(provider) {
  if (provider.uptime_kuma) return probeProviderUptimeKuma(provider);
  const { name, base_url, deep_check, models: configModels, models_path } = provider;
  const keys = provider.api_keys || [{ key: provider.api_key }];
  const endpoints = models_path ? [models_path] : ['/v1/models', '/v1beta/models'];

  let allModels = new Set();
  let allDetails = [];
  let bestLatency = Infinity;
  let overallStatus = 'down';
  let overallCode = 0;
  let lastError = '';

  for (const keyConfig of keys) {
    const api_key = typeof keyConfig === 'string' ? keyConfig : keyConfig.key;
    const label = (typeof keyConfig === 'object' && keyConfig.label) || '';

    for (const endpoint of endpoints) {
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

          if (deep_check && models.length > 0) {
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
          // Found models on this endpoint, skip remaining endpoints
          if (models.length > 0) break;
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
    models_empty_reason: overallStatus === 'up' && sortedModels.length === 0 ? '模型列表接口返回为空，可能是 API Key 权限不足或站点未提供模型列表' : undefined,
  };
}

async function scrape() {
  const config = loadConfig();
  if (!config) return null;

  const { valid, errors } = validateConfig(config);
  if (!valid) {
    console.warn('[api-probe] 配置校验失败：');
    for (const e of errors) console.warn(`  - ${e}`);
  }

  const providers = config.providers || [];
  if (providers.length === 0) return null;

  const settled = await Promise.allSettled(providers.map(probeProvider));
  const results = [];
  for (let i = 0; i < settled.length; i++) {
    if (settled[i].status === 'fulfilled') {
      results.push(settled[i].value);
    } else {
      const err = settled[i].reason;
      const cause = err?.cause?.message || err?.cause?.code || '';
      console.error(`[api-probe] ${providers[i].name} 探测失败: ${err?.message || err}${cause ? ` (${cause})` : ''}`);
    }
  }

  if (results.length === 0) return null;

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
      models_empty_reason: r.models_empty_reason,
    })),
  };
}

export { scrape, probeProvider, loadConfig };
