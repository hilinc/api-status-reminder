# API Status Reminder

[![CI](https://github.com/hilinc/api-status-reminder/actions/workflows/ci.yml/badge.svg)](https://github.com/hilinc/api-status-reminder/actions/workflows/ci.yml)

[中文](./README.md)

Automated availability monitoring for AI API relay stations. Probes endpoints with your own API keys, detects status changes, and pushes notifications to your phone.

If this project helps you, please give it a Star!

If you don't have a relay station yet, check out the [Relay Station Recommendations](https://hilinc.github.io/api-status-reminder/) for a comparison of sites I've actually used.

## Features

- Probe relay station `/v1/models` endpoint with your own API Key (zero token cost)
- Optional `deep_check`: test each model via `/v1/chat/completions` (minimal token usage)
- Uptime Kuma integration for aggregating public monitoring data
- Push notifications on status changes with overview + per-site details
- Daily scheduled full status reports (configurable time)
- Claude Code plugin: query relay station status directly in conversation (`/check-status`, `/check-provider`)
- 8 notification channels: ServerChan, Feishu, WeCom, Telegram, DingTalk, PushPlus, Gotify, Bark
- Runs on GitHub Actions with zero deployment cost

## Quick Start

### 1. Fork this repository

### 2. Configure API probing

> **Warning: Use a test key or low-balance key, not your primary key.** Each probe calls `/v1/models` (zero tokens). With `deep_check` enabled, each model costs ~20 tokens.

Add `API_PROBE_CONFIG` in repository Settings → Secrets and variables → Actions → Secrets, with JSON format:

```json
{
  "providers": [
    {
      "name": "my-provider",
      "base_url": "https://api.example.com",
      "api_key": "sk-your-key-here"
    },
    {
      "name": "another-provider",
      "base_url": "https://api.example.com",
      "api_key": "sk-another-key",
      "deep_check": true
    }
  ]
}
```

**One-click config sync:** Use local `config.json` as your single source of truth:

```bash
# 1. Copy and edit config
cp config.example.json config.json

# 2. Sync to GitHub Secrets (requires gh CLI)
# macOS: brew install gh
# Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
# Windows: winget install --id GitHub.cli
npm run sync-secret
```

**Field reference:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name |
| `base_url` | Yes | API base URL |
| `api_key` | Either | Single API key |
| `api_keys` | Either | Multiple API keys with labels |
| `deep_check` | No | Set `true` to test each model (costs tokens) |
| `models` | No | Manual model list, fallback when `/v1/models` returns empty |
| `models_path` | No | Custom models endpoint, default `/v1/models` |

### 3. Configure notification channels

Add at least one notification channel in Secrets:

| Secret | Channel | How to get |
|--------|---------|------------|
| `SERVERCHAN_KEY` | ServerChan | [sct.ftqq.com](https://sct.ftqq.com/) → Settings → SendKey |
| `FEISHU_WEBHOOK` | Feishu Bot | Group Settings → Bot → Custom Bot → Webhook URL |
| `WECOM_WEBHOOK` | WeCom Bot | Group Settings → Bot → New Bot → Webhook URL |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot | [@BotFather](https://t.me/BotFather) → `/newbot` |
| `TELEGRAM_CHAT_ID` | Telegram Chat ID | Send a message to bot, then visit `https://api.telegram.org/bot<Token>/getUpdates` |
| `DINGDING_WEBHOOK` | DingTalk Bot | Group → Smart Assistant → Add Bot → Custom keyword: `中转站` |
| `PUSHPLUS_TOKEN` | PushPlus | [pushplus.plus](https://www.pushplus.plus/) |
| `GOTIFY_URL` | Gotify | Your Gotify server URL |
| `GOTIFY_TOKEN` | Gotify Token | Gotify app token |
| `BARK_KEY` | Bark | Open Bark App to see Key |
| `BARK_SERVER` | Bark Server (optional) | Default `https://api.day.app` |

Unconfigured channels are silently skipped.

### 4. Enable GitHub Actions

Actions run automatically on schedule after pushing. You can also manually trigger via `workflow_dispatch`.

Default: hourly checks during Beijing time 09:00-23:00. Edit cron in `.github/workflows/check.yml`:

```yaml
schedule:
  - cron: "0 1-15 * * *" # UTC 01:00-15:00 = Beijing 09:00-23:00
```

## Run Modes

```bash
node src/index.js [mode]
```

| Mode | Description |
|------|-------------|
| `check` (default) | Always push notification |
| `change-only` | Notify only on status changes |
| `digest` | Full status report for daily digest |

## Daily Digest

Sends a full status report daily. Default Beijing time 08:00, configurable in `.github/workflows/digest.yml`.

## Uptime Kuma Integration (Optional)

Set environment variable in workflow:

```yaml
UPTIME_KUMA_BASE: https://your-uptime-kuma-instance.com
```

## Claude Code Plugin

Query relay station status directly in Claude Code conversations.

### Install

```bash
/plugin add-marketplace directory /path/to/api-status-reminder
/plugin install hilinc-plugins/api-status-reminder
```

### Usage

- "Check relay status" → all sites overview + model details
- "Check packyapi status" → probe specific site

Or use skill commands: `/check-status`, `/check-provider packyapi`

## Local Development

```bash
npm ci
cp config.example.json config.json
# Edit config.json with your provider info

npm run validate  # Validate config
npm test          # Run tests

SERVERCHAN_KEY=your-sendkey node src/index.js
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, branch naming, commit conventions, and PR process.

## Sponsor

If this project helps you, consider buying the author a coffee.

<img src="docs/wechat-donate.png" width="300" alt="WeChat Donate" />

## Disclaimer

This script is for learning and research purposes only. Please ensure compliance with the terms of service of relevant websites before use.

## License

MIT
