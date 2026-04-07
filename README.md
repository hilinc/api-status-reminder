# API Status Reminder

自动检测 AI 中转站可用性，状态变化时推送通知。

## 功能特性

- 抓取 Uptime Kuma 状态页（如 ai.ltcraft.cn）
- 用你自己的 API Key 探测中转站 `/v1/models` 接口（零 token 消耗）
- 状态变化时推送通知，包含全量状态概览
- 每日定时发送全量状态报告（可配置时间）
- 支持多种通知渠道（Server酱、飞书、企业微信）
- GitHub Actions 定时运行，零部署成本

## 数据源

| 数据源 | 说明 | 配置方式 |
|--------|------|----------|
| Uptime Kuma | 抓取状态页 JSON API | 环境变量 `UPTIME_KUMA_BASE` |
| API Probe | 用你的 Key 调 /v1/models | `config.json` 或 Secret `API_PROBE_CONFIG` |

## 使用方法

### 1. Fork 本仓库

### 2. 配置通知渠道

在仓库 Settings → Secrets and variables → Actions 中添加你需要的通知渠道：

#### Server 酱

- `SERVERCHAN_KEY`: Server 酱的 SendKey

获取方式：登录 [sct.ftqq.com](https://sct.ftqq.com/)，在「设置」中找到 SendKey。

#### 飞书机器人

- `FEISHU_WEBHOOK`: 飞书机器人的 Webhook 地址

获取方式：
1. 打开飞书，进入目标群聊
2. 群设置 → 群机器人 → 添加机器人 → 自定义机器人
3. 复制 Webhook 地址

#### 企业微信机器人

- `WECOM_WEBHOOK`: 企业微信机器人的 Webhook 地址

获取方式：
1. 打开企业微信，进入目标群聊
2. 群设置 → 群机器人 → 添加 → 新建机器人
3. 复制 Webhook 地址

> 每个通知渠道独立配置，只配置你需要的即可，未配置的会自动跳过。

### 3. 配置数据源

在仓库 Settings → Secrets and variables → Actions → Variables 中配置：

- `UPTIME_KUMA_BASE`: Uptime Kuma 状态页地址（如 `https://ai.ltcraft.cn`）

### 4. 配置 API 探测（可选）

如果你想用自己的 API Key 探测中转站可用性（推荐 [PackyCode](https://www.packyapi.com/register?aff=YNms)）：

1. 复制 `config.example.json` 为 `config.json`
2. 填入你的中转站信息：

```json
{
  "providers": [
    {
      "name": "packycode",
      "base_url": "https://www.packyapi.com",
      "api_key": "sk-your-key-here"
    }
  ]
}
```

> 探测只调用 `/v1/models` 接口获取模型列表，不消耗 token。
>
> `config.json` 已在 `.gitignore` 中，不会被提交到仓库。如需在 GitHub Actions 中使用，请将 config 内容存为 Secret `API_PROBE_CONFIG`，并在 workflow 中写入文件。

### 5. 启用 GitHub Actions

Push 代码后，Actions 会自动每 5 分钟运行一次。也可以在 Actions 页面手动触发 `workflow_dispatch`。

## 本地运行

```bash
npm ci

# 设置环境变量
export UPTIME_KUMA_BASE=https://ai.ltcraft.cn
export SERVERCHAN_KEY=your-sendkey

# 状态检测（有变化时通知）
node src/index.js

# 每日摘要（发送全量状态报告）
node src/index.js digest
```

## 每日摘要通知

除了状态变化时的实时通知，还支持每日定时发送全量状态报告。

默认北京时间每天 09:00 发送，可在 `.github/workflows/digest.yml` 中修改 cron 表达式：

```yaml
schedule:
  - cron: '0 1 * * *'    # UTC 01:00 = 北京时间 09:00
```

常用时间配置：

| 北京时间 | cron 表达式 |
|---------|------------|
| 08:00 | `0 0 * * *` |
| 09:00 | `0 1 * * *` |
| 20:00 | `0 12 * * *` |
| 08:00 和 20:00 | `0 0,12 * * *` |

也可以在 Actions 页面手动触发 `Daily Status Digest`。

## Claude Code 社区上报（可选）

如果你使用 Claude Code + proxy-bridge，可以安装 Stop hook，会话结束时自动上报中转站可用性数据（脱敏，零 token 消耗）。

### 安装

在 `~/.claude/settings.json` 的 `hooks.Stop` 中添加：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/api-status-reminder/hooks/status-report.sh"
          }
        ]
      }
    ]
  }
}
```

上报数据示例（只包含域名、状态码、延迟，不含 API Key 或请求内容）：

```json
{
  "ts": 1775572739,
  "base_url": "http://127.0.0.1:8080",
  "sites": {
    "ai.ltcraft.cn": {
      "total": 5,
      "success": 4,
      "avg_latency_ms": 2300
    }
  }
}
```

默认写入本地 `~/.claude/status-reports.jsonl`。配置 `API_STATUS_REPORT_URL` 环境变量可上报到中心服务。

## 通知效果

状态变化时会收到类似这样的通知：

```
中转站状态变化 (3项)

## ltcraft — 部分异常

| 模型 | 状态 | 延迟 | 24h可用率 |
|------|------|------|----------|
| System | ✅ | 59ms | 98.5% |
| Claude(Kiro) | ✅ | 2268ms | 95.0% |
| GPT | ❌ | - | 0.0% |

### 变化
- GPT: ✅ → ❌
```

## License

ISC
