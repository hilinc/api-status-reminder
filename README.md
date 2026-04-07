# API Status Reminder

自动检测 AI 中转站可用性，状态变化时推送通知到你的手机。

## 功能

- 用你自己的 API Key 探测中转站 `/v1/models` 接口（零 token 消耗）
- 可选开启 `deep_check`，逐模型调用 `/v1/chat/completions` 实测可用性（极少量 token）
- 支持接入 Uptime Kuma 状态页，聚合公共监控数据
- 状态变化时推送通知，包含总览 + 每站明细
- 每日定时发送全量状态报告（可配置时间）
- 支持 Server酱、飞书、企业微信、Telegram、钉钉、PushPlus、Gotify、Bark 通知
- GitHub Actions 定时运行，零部署成本

## 通知效果

```
中转站状态报告

## 总览

| 站点 | 连通性 | 延迟 | 可用模型 |
|------|--------|------|----------|
| ltcraft | ✅ | 908ms | 服务 2/7 |
| packyapi | ✅ | 816ms | 15 (未实测) |

## ltcraft 服务明细

| 服务 | 状态 | 延迟 |
|------|------|------|
| System | ✅ | 85ms |
| Claude(Anti) | ❌ | - |
| GPT | ❌ | - |
| Gemini | ❌ | - |
| sonnet4.5 | ❌ | - |
| Claude(Kiro) | ✅ | 1730ms |
| Claude(vertex) | ❌ | - |

## packyapi 模型明细

| 模型 |
|------|
| claude-haiku-4-5-20251001 |
| claude-opus-4-6 |
| claude-sonnet-4-6 |
| gpt-5 |
| gpt-5-codex |
| gpt-5.1 |
| ... |

> 仅 /v1/models 返回，未实测可用性
```

## 快速开始

### 1. Fork 本仓库

### 2. 配置 API 探测

在仓库 Settings → Secrets and variables → Actions → Secrets 中添加 `API_PROBE_CONFIG`，值为 JSON 格式的中转站配置：

```json
{
  "providers": [
    {
      "name": "packycode",
      "base_url": "https://www.packyapi.com",
      "api_key": "sk-your-key-here"
    },
    {
      "name": "another-provider",
      "base_url": "https://www.packyapi.com",
      "api_key": "sk-another-key",
      "deep_check": true
    }
  ]
}
```

如果你还没有中转站，可以试试 [PackyCode](https://www.packyapi.com/register?aff=YNms)，支持 Claude、GPT 等主流模型，用着还比较稳。

**字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 站点显示名称 |
| `base_url` | 是 | 中转站 API 地址 |
| `api_key` | 二选一 | 单个 API Key |
| `api_keys` | 二选一 | 多个 API Key（同一站点不同分组/套餐） |
| `deep_check` | 否 | 设为 `true` 逐模型实测可用性（会消耗少量 token） |
| `models` | 否 | 手动指定模型列表，当 `/v1/models` 返回空时作为 fallback |
| `models_path` | 否 | 自定义模型列表端点，默认 `/v1/models` |

`api_keys` 格式：

```json
"api_keys": [
  { "key": "sk-group-a-key", "label": "套餐A" },
  { "key": "sk-group-b-key", "label": "套餐B" }
]
```

每个 key 独立探测模型列表，结果去重合并展示在同一个站点下。同一模型如果多个 key 都能访问，取可用的结果。

不开启 `deep_check` 时，只调用 `/v1/models` 获取模型列表，零 token 消耗，但无法确认单个模型是否真正可用。

开启 `deep_check` 后，会对每个模型发送一次最短请求（约 20 tokens），能拿到具体的 HTTP 状态码（200/403/429/500/超时等）。

### 3. 配置通知渠道

在 Secrets 中添加你需要的通知渠道（至少配一个）：

| Secret 名称 | 通知渠道 | 获取方式 |
|-------------|---------|---------|
| `SERVERCHAN_KEY` | Server酱 | [sct.ftqq.com](https://sct.ftqq.com/) → 设置 → SendKey |
| `FEISHU_WEBHOOK` | 飞书机器人 | 群设置 → 群机器人 → 自定义机器人 → Webhook 地址 |
| `WECOM_WEBHOOK` | 企业微信机器人 | 群设置 → 群机器人 → 新建机器人 → Webhook 地址 |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot | 在 Telegram 中找 [@BotFather](https://t.me/BotFather)，发送 `/newbot` 创建机器人，获取 Token |
| `TELEGRAM_CHAT_ID` | Telegram Chat ID | 给机器人发一条消息，然后访问 `https://api.telegram.org/bot<你的Token>/getUpdates` 查看 `chat.id` |
| `DINGDING_WEBHOOK` | 钉钉机器人 | 群设置 → 智能群助手 → 添加机器人 → 自定义，安全设置选"自定义关键词"填 `中转站` |
| `PUSHPLUS_TOKEN` | PushPlus | [pushplus.plus](https://www.pushplus.plus/) 注册后获取 Token |
| `GOTIFY_URL` | Gotify | 你的 Gotify 服务地址（如 `https://gotify.example.com/message`） |
| `GOTIFY_TOKEN` | Gotify Token | Gotify 应用的访问令牌 |
| `BARK_KEY` | Bark | 打开 Bark App 即可看到 Key |
| `BARK_SERVER` | Bark 自建服务器（可选） | 默认 `https://api.day.app` |

每个渠道独立配置，未配置的会自动跳过。

### 4. 启用 GitHub Actions

Push 代码后，Actions 会自动定时运行。也可以在 Actions 页面手动触发 `workflow_dispatch` 验证配置。

默认每小时检测一次，仅在北京时间 09:00-18:00 期间触发。可在 `.github/workflows/check.yml` 中修改 cron 表达式：

```yaml
schedule:
  - cron: '0 1-10 * * *'    # UTC 01:00-10:00 = 北京时间 09:00-18:00，每小时
```

常用配置：

| 说明 | cron |
|------|------|
| 每小时，北京 09-18 点（默认） | `0 1-10 * * *` |
| 每小时，全天 | `0 * * * *` |
| 每 30 分钟，北京 09-18 点 | `*/30 1-10 * * *` |
| 每小时，仅工作日 | `0 1-10 * * 1-5` |

> GitHub Actions 的 schedule cron 不保证精确触发，实际可能有几分钟到十几分钟的延迟。如需更精确的定时，建议使用自建服务器 + cron。

## 每日摘要

除了状态变化时的实时通知，还支持每日定时发送全量状态报告。

默认北京时间每天 09:00 发送，可在 `.github/workflows/digest.yml` 中修改 cron 表达式：

```yaml
schedule:
  - cron: '0 1 * * *'    # UTC 01:00 = 北京时间 09:00
```

常用时间：

| 北京时间 | cron |
|---------|------|
| 08:00 | `0 0 * * *` |
| 09:00 | `0 1 * * *` |
| 20:00 | `0 12 * * *` |
| 08:00 和 20:00 | `0 0,12 * * *` |

## 接入 Uptime Kuma（可选）

如果你有 Uptime Kuma 状态页，可以在 `.github/workflows/check.yml` 中配置环境变量：

```yaml
UPTIME_KUMA_BASE: https://your-uptime-kuma-instance.com
```

程序会通过 Uptime Kuma 的 JSON API 获取监控数据，与 API 探测结果合并展示。同名站点会自动合并为一行。

## 本地运行

```bash
# 安装依赖
npm ci

# 创建配置文件
cp config.example.json config.json
# 编辑 config.json，填入你的中转站信息

# 状态检测（有变化时通知）
SERVERCHAN_KEY=your-sendkey node src/index.js

# 每日摘要
SERVERCHAN_KEY=your-sendkey node src/index.js digest

# 如需接入 Uptime Kuma
UPTIME_KUMA_BASE=https://your-instance.com node src/index.js
```

> `config.json` 已在 `.gitignore` 中，不会被提交到仓库。

## License

MIT
