import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from '../src/format.js';

describe('formatReport', () => {
  it('formats single api-probe site', () => {
    const status = {
      'api-probe': {
        checked_at: '2026-04-16T12:00:00.000Z',
        models: [{
          id: 'test-site', name: 'test-site', group: 'API Probe',
          status: 'up', ping_ms: 200, model_details: [
            { model: 'gpt-5', status: 'listed', code: 200 },
          ],
        }],
      },
    };
    const md = formatReport(status);
    assert.ok(md.includes('## 总览'));
    assert.ok(md.includes('test-site'));
    assert.ok(md.includes('✅'));
    assert.ok(md.includes('200ms'));
    assert.ok(md.includes('gpt-5'));
    assert.ok(md.includes('未实测'));
  });

  it('formats deep_check model details', () => {
    const status = {
      'api-probe': {
        checked_at: '2026-04-16T12:00:00.000Z',
        models: [{
          id: 'deep-site', name: 'deep-site', group: 'API Probe',
          status: 'up', ping_ms: 150, model_details: [
            { model: 'claude-sonnet', status: 'up', code: 200, latency_ms: 800 },
            { model: 'claude-opus', status: 'down', code: 429, latency_ms: 0 },
          ],
        }],
      },
    };
    const md = formatReport(status);
    assert.ok(md.includes('模型明细'));
    assert.ok(md.includes('claude-sonnet'));
    assert.ok(md.includes('800ms'));
    assert.ok(md.includes('429'));
  });

  it('formats uptime-kuma site', () => {
    const status = {
      'ltcraft': {
        checked_at: '2026-04-16T12:00:00.000Z',
        models: [
          { id: 1, name: 'System', status: 'up', ping_ms: 85 },
          { id: 2, name: 'Claude', status: 'down', ping_ms: null },
        ],
      },
    };
    const md = formatReport(status);
    assert.ok(md.includes('服务 1/2'));
    assert.ok(md.includes('服务明细'));
    assert.ok(md.includes('System'));
    assert.ok(md.includes('DOWN'));
  });

  it('handles empty status', () => {
    const md = formatReport({});
    assert.ok(md.includes('## 总览'));
    assert.ok(!md.includes('undefined'));
  });

  it('includes timestamp', () => {
    const status = {
      'api-probe': {
        checked_at: '2026-04-16T12:00:00.000Z',
        models: [],
      },
    };
    const md = formatReport(status);
    assert.ok(md.includes('2026-04-16T12:00:00.000Z'));
  });
});
