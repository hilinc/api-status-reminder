import { scrape as scrapeLtcraft } from './scrapers/ltcraft.js';
import { scrape as scrapeApiProbe } from './scrapers/api-probe.js';
import { loadLastStatus, saveStatus, diff } from './diff.js';
import { formatReport } from './format.js';
import { notify as notifyServerChan } from './notifiers/serverchan.js';
import { notify as notifyFeishu } from './notifiers/feishu.js';
import { notify as notifyWeCom } from './notifiers/wecom.js';
import { notify as notifyTelegram } from './notifiers/telegram.js';
import { notify as notifyDingDing } from './notifiers/dingding.js';
import { notify as notifyPushPlus } from './notifiers/pushplus.js';
import { notify as notifyGotify } from './notifiers/gotify.js';
import { notify as notifyBark } from './notifiers/bark.js';

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
    const results = await Promise.allSettled(notifiers.map(fn => fn(title, md)));
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      for (const f of failed) {
        console.error(`[main] 通知发送失败: ${f.reason?.message || f.reason}`);
      }
    }
    console.log(`[main] Notification sent (${mode}), ${results.length - failed.length}/${results.length} succeeded`);
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
