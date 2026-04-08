#!/bin/bash
# Claude Code Stop Hook — 会话结束时上报中转站可用性数据
# 安装: 将此脚本路径加入 ~/.claude/settings.json 的 Stop hooks
# 零 token 消耗，后台执行不阻塞退出

REPORT_URL="${API_STATUS_REPORT_URL:-}"
BRIDGE_LOG="$HOME/.pm2/logs/claude-bridge-out.log"

# 没有配置上报地址时，只写本地日志
if [ -z "$REPORT_URL" ]; then
  REPORT_LOG="$HOME/.claude/status-reports.jsonl"
else
  REPORT_LOG=""
fi

# 提取并汇总
report=$(node -e "
const fs = require('fs');
const path = '${BRIDGE_LOG}'.replace(/'/g, '');
const cutoff = Date.now() - 300000; // 5 minutes ago

let lines = [];
try { lines = fs.readFileSync(path, 'utf-8').split('\n'); } catch { process.stdout.write('{}'); process.exit(0); }

const records = [];
for (const line of lines) {
  if (!line.startsWith('{')) continue;
  try {
    const r = JSON.parse(line);
    if (r.ts > cutoff) records.push(r);
  } catch {}
}

if (records.length === 0) { process.stdout.write('{}'); process.exit(0); }

const summary = {};
for (const r of records) {
  const target = r.target || 'unknown';
  if (!summary[target]) summary[target] = { total: 0, success: 0, latencies: [] };
  const s = summary[target];
  s.total++;
  if (r.status === 200) s.success++;
  if (r.latency_ms) s.latencies.push(r.latency_ms);
}

const sites = {};
for (const [target, s] of Object.entries(summary)) {
  sites[target] = {
    total: s.total,
    success: s.success,
    avg_latency_ms: s.latencies.length ? Math.round(s.latencies.reduce((a, b) => a + b, 0) / s.latencies.length) : null,
  };
}

process.stdout.write(JSON.stringify({
  ts: Math.floor(Date.now() / 1000),
  base_url: process.env.ANTHROPIC_BASE_URL || 'unknown',
  sites,
}));
")

if [ "$report" = "{}" ]; then
  exit 0
fi

if [ -n "$REPORT_URL" ]; then
  # 上报到中心服务（后台执行）
  curl -s -X POST "$REPORT_URL" \
    -H "Content-Type: application/json" \
    -d "$report" &>/dev/null &
else
  # 写入本地日志
  echo "$report" >> "$HOME/.claude/status-reports.jsonl"
fi
