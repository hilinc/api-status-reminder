const statusIcon = { up: '✅', down: 'DOWN', unknown: '?' };

function formatReport(status) {
  let md = '';

  // Collect all sites: merge Uptime Kuma monitors under their source name
  const sites = [];
  const siteMap = {};

  for (const [source, data] of Object.entries(status)) {
    const models = data.models || [];
    if (source === 'api-probe') {
      for (const m of models) {
        const name = m.name;
        if (siteMap[name]) {
          // Merge with existing Uptime Kuma site
          siteMap[name].model_details = m.model_details;
          siteMap[name].ping_ms_probe = m.ping_ms;
          siteMap[name].status_probe = m.status;
        } else {
          const site = { ...m, _source: 'api-probe' };
          sites.push(site);
          siteMap[name] = site;
        }
      }
    } else {
      // Uptime Kuma: group all monitors as one site
      const upCount = models.filter(m => m.status === 'up').length;
      const total = models.length;
      const pings = models.filter(m => m.ping_ms).map(m => m.ping_ms);
      const avgPing = pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null;
      const overall = models.every(m => m.status === 'down') ? 'down' : 'up';
      const site = {
        name: source,
        status: overall,
        ping_ms: avgPing,
        _source: 'uptime-kuma',
        _monitors: models,
        _summary: `${upCount}/${total}`,
      };
      sites.push(site);
      siteMap[source] = site;
    }
  }

  // --- Overview table ---
  md += `## 总览\n\n`;
  md += `| 站点 | 连通性 | 延迟 | 可用模型 |\n`;
  md += `|------|--------|------|----------|\n`;

  for (const s of sites) {
    const icon = statusIcon[s.status] || '❓';
    const ping = s.ping_ms != null ? `${s.ping_ms}ms` : '-';
    let modelInfo = '-';
    if (s._summary) {
      modelInfo = `服务 ${s._summary}`;
    }
    if (s.model_details?.length > 0) {
      const hasDeep = s.model_details.some(d => d.status !== 'listed');
      const modelStr = hasDeep
        ? `${s.model_details.filter(d => d.status === 'up').length}/${s.model_details.length}`
        : `${s.model_details.length} (未实测)`;
      modelInfo = s._summary ? `${modelInfo}, 模型 ${modelStr}` : modelStr;
    } else if (s.models_empty_reason) {
      modelInfo = '⚠️ 无法获取';
    }
    md += `| ${s.name} | ${icon} | ${ping} | ${modelInfo} |\n`;
  }

  // --- Per-site details ---
  for (const s of sites) {
    if (s._monitors?.length > 0) {
      md += `\n## ${s.name} 服务明细\n\n`;
      md += `| 服务 | 状态 | 延迟 |\n`;
      md += `|------|------|------|\n`;
      for (const m of s._monitors) {
        const icon = statusIcon[m.status] || '❓';
        const ping = m.ping_ms != null ? `${m.ping_ms}ms` : '-';
        md += `| ${m.name} | ${icon} | ${ping} |\n`;
      }
    }

    if (s.model_details?.length > 0) {
      const hasDeep = s.model_details.some(d => d.status !== 'listed');
      md += `\n## ${s.name} 模型明细\n\n`;
      if (hasDeep) {
        md += `| 模型 | 状态 | 延迟 |\n`;
        md += `|------|------|------|\n`;
        for (const d of s.model_details) {
          const code = d.code === 0 ? '超时' : (d.code && d.code !== 200 ? `${d.code}` : '');
          const statusStr = d.status === 'up' ? '✅' : code || 'DOWN';
          const ping = d.status === 'up' && d.latency_ms != null ? `${d.latency_ms}ms` : '-';
          md += `| ${d.model} | ${statusStr} | ${ping} |\n`;
        }
      } else {
        md += `| 模型 |\n`;
        md += `|------|\n`;
        for (const d of s.model_details) {
          md += `| ${d.model} |\n`;
        }
        md += `\n> 仅 /v1/models 返回，未实测可用性\n`;
      }
    } else if (s.models_empty_reason) {
      md += `\n## ${s.name}\n\n> ⚠️ ${s.models_empty_reason}\n`;
    }
  }

  // --- Timestamp ---
  const timestamps = Object.values(status).map(d => d.checked_at).filter(Boolean);
  const latest = timestamps.sort().pop();
  if (latest) {
    md += `\n🕐 ${latest}\n`;
  }

  return md;
}

export { formatReport };
