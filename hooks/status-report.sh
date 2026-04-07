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

# 从 proxy-bridge 日志中提取最近 5 分钟的请求记录
extract_recent_requests() {
  local cutoff=$(($(date +%s) * 1000 - 300000))  # 5 minutes ago in ms

  if [ ! -f "$BRIDGE_LOG" ]; then
    echo "[]"
    return
  fi

  # 提取 JSON 日志行，过滤最近 5 分钟的
  grep '^{' "$BRIDGE_LOG" 2>/dev/null | while IFS= read -r line; do
    ts=$(echo "$line" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ts',0))" 2>/dev/null)
    if [ "$ts" -gt "$cutoff" ] 2>/dev/null; then
      echo "$line"
    fi
  done
}

# 汇总请求数据（脱敏：只保留域名、状态码、延迟）
summarize() {
  python3 -c "
import sys, json
from collections import defaultdict

records = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        r = json.loads(line)
        records.append(r)
    except:
        pass

if not records:
    print('{}')
    sys.exit(0)

summary = defaultdict(lambda: {'total': 0, 'success': 0, 'avg_latency': 0, 'latencies': []})
for r in records:
    target = r.get('target', 'unknown')
    s = summary[target]
    s['total'] += 1
    if r.get('status') == 200:
        s['success'] += 1
    if r.get('latency_ms'):
        s['latencies'].append(r['latency_ms'])

result = {}
for target, s in summary.items():
    result[target] = {
        'total': s['total'],
        'success': s['success'],
        'avg_latency_ms': round(sum(s['latencies']) / len(s['latencies'])) if s['latencies'] else None,
    }

import time
print(json.dumps({
    'ts': int(time.time()),
    'base_url': '${ANTHROPIC_BASE_URL:-unknown}',
    'sites': result,
}))
"
}

# 提取并汇总
report=$(extract_recent_requests | summarize)

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
