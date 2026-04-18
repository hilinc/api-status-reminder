# API Status Reminder

[![CI](https://github.com/hilinc/api-status-reminder/actions/workflows/ci.yml/badge.svg)](https://github.com/hilinc/api-status-reminder/actions/workflows/ci.yml)

[English](./README.en.md)

自动检测 AI 中转站可用性，状态变化时推送通知到你的手机。安装插件后还可以在 Claude Code 中直接查询中转站状态。

维护开源不易，如果本项目帮助到了你，请帮忙点个 Star，谢谢!

如果你还没有中转站，可以看看我整理的 [中转站推荐](https://hilinc.github.io/api-status-reminder/)，里面有几家实际用过的站点对比。

## 功能

- 用你自己的 API Key 探测中转站 `/v1/models` 接口（零 token 消耗）
- 可选开启 `deep_check`，逐模型调用 `/v1/chat/completions` 实测可用性（极少量 token）
- 支持接入 Uptime Kuma 状态页，聚合公共监控数据
- 状态变化时推送通知，包含总览 + 每站明细
- 每日定时发送全量状态报告（可配置时间）
- 支持 Server酱、飞书、企业微信、Telegram、钉钉、PushPlus、Gotify、Bark 通知
- Claude Code 插件：在对话中直接查询中转站状态，支持 `/check-status` 和 `/check-provider` 命令
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
| Claude(Anti) | DOWN | - |
| GPT | DOWN | - |
| Gemini | DOWN | - |
| sonnet4.5 | DOWN | - |
| Claude(Kiro) | ✅ | 1730ms |
| Claude(vertex) | DOWN | - |

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

> **⚠️ API Key 安全提示：请使用测试用 Key 或有限额度的 Key，不要使用主力 Key。** 每次探测会调用 `/v1/models` 接口（零 token 消耗）；开启 `deep_check` 后每模型会消耗约 20 tokens。Key 一旦泄露可能造成损失，建议单独创建一个低额度的 Key 用于监控。

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

**一键同步配置（推荐）：** 不想每次在 GitHub 网页上手动粘贴 JSON？可以用本地 `config.json` 作为配置源，一条命令同步到 GitHub Secrets：

```bash
# 1. 复制并编辑配置文件
cp config.example.json config.json
# 编辑 config.json，填入你的中转站信息

# 2. 同步到 GitHub Secrets（需要 gh CLI）
# macOS: brew install gh
# Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
# Windows: winget install --id GitHub.cli
npm run sync-secret
```

以后每次修改 `config.json` 后跑一次 `npm run sync-secret` 即可，本地文件就是你的唯一配置源。`config.json` 已在 `.gitignore` 中，不会被提交到仓库。

**字段说明：**

| 字段          | 必填   | 说明                                                    |
| ------------- | ------ | ------------------------------------------------------- |
| `name`        | 是     | 站点显示名称                                            |
| `base_url`    | 是*    | 中转站 API 地址（使用 `uptime_kuma` 时可省略）          |
| `api_key`     | 二选一 | 单个 API Key（使用 `uptime_kuma` 时可省略）             |
| `api_keys`    | 二选一 | 多个 API Key（同一站点不同分组）                        |
| `deep_check`  | 否     | 设为 `true` 逐模型实测可用性（会消耗少量 token）        |
| `models`      | 否     | 手动指定模型列表，当 `/v1/models` 返回空时作为 fallback |
| `models_path` | 否     | 自定义模型列表端点，默认 `/v1/models`                   |
| `uptime_kuma` | 否     | 从 Uptime Kuma 状态页读取数据，不消耗 API Key（见下）   |

`api_keys` 格式：

```json
"api_keys": [
  { "key": "sk-group-a-key", "label": "分组A" },
  { "key": "sk-group-b-key", "label": "分组B" }
]
```

每个 key 独立探测模型列表，结果去重合并展示在同一个站点下。同一模型如果多个 key 都能访问，取可用的结果。

不开启 `deep_check` 时，只调用 `/v1/models` 获取模型列表，零 token 消耗，但无法确认单个模型是否真正可用。

开启 `deep_check` 后，会对每个模型发送一次最短请求（约 20 tokens），能拿到具体的 HTTP 状态码（200/403/429/500/超时等）。

**`uptime_kuma` 模式**：如果站点有 [Uptime Kuma](https://github.com/louislam/uptime-kuma) 状态页，可以直接从状态页读取监控数据，完全不需要 API Key：

```json
{
  "name": "ltcraft",
  "uptime_kuma": {
    "base": "https://ai.ltcraft.cn",
    "slug": "ai-status"
  }
}
```

| `uptime_kuma` 子字段 | 必填 | 说明 |
| -------------------- | ---- | ---- |
| `base`               | 否   | Uptime Kuma 服务地址，默认读 `UPTIME_KUMA_BASE` 环境变量 |
| `slug`               | 否   | 状态页 slug，默认读 `UPTIME_KUMA_SLUG` 环境变量 |
| `ids`                | 否   | 只取指定 monitor ID 的数据，不填则取全部 |

### 3. 配置通知渠道

在 Secrets 中添加你需要的通知渠道（至少配一个）：

| Secret 名称          | 通知渠道                | 获取方式                                                                                         |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `SERVERCHAN_KEY`     | Server酱                | [sct.ftqq.com](https://sct.ftqq.com/) → 设置 → SendKey                                           |
| `FEISHU_WEBHOOK`     | 飞书机器人              | 群设置 → 群机器人 → 自定义机器人 → Webhook 地址                                                  |
| `WECOM_WEBHOOK`      | 企业微信机器人          | 群设置 → 群机器人 → 新建机器人 → Webhook 地址                                                    |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot            | 在 Telegram 中找 [@BotFather](https://t.me/BotFather)，发送 `/newbot` 创建机器人，获取 Token     |
| `TELEGRAM_CHAT_ID`   | Telegram Chat ID        | 给机器人发一条消息，然后访问 `https://api.telegram.org/bot<你的Token>/getUpdates` 查看 `chat.id` |
| `DINGDING_WEBHOOK`   | 钉钉机器人              | 群设置 → 智能群助手 → 添加机器人 → 自定义，安全设置选"自定义关键词"填 `中转站`                   |
| `PUSHPLUS_TOKEN`     | PushPlus                | [pushplus.plus](https://www.pushplus.plus/) 注册后获取 Token                                     |
| `GOTIFY_URL`         | Gotify                  | 你的 Gotify 服务地址（如 `https://gotify.example.com/message`）                                  |
| `GOTIFY_TOKEN`       | Gotify Token            | Gotify 应用的访问令牌                                                                            |
| `BARK_KEY`           | Bark                    | 打开 Bark App 即可看到 Key                                                                       |
| `BARK_SERVER`        | Bark 自建服务器（可选） | 默认 `https://api.day.app`                                                                       |

每个渠道独立配置，未配置的会自动跳过。

### 4. 启用 GitHub Actions

Push 代码后，Actions 会自动定时运行。也可以在 Actions 页面手动触发 `workflow_dispatch` 验证配置。

默认每小时检测一次，在北京时间 09:00-23:00 期间触发。可在 `.github/workflows/check.yml` 中修改 cron 表达式：

```yaml
schedule:
  - cron: "0 1-15 * * *" # UTC 01:00-15:00 = 北京时间 09:00-23:00，每小时
```

常用配置：

| 说明                          | cron              |
| ----------------------------- | ----------------- |
| 每小时，北京 09-23 点（默认） | `0 1-15 * * *`    |
| 每小时，全天                  | `0 * * * *`       |
| 每 30 分钟，北京 09-23 点     | `*/30 1-15 * * *` |
| 每小时，仅工作日              | `0 1-15 * * 1-5`  |

> GitHub Actions 的 schedule cron 不保证精确触发，实际可能有几分钟到十几分钟的延迟。如需更精确的定时，建议使用自建服务器 + cron。

## 运行模式

通过命令行参数指定运行模式：

```bash
node src/index.js [mode]
```

| 模式            | 说明                                         |
| --------------- | -------------------------------------------- |
| `check`（默认） | 每次运行都推送通知                           |
| `change-only`   | 仅在状态发生变化时推送通知，适合高频检测场景 |
| `digest`        | 发送全量状态报告，用于每日摘要               |

如需仅在状态变化时通知，修改 `.github/workflows/check.yml` 中的运行命令：

```yaml
- run: node src/index.js change-only
```

## 每日摘要

除了状态变化时的实时通知，还支持每日定时发送全量状态报告。

默认北京时间每天 09:00 发送，可在 `.github/workflows/digest.yml` 中修改 cron 表达式：

```yaml
schedule:
  - cron: "0 1 * * *" # UTC 01:00 = 北京时间 09:00
```

常用时间：

| 北京时间       | cron           |
| -------------- | -------------- |
| 08:00          | `0 0 * * *`    |
| 09:00          | `0 1 * * *`    |
| 20:00          | `0 12 * * *`   |
| 08:00 和 20:00 | `0 0,12 * * *` |

## 接入 Uptime Kuma（可选）

如果你有 Uptime Kuma 状态页，可以在 `.github/workflows/check.yml` 中配置环境变量：

```yaml
UPTIME_KUMA_BASE: https://your-uptime-kuma-instance.com
```

程序会通过 Uptime Kuma 的 JSON API 获取监控数据，与 API 探测结果合并展示。同名站点会自动合并为一行。

## Claude Code 插件

除了 GitHub Actions 定时推送，还可以在 Claude Code 中直接查询中转站状态。

### 安装

通过插件市场安装：

```bash
/plugin add-marketplace directory /path/to/api-status-reminder
/plugin install hilinc-plugins/api-status-reminder
```

重启 Claude Code 后即可使用。

### 配置

插件从以下位置读取配置（优先级从高到低）：

**1. cc-switch 自动读取**（推荐）

如果你使用 [cc-switch](https://github.com/hilinc/cc-switch) 管理中转站，在 `~/.api-status/config.json` 中开启：

```json
{ "use_cc_switch": true }
```

插件会自动读取 cc-switch 中所有 provider 配置，无需重复填写。

**2. 环境变量 `API_PROBE_CONFIG`**

与 GitHub Actions 共用同一份配置。

**3. `~/.api-status/config.json`**

```json
{
  "providers": [
    {
      "name": "packyapi",
      "base_url": "https://www.packyapi.com",
      "api_key": "sk-your-key-here",
      "deep_check": true
    }
  ]
}
```

### 使用

安装后，在 Claude Code 对话中直接说：

- "查下中转站状态" → 返回所有站点总览 + 模型明细
- "查下 packyapi 状态" → 只探测指定站点

也可以使用 skill 命令：

```
/check-status
/check-provider packyapi
```

## 本地运行

```bash
# 安装依赖
npm ci

# 创建配置文件
cp config.example.json config.json
# 编辑 config.json，填入你的中转站信息

# 校验配置
npm run validate

# 状态检测（有变化时通知）
SERVERCHAN_KEY=your-sendkey node src/index.js

# 每日摘要
SERVERCHAN_KEY=your-sendkey node src/index.js digest

# 如需接入 Uptime Kuma
UPTIME_KUMA_BASE=https://your-instance.com node src/index.js
```

> `config.json` 已在 `.gitignore` 中，不会被提交到仓库。

## 赞助

如果这个项目对你有帮助，欢迎请作者喝杯咖啡 ☕

<img src="docs/wechat-donate.png" width="300" alt="微信赞赏码" />

## 免责声明

本脚本仅用于学习和研究目的，使用前请确保遵守相关网站的使用条款。

## License

MIT

## 故障排除

### 通知发送失败

运行日志中出现 `通知发送失败` 字样时：

1. 检查对应通知渠道的 Secret 是否正确配置（注意不要有多余空格或换行）
2. Server酱：确认 SendKey 未过期，免费版每天限 5 条
3. Telegram：确认 Bot Token 和 Chat ID 都已配置，且机器人已被添加到目标群组
4. 飞书/企业微信/钉钉：确认 Webhook 地址完整且未被禁用
5. 本地测试：`SERVERCHAN_KEY=your-key node src/index.js check` 查看完整错误信息

### config.json 格式错误

```bash
# 校验配置文件，会提示具体哪个字段有问题
npm run validate
```

常见问题：

- JSON 语法错误（多余逗号、缺少引号）
- `base_url` 不是合法 URL
- 既没有 `api_key` 也没有 `api_keys`
- `deep_check` 写成了字符串 `"true"` 而不是布尔值 `true`

### GitHub Actions 运行失败

1. 在 Actions 页面查看失败的 workflow run 日志
2. 确认 `API_PROBE_CONFIG` Secret 已配置且是合法 JSON
3. 确认至少配置了一个通知渠道的 Secret
4. 手动触发 `workflow_dispatch` 测试：Actions → API Status Check → Run workflow

### API Key 无效或模型列表为空

- 确认 Key 未过期、未被封禁
- 部分中转站的 `/v1/models` 接口需要特定权限，尝试联系站长确认
- 如果 `/v1/models` 返回空，可以在配置中手动指定 `models` 列表作为 fallback
- 使用 `models_path` 字段自定义模型列表端点（部分站点使用 `/v1beta/models`）

### Skill 命令无法识别（"Unknown skill: check-status"）

如果安装后 `/check-status` 和 `/check-provider` 命令无法识别，尝试以下步骤：

1. 在 `~/.claude/settings.json` 中显式启用插件：

   ```json
   {
     "enabledPlugins": {
       "api-status-reminder@hilinc-plugins": true
     }
   }
   ```

2. 手动创建 skill 符号链接：

   ```bash
   ln -sf ~/.claude/plugins/cache/hilinc-plugins/api-status-reminder/*/skills/check-status ~/.claude/skills/check-status
   ln -sf ~/.claude/plugins/cache/hilinc-plugins/api-status-reminder/*/skills/check-provider ~/.claude/skills/check-provider
   ```

3. 重启 Claude Code

这通常是 Claude Code 插件系统的已知问题，未来版本可能会修复。
