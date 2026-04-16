#!/usr/bin/env node

/**
 * CLI: validate config.json
 * Usage: npm run validate
 */

import fs from 'fs';
import path from 'path';
import { validateConfig } from '../src/validate.js';

const configPath = path.join(process.cwd(), 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('❌ config.json 不存在');
  console.error('   运行 cp config.example.json config.json 创建配置文件');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (err) {
  console.error('❌ config.json 不是合法的 JSON');
  console.error(`   ${err.message}`);
  process.exit(1);
}

const { valid, errors } = validateConfig(config);

if (valid) {
  const count = config.providers.length;
  console.log(`✅ 配置校验通过（${count} 个站点）`);
  for (const p of config.providers) {
    const keyCount = p.api_keys ? p.api_keys.length : 1;
    console.log(`   - ${p.name} (${keyCount} key${keyCount > 1 ? 's' : ''})`);
  }
} else {
  console.error(`❌ 配置校验失败（${errors.length} 个错误）：`);
  for (const e of errors) {
    console.error(`   - ${e}`);
  }
  process.exit(1);
}
