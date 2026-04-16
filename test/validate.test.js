import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../src/validate.js';

describe('validateConfig', () => {
  it('passes valid config with api_key', () => {
    const config = {
      providers: [{
        name: 'test', base_url: 'https://api.example.com', api_key: 'sk-123',
      }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, true);
    assert.equal(errors.length, 0);
  });

  it('passes valid config with api_keys', () => {
    const config = {
      providers: [{
        name: 'test', base_url: 'https://api.example.com',
        api_keys: [{ key: 'sk-a', label: 'A' }],
      }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, true);
    assert.equal(errors.length, 0);
  });

  it('passes config with all optional fields', () => {
    const config = {
      providers: [{
        name: 'test', base_url: 'https://api.example.com', api_key: 'sk-123',
        deep_check: true, models: ['gpt-5'], models_path: '/v1/models',
      }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, true);
    assert.equal(errors.length, 0);
  });

  it('rejects null config', () => {
    const { valid } = validateConfig(null);
    assert.equal(valid, false);
  });

  it('rejects empty providers', () => {
    const { valid, errors } = validateConfig({ providers: [] });
    assert.equal(valid, false);
    assert.ok(errors[0].includes('providers'));
  });

  it('rejects missing name', () => {
    const config = {
      providers: [{ base_url: 'https://api.example.com', api_key: 'sk-123' }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('name')));
  });

  it('rejects invalid base_url', () => {
    const config = {
      providers: [{ name: 'test', base_url: 'not-a-url', api_key: 'sk-123' }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('base_url')));
  });

  it('rejects missing api_key and api_keys', () => {
    const config = {
      providers: [{ name: 'test', base_url: 'https://api.example.com' }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('api_key')));
  });

  it('rejects api_keys with missing key field', () => {
    const config = {
      providers: [{
        name: 'test', base_url: 'https://api.example.com',
        api_keys: [{ label: 'A' }],
      }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('api_keys')));
  });

  it('rejects wrong deep_check type', () => {
    const config = {
      providers: [{
        name: 'test', base_url: 'https://api.example.com',
        api_key: 'sk-123', deep_check: 'yes',
      }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('deep_check')));
  });

  it('rejects wrong models type', () => {
    const config = {
      providers: [{
        name: 'test', base_url: 'https://api.example.com',
        api_key: 'sk-123', models: 'gpt-5',
      }],
    };
    const { valid, errors } = validateConfig(config);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('models')));
  });
});
