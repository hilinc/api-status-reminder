import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { formatReport } from "./format.js";
import { scrape as scrapeApiProbe, probeProvider, loadConfig } from "./scrapers/api-probe.js";
import { scrape as scrapeLtcraft } from "./scrapers/ltcraft.js";

const server = new McpServer({ name: "api-status", version: "1.0.0" });

server.tool("check_status", "实时探测所有中转站状态，返回总览和模型明细", {}, async () => {
  const config = loadConfig();
  const configSource = config?._source || 'unknown';
  const status = {};

  if (process.env.UPTIME_KUMA_BASE) {
    try {
      const result = await scrapeLtcraft();
      if (result) status[result.source] = { checked_at: result.checked_at, models: result.models };
    } catch (err) {
      // Uptime Kuma optional, skip on failure
    }
  }

  try {
    const result = await scrapeApiProbe();
    if (result) status[result.source] = { checked_at: result.checked_at, models: result.models };
  } catch (err) {
    return { content: [{ type: "text", text: `探测失败: ${err.message}` }] };
  }

  if (Object.keys(status).length === 0) {
    return { content: [{ type: "text", text: "未配置任何中转站。请设置 API_PROBE_CONFIG 环境变量或创建 ~/.api-status/config.json" }] };
  }

  const report = formatReport(status);
  return { content: [{ type: "text", text: `\`\`\`\n配置来源: ${configSource}\n\n${report}\n\`\`\`` }] };
});

server.tool(
  "check_provider",
  "实时探测指定中转站状态，返回模型明细",
  { name: z.string().describe("中转站名称，如 ltcraft、packyapi") },
  async ({ name }) => {
    const config = loadConfig();
    if (!config?.providers?.length) {
      return { content: [{ type: "text", text: "未配置任何中转站。请设置 API_PROBE_CONFIG 环境变量或创建 ~/.api-status/config.json" }] };
    }

    const provider = config.providers.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (!provider) {
      const names = config.providers.map((p) => p.name).join(", ");
      return { content: [{ type: "text", text: `未找到 "${name}"。可用站点: ${names}` }] };
    }

    try {
      const result = await probeProvider(provider);
      const status = {
        "api-probe": {
          checked_at: new Date().toISOString(),
          models: [{
            id: result.name, name: result.name, group: "API Probe",
            status: result.status, status_code: result.status_code,
            ping_ms: result.latency_ms, message: result.error || `${result.model_count} models`,
            checked_at: new Date().toISOString(), uptime_24h: null,
            model_list: result.models, model_details: result.model_details,
          }],
        },
      };
      return { content: [{ type: "text", text: `\`\`\`\n配置来源: ${config._source}\n\n${formatReport(status)}\n\`\`\`` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `探测 ${name} 失败: ${err.message}` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
