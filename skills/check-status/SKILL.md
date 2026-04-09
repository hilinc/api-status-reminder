---
name: check-status
description: 实时探测所有 AI 中转站状态
---

调用 check_status MCP 工具，实时探测所有已配置的 AI 中转站状态。

输出规则（必须严格遵守）：
1. 第一行必须显示"配置来源: xxx"（从工具返回内容中提取）
2. 将工具返回的 markdown 表格原样输出，不要改写为列表或其他格式
3. 不要添加总结、分析或建议
