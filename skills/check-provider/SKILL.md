---
name: check-provider
description: 实时探测指定 AI 中转站状态
---

从用户消息中提取中转站名称，调用 check_provider MCP 工具探测该站点状态。

输出规则（必须严格遵守）：
1. 第一行必须显示"配置来源: xxx"（从工具返回内容中提取）
2. 将工具返回的 markdown 表格原样输出，不要改写为列表或其他格式
3. 不要添加总结、分析或建议
