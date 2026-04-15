#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '..', 'config.json');

// 1. 读取 config.json
if (!fs.existsSync(configPath)) {
  console.error('❌ config.json 不存在');
  console.error('   请先复制 config.example.json 并填入你的中转站信息：');
  console.error('   cp config.example.json config.json');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (err) {
  console.error('❌ config.json 格式错误:', err.message);
  process.exit(1);
}

// 2. 校验
if (!config.providers || !Array.isArray(config.providers) || config.providers.length === 0) {
  console.error('❌ config.json 中 providers 为空');
  process.exit(1);
}

// 3. 检查 gh CLI
try {
  execSync('gh --version', { stdio: 'ignore' });
} catch {
  console.error('❌ 需要安装 GitHub CLI (gh)');
  console.error('   macOS:   brew install gh');
  console.error('   其他:    https://cli.github.com/');
  process.exit(1);
}

// 4. 检查 gh 登录状态（gh auth status 在有失效账号时退出码非零，改用 gh auth token）
try {
  execSync('gh auth token', { stdio: 'ignore' });
} catch {
  console.error('❌ GitHub CLI 未登录，请先运行: gh auth login');
  process.exit(1);
}

// 5. 构建要同步的 JSON（去除 use_cc_switch 等本地字段，只保留 providers）
const secretPayload = JSON.stringify({ providers: config.providers });

// 6. 同步到 GitHub Secrets
try {
  execSync('gh secret set API_PROBE_CONFIG', {
    input: secretPayload,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
} catch {
  console.error('❌ 同步失败，请检查仓库权限');
  process.exit(1);
}

console.log(`✅ 已同步 ${config.providers.length} 个 provider 到 GitHub Secrets`);
for (const p of config.providers) {
  const keyCount = p.api_keys ? p.api_keys.length : 1;
  console.log(`   - ${p.name} (${keyCount} key${keyCount > 1 ? 's' : ''})`);
}
