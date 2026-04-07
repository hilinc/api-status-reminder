# API Status Reminder

自动检测 AI 中转站可用性，状态变化时推送通知。

## 功能特性

- 抓取 Uptime Kuma 状态页（如 ai.ltcraft.cn）
- 抓取 check-cx 状态页（如 check.linux.do）
- 用你自己的 API Key 探测中转站 `/v1/models` 接口（零 token 消耗）
- 状态变化时推送通知，支持多种通知渠道
- GitHub Actions 定时运行，零部署成本

## 数据源

| 数据源 | 说明 | 环境变量 |
|--------|------|----------|
| Uptime Kuma | 抓取状态页 JSON API | `UPTIME_KUMA_BASE` |
| check-cx | 抓取 check.linux.do API | `CHECK_CX_BASE` |
| API Probe | 用你的 Key 调 /v1/models | `config.json` |

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
- `CHECK_CX_BASE`: check-cx 状态页地址（如 `https://check.linux.do`）

### 4. 配置 API 探测（可选）

如果你想用自己的 API Key 探测中转站可用性：

1. 复制 `config.example.json` 为 `config.json`
2. 填入你的中转站信息：

```json
{
  "providers": [
    {
      "name": "my-provider",
      "base_url": "https://api.example.com",
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

# 运行
node src/index.js
```

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
