let chromium;
try {
  chromium = require('playwright').chromium;
} catch {
  // playwright is optional
}

const CHECK_CX_BASE = process.env.CHECK_CX_BASE || 'https://check.linux.do';

async function scrape() {
  if (!chromium) {
    console.log('[check-linux-do] Playwright not installed, skipping');
    return null;
  }

  const launchOptions = {};
  const proxy = process.env.PLAYWRIGHT_PROXY;
  if (proxy) {
    launchOptions.proxy = { server: proxy };
  }

  const browser = await chromium.launch(launchOptions);
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Try direct API first (works if no CF challenge)
    try {
      const res = await context.request.get(`${CHECK_CX_BASE}/api/dashboard?trendPeriod=7d`, {
        timeout: 15000,
      });
      if (res.ok()) {
        const data = await res.json();
        console.log('[check-linux-do] API direct access succeeded');
        return parseResponse(data);
      }
    } catch {}

    // Fallback: load homepage to pass CF challenge, then fetch API
    console.log('[check-linux-do] Trying CF challenge bypass via homepage...');
    await page.goto(CHECK_CX_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction(
      () => !document.title.includes('Just a moment'),
      { timeout: 30000 }
    );

    // Wait for app to load
    await page.waitForTimeout(5000);

    // Fetch API from page context with browser cookies
    const data = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/dashboard?trendPeriod=7d`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }, CHECK_CX_BASE);

    console.log('[check-linux-do] API via CF bypass succeeded');
    return parseResponse(data);
  } catch (err) {
    console.error('[check-linux-do] Failed:', err.message);
    return null;
  } finally {
    await browser.close();
  }
}

function parseResponse(data) {
  const models = [];

  if (data.groups) {
    for (const group of data.groups) {
      const groupName = group.name || group.group_name || 'unknown';
      const items = group.models || group.items || [];
      for (const item of items) {
        models.push({
          id: item.id || item.model_id || item.name,
          name: item.name || item.model || 'unknown',
          group: groupName,
          status: item.available === true || item.status === 1 || item.status === 'up' ? 'up' : 'down',
          ping_ms: item.latency ?? item.avg_latency ?? null,
          message: '',
          checked_at: item.last_check || null,
          uptime_24h: item.uptime ?? item.availability ?? null,
        });
      }
    }
  } else if (Array.isArray(data)) {
    for (const item of data) {
      models.push({
        id: item.id || item.model_id || item.name,
        name: item.name || item.model || 'unknown',
        group: item.group || item.group_name || 'default',
        status: item.status === true || item.status === 1 || item.status === 'up' ? 'up' : 'down',
        ping_ms: item.latency ?? item.avg_latency ?? null,
        message: item.message || '',
        checked_at: item.last_check || null,
        uptime_24h: item.uptime ?? null,
      });
    }
  }

  return {
    source: 'check-linux-do',
    url: CHECK_CX_BASE,
    checked_at: new Date().toISOString(),
    models,
  };
}

module.exports = { scrape };
