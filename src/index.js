const { scrape: scrapeLtcraft } = require('./scrapers/ltcraft');
const { scrape: scrapeCheckLinuxDo } = require('./scrapers/check-linux-do');
const { scrape: scrapeApiProbe } = require('./scrapers/api-probe');
const { loadLastStatus, saveStatus, diff } = require('./diff');
const { notify: notifyServerChan, formatStatusMessage } = require('./notifiers/serverchan');
const { notify: notifyFeishu } = require('./notifiers/feishu');
const { notify: notifyWeCom } = require('./notifiers/wecom');

const scrapers = [
  { name: 'ltcraft', fn: scrapeLtcraft, enabled: !!process.env.UPTIME_KUMA_BASE },
  { name: 'check-linux-do', fn: scrapeCheckLinuxDo, enabled: !!process.env.CHECK_CX_BASE },
  { name: 'api-probe', fn: scrapeApiProbe, enabled: true },
];

const notifiers = [notifyServerChan, notifyFeishu, notifyWeCom];

async function main() {
  console.log('[main] Starting status check...');

  const lastStatus = loadLastStatus();
  let allChanges = [];
  let allResults = [];

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
      allResults.push(result);
    } catch (err) {
      console.error(`[main] ${s.name} failed:`, err.message);
    }
  }

  if (allChanges.length > 0) {
    const totalChanges = allChanges.reduce((n, c) => n + c.changes.length, 0);
    console.log(`[main] ${totalChanges} status change(s) detected`);
    const title = `中转站状态变化 (${totalChanges}项)`;
    const md = allChanges.map(c => formatStatusMessage(c.result, c.changes)).join('\n\n---\n\n');
    await Promise.allSettled(notifiers.map(fn => fn(title, md)));
  } else {
    console.log('[main] No status changes');
  }

  saveStatus(lastStatus);
  console.log('[main] Status saved');
}

main().catch(err => {
  console.error('[main] Error:', err.message);
  process.exit(1);
});
