/**
 * Config validation for api-status-reminder.
 * Shared by CLI (scripts/validate.js) and runtime (api-probe.js).
 */

export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['配置必须是一个 JSON 对象'] };
  }

  if (!Array.isArray(config.providers) || config.providers.length === 0) {
    return { valid: false, errors: ['providers 必须是非空数组'] };
  }

  for (let i = 0; i < config.providers.length; i++) {
    const p = config.providers[i];
    const prefix = `providers[${i}]`;

    if (!p || typeof p !== 'object') {
      errors.push(`${prefix}: 必须是对象`);
      continue;
    }

    if (typeof p.name !== 'string' || !p.name.trim()) {
      errors.push(`${prefix}.name: 必填，必须是非空字符串`);
    }

    if (!p.json_only) {
      if (typeof p.base_url !== 'string' || !p.base_url.trim()) {
        errors.push(`${prefix}.base_url: 必填，必须是非空字符串`);
      } else {
        try {
          new URL(p.base_url);
        } catch {
          errors.push(`${prefix}.base_url: "${p.base_url}" 不是合法的 URL`);
        }
      }

      const hasKey = typeof p.api_key === 'string' && p.api_key.trim();
      const hasKeys = Array.isArray(p.api_keys) && p.api_keys.length > 0;

      if (!hasKey && !hasKeys) {
        errors.push(`${prefix}: 必须提供 api_key 或 api_keys（二选一）`);
      }
    }

    if (!p.json_only && Array.isArray(p.api_keys) && p.api_keys.length > 0) {
      for (let j = 0; j < p.api_keys.length; j++) {
        const k = p.api_keys[j];
        if (!k || typeof k !== 'object' || typeof k.key !== 'string' || !k.key.trim()) {
          errors.push(`${prefix}.api_keys[${j}].key: 必填，必须是非空字符串`);
        }
      }
    }

    if (p.deep_check !== undefined && typeof p.deep_check !== 'boolean') {
      errors.push(`${prefix}.deep_check: 必须是 boolean（true/false）`);
    }

    if (p.models !== undefined) {
      if (!Array.isArray(p.models)) {
        errors.push(`${prefix}.models: 必须是字符串数组`);
      } else if (p.models.some(m => typeof m !== 'string')) {
        errors.push(`${prefix}.models: 数组中每项必须是字符串`);
      }
    }

    if (p.models_path !== undefined && typeof p.models_path !== 'string') {
      errors.push(`${prefix}.models_path: 必须是字符串`);
    }
  }

  return { valid: errors.length === 0, errors };
}
