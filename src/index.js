const { scrape: scrapeLtcraft } = require('./scrapers/ltcraft');
const { scrape: scrapeApiProbe } = require('./scrapers/api-probe');
const { loadLastStatus, saveStatus, diff } = require('./diff');
const { formatReport } = require('./format');
const { notify: notifyServerChan } = require('./notifiers/serverchan');
const { notify: notifyFeishu } = require('./notifiers/feishu');
const { notify: notifyWeCom } = require('./notifiers/wecom');
const { notify: notifyTelegram } = require('./notifiers/telegram');
const { notify: notifyDingDing } = require('./notifiers/dingding');
const { notify: notifyPushPlus } = require('./notifiers/pushplus');
const { notify: notifyGotify } = require('./notifiers/gotify');
const { notify: notifyBark } = require('./notifiers/bark');

const scrapers = [
  { name: 'ltcraft', fn: scrapeLtcraft, enabled: !!process.env.UPTIME_KUMA_BASE },
  { name: 'api-probe', fn: scrapeApiProbe, enabled: true },
];

const notifiers = [notifyServerChan, notifyFeishu, notifyWeCom, notifyTelegram, notifyDingDing, notifyPushPlus, notifyGotify, notifyBark];

const mode = process.argv[2] || 'check'; // 'check', 'digest', or 'change-only'

async function main() {
  console.log(`[main] Starting ${mode} mode...`);

  const lastStatus = loadLastStatus();
  let hasChanges = false;

  for (const s of scrapers) {
    if (!s.enabled) continue;
    try {
      const result = await s.fn();
      if (!result) continue;
      console.log(`[main] Scraped ${result.models.length} monitors from ${result.source}`);

      const changes = diff(lastStatus, result);
      if (changes.length > 0) hasChanges = true;

      lastStatus[result.source] = {
        checked_at: result.checked_at,
        models: result.models,
      };
    } catch (err) {
      console.error(`[main] ${s.name} failed:`, err.message);
    }
  }

  const shouldNotify = mode === 'change-only' ? hasChanges : true;

  if (shouldNotify) {
    const title = mode === 'digest' ? '中转站每日状态报告' : '中转站状态报告';
    const md = formatReport(lastStatus);
    await Promise.allSettled(notifiers.map(fn => fn(title, md)));
    console.log(`[main] Notification sent (${mode})`);
  } else {
    console.log('[main] No status changes, skipping notification');
  }

  saveStatus(lastStatus);
  console.log('[main] Status saved');
}

main().catch(err => {
  console.error('[main] Error:', err.message);
  process.exit(1);
});
