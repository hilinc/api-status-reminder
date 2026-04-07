const { scrape: scrapeLtcraft } = require('./scrapers/ltcraft');
const { scrape: scrapeApiProbe } = require('./scrapers/api-probe');
const { loadLastStatus, saveStatus, diff } = require('./diff');
const { notify: notifyServerChan, formatStatusMessage } = require('./notifiers/serverchan');
const { notify: notifyFeishu } = require('./notifiers/feishu');
const { notify: notifyWeCom } = require('./notifiers/wecom');

const scrapers = [
  { name: 'ltcraft', fn: scrapeLtcraft, enabled: !!process.env.UPTIME_KUMA_BASE },
  { name: 'api-probe', fn: scrapeApiProbe, enabled: true },
];

const notifiers = [notifyServerChan, notifyFeishu, notifyWeCom];

const mode = process.argv[2] || 'check'; // 'check' or 'digest'

async function main() {
  console.log(`[main] Starting ${mode} mode...`);

  const lastStatus = loadLastStatus();
  let allChanges = [];

  for (const s of scrapers) {
    if (!s.enabled) continue;
    try {
      const result = await s.fn();
      if (!result) continue;
      console.log(`[main] Scraped ${result.models.length} monitors from ${result.source}`);

      const changes = diff(lastStatus, result);
      if (changes.length > 0) {
        allChanges.push({ result, changes });
      }

      lastStatus[result.source] = {
        checked_at: result.checked_at,
        models: result.models,
      };
    } catch (err) {
      console.error(`[main] ${s.name} failed:`, err.message);
    }
  }

  if (mode === 'digest') {
    // Daily digest: send full status regardless of changes
    const title = `中转站每日状态报告`;
    const md = formatDigest(lastStatus);
    await Promise.allSettled(notifiers.map(fn => fn(title, md)));
    console.log('[main] Digest sent');
  } else if (allChanges.length > 0) {
    const totalChanges = allChanges.reduce((n, c) => n + c.changes.length, 0);
    console.log(`[main] ${totalChanges} status change(s) detected`);
    const title = `中转站状态变化 (${totalChanges}项)`;
    let md = allChanges.map(c => formatStatusMessage(c.result, c.changes)).join('\n\n---\n\n');
    md += '\n\n---\n\n## 全量状态\n\n' + formatDigest(lastStatus);
    await Promise.allSettled(notifiers.map(fn => fn(title, md)));
  } else {
    console.log('[main] No status changes');
  }

  saveStatus(lastStatus);
  console.log('[main] Status saved');
}

function formatDigest(status) {
  const statusIcon = { up: '✅', down: '❌', unknown: '❓' };
  let md = '';

  for (const [source, data] of Object.entries(status)) {
    const models = data.models || [];
    const upCount = models.filter(m => m.status === 'up').length;
    const total = models.length;

    md += `## ${source} (${upCount}/${total} 可用)\n\n`;
    md += `| 模型 | 状态 | 延迟 |\n`;
    md += `|------|------|------|\n`;

    for (const m of models) {
      const icon = statusIcon[m.status] || '❓';
      const ping = m.ping_ms != null ? `${m.ping_ms}ms` : '-';
      const detail = m.model_list?.length ? ` (${m.model_list.length}个模型)` : '';
      md += `| ${m.name}${detail} | ${icon} | ${ping} |\n`;
    }

    // Show model lists as tables
    // Show model details as table
    const probeModels = models.filter(m => m.model_details?.length > 0);
    if (probeModels.length > 0) {
      for (const m of probeModels) {
        const hasDeepCheck = m.model_details.some(d => d.status !== 'listed');
        md += `\n### ${m.name} 模型列表\n\n`;
        if (hasDeepCheck) {
          md += `| 模型 | 状态 | 响应码 | 延迟 |\n`;
          md += `|------|------|--------|------|\n`;
          for (const d of m.model_details) {
            const icon = d.status === 'up' ? '✅' : '❌';
            const ping = d.latency_ms != null ? `${d.latency_ms}ms` : '-';
            md += `| ${d.model} | ${icon} | ${d.code} | ${ping} |\n`;
          }
        } else {
          md += `| 模型 | 状态 |\n`;
          md += `|------|------|\n`;
          for (const d of m.model_details) {
            md += `| ${d.model} | 已列出 |\n`;
          }
          md += `\n> 以上为 /v1/models 返回的模型列表，仅表示站点已注册该模型，不代表实际可用。\n`;
        }
      }
    }

    md += `\n⏰ 最后检测: ${data.checked_at}\n\n---\n\n`;
  }

  return md;
}

main().catch(err => {
  console.error('[main] Error:', err.message);
  process.exit(1);
});
