# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.3.1] - 2026-04-18

### Fixed
- show error in report when Uptime Kuma fetch fails instead of silently dropping

## [1.3.0] - 2026-04-18

### Added
- rename json_only to uptime_kuma nested object, update README

## [1.2.0] - 2026-04-18

### Added
- add json_only mode to skip API key probing, use Uptime Kuma heartbeat JSON instead

## [1.1.6] - 2026-04-16

### Changed
- rename recommend.html to index.html for cleaner URL

## [1.1.5] - 2026-04-16

### Changed
- rename review.html to recommend.html

## [1.1.4] - 2026-04-16

### Fixed
- add --target main to gh release create

## [1.1.3] - 2026-04-16

### Fixed
- create GitHub Release directly in auto-release workflow

## [1.1.2] - 2026-04-16

### Changed
- rename 套餐 to 分组 in config example

## [1.1.1] - 2026-04-16

### Fixed
- `api-probe.js`: missing closing brace in `loadFromCcSwitch()` caused ESM export to fail on Node.js 24

## [1.1.0] - 2026-04-15

### Added
- Config validation module (`src/validate.js`) and CLI command (`npm run validate`)
- Unit tests for diff, format, and validate modules (`npm test`)
- CI workflow: runs tests on push to main and PRs
- CONTRIBUTING.md with branch naming, commit conventions, and PR process
- CHANGELOG.md following Keep a Changelog format
- GitHub Issue and PR templates
- Release workflow: auto-creates GitHub Release on tag push
- README: English summary, CI badge, expanded troubleshooting

### Changed
- Notifier errors are now logged instead of silently swallowed
- `api-probe.js`: config loading failures now emit warnings
- `api-probe.js`: provider probing uses `Promise.allSettled` (one failure no longer blocks others)
- `diff.js`: status file parse errors now emit warnings
- GitHub Actions workflows use `actions/cache` for status data instead of committing to git
- `config.example.json`: added `models_path` field example

## [1.0.0] - 2026-04-01

### Added
- API probe: `/v1/models` endpoint probing with zero token cost
- Deep check: per-model `/v1/chat/completions` probing
- Multi-key support: multiple API keys per provider with labels
- Uptime Kuma integration: aggregate public monitoring data
- 8 notification channels: Server酱, 飞书, 企业微信, Telegram, 钉钉, PushPlus, Gotify, Bark
- 3 run modes: check (always notify), change-only, digest
- Daily digest workflow
- Claude Code plugin with MCP server (`/check-status`, `/check-provider`)
- One-click config sync to GitHub Secrets (`npm run sync-secret`)
- Provider review page (`docs/review.html`)
