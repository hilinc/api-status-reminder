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

function formatStatusMessage(scrapeResult, changes) {
  const { source, url, checked_at, models } = scrapeResult;

  const upCount = models.filter(m => m.status === 'up').length;
  const downCount = models.filter(m => m.status === 'down').length;
  const overall = downCount === 0 ? 'all up' : upCount === 0 ? 'all down' : 'partial';

  const statusIcon = { up: '✅', down: '❌', unknown: '❓' };

  let md = `## ${source} — ${overall === 'all up' ? '全部正常' : overall === 'all down' ? '全部异常' : '部分异常'}\n\n`;
  md += `| 模型 | 状态 | 延迟 | 24h可用率 |\n`;
  md += `|------|------|------|----------|\n`;

  for (const m of models) {
    const icon = statusIcon[m.status] || '❓';
    const ping = m.ping_ms != null ? `${m.ping_ms}ms` : '-';
    const uptime = m.uptime_24h != null ? `${(m.uptime_24h * 100).toFixed(1)}%` : '-';
    const detail = m.model_list?.length ? ` (${m.model_list.length}个模型)` : '';
    md += `| ${m.name}${detail} | ${icon} | ${ping} | ${uptime} |\n`;
  }

  // Show model lists for api-probe results
  const probeModels = models.filter(m => m.model_list?.length > 0);
  if (probeModels.length > 0) {
    md += `\n### 可用模型\n`;
    for (const m of probeModels) {
      md += `**${m.name}**: ${m.model_list.join(', ')}\n\n`;
    }
  }

  if (changes.length > 0) {
    md += `\n### 变化\n`;
    for (const c of changes) {
      md += `- ${c.name}: ${statusIcon[c.from] || c.from} → ${statusIcon[c.to]}\n`;
    }
  }

  md += `\n🕐 ${checked_at}\n`;
  md += `\n[查看详情](${url})`;

  return md;
}

module.exports = { notify, formatStatusMessage };
