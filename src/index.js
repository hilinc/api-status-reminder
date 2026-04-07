const { scrape } = require('./scrapers/ltcraft');
const { loadLastStatus, saveStatus, diff } = require('./diff');
const { notify, formatStatusMessage } = require('./notifiers/serverchan');

async function main() {
  console.log('[main] Starting status check...');

  const result = await scrape();
  console.log(`[main] Scraped ${result.models.length} monitors from ${result.source}`);

  const lastStatus = loadLastStatus();
  const changes = diff(lastStatus, result);

  if (changes.length > 0) {
    console.log(`[main] ${changes.length} status change(s) detected`);
    const title = `中转站状态变化 (${changes.length}项)`;
    const md = formatStatusMessage(result, changes);
    await notify(title, md);
  } else {
    console.log('[main] No status changes');
  }

  // Update stored status
  lastStatus[result.source] = {
    checked_at: result.checked_at,
    models: result.models,
  };
  saveStatus(lastStatus);
  console.log('[main] Status saved');
}

main().catch(err => {
  console.error('[main] Error:', err.message);
  process.exit(1);
});
