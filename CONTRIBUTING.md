# 贡献指南

感谢你对 API Status Reminder 的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境

```bash
# 克隆仓库
git clone https://github.com/hilinc/api-status-reminder.git
cd api-status-reminder

# 安装依赖
npm ci

# 创建配置文件
cp config.example.json config.json
# 编辑 config.json，填入你的中转站信息

# 校验配置
npm run validate

# 运行测试
npm test
```

## 分支规范

分支命名格式：`<type>/<nnn>-<short-description>`

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/002-webhook-retry` |
| `fix/` | Bug 修复 | `fix/003-telegram-timeout` |
| `docs/` | 文档 | `docs/004-english-readme` |
| `chore/` | 工程化/CI | `chore/005-lint-setup` |
| `refactor/` | 重构 | `refactor/006-notifier-base` |

编号三位递增（001, 002, 003...），描述用英文短横线连接。

## Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>: <description>

[optional body]
```

常用 type：`feat`, `fix`, `docs`, `chore`, `refactor`, `test`

示例：
```
feat: add config validation command
fix: log notifier failures instead of swallowing
docs: expand troubleshooting section
```

## PR 流程

1. Fork 仓库
2. 从 main 创建分支（遵循分支规范）
3. 开发并确保 `npm test` 通过
4. 更新 CHANGELOG.md（在 `[Unreleased]` 下添加你的改动）
5. 提交 PR 到 main

PR 合并要求：
- CI 测试通过
- 至少一个 review approval
- CHANGELOG 已更新

## 版本发布

项目使用 [语义化版本](https://semver.org/lang/zh-CN/)：

- `MAJOR`：不兼容的 API 变更
- `MINOR`：向下兼容的新功能
- `PATCH`：向下兼容的 Bug 修复

发布流程：
1. 将 CHANGELOG.md 中 `[Unreleased]` 改为版本号和日期
2. 更新 `package.json` 中的 `version`
3. 合并到 main
4. 在 main 上打 tag：`git tag v1.x.x && git push origin v1.x.x`
5. Tag 推送后 GitHub Actions 自动创建 Release

## 分支保护

main 分支受保护：
- 禁止直接 push，必须通过 PR
- PR 需要 CI 通过
- PR 需要至少一个 review

## 项目结构

```
src/
├── index.js          # CLI 入口
├── mcp-server.js     # Claude Code 插件 MCP 服务
├── validate.js       # 配置校验
├── format.js         # 报告格式化
├── diff.js           # 状态对比 + 持久化
├── scrapers/         # 数据采集
│   ├── api-probe.js  # API 探测
│   └── ltcraft.js    # Uptime Kuma 采集
└── notifiers/        # 通知渠道（8 个）
```

## 添加新的通知渠道

1. 在 `src/notifiers/` 下新建文件
2. 导出 `async function notify(title, markdown)` 函数
3. 未配置时静默返回（不抛错）
4. 在 `src/index.js` 中导入并加入 `notifiers` 数组
5. 在 workflow 文件中添加对应的 Secret 环境变量
6. 更新 README 通知渠道表格
