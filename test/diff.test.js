import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diff } from '../src/diff.js';

describe('diff', () => {
  it('detects new models', () => {
    const oldData = {};
    const newData = {
      source: 'api-probe',
      models: [
        { id: 'site-a', name: 'Site A', status: 'up', ping_ms: 100 },
      ],
    };
    const changes = diff(oldData, newData);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].from, 'new');
    assert.equal(changes[0].to, 'up');
    assert.equal(changes[0].name, 'Site A');
  });

  it('detects status changes', () => {
    const oldData = {
      'api-probe': {
        models: [{ id: 'site-a', name: 'Site A', status: 'up', ping_ms: 100 }],
      },
    };
    const newData = {
      source: 'api-probe',
      models: [{ id: 'site-a', name: 'Site A', status: 'down', ping_ms: 0 }],
    };
    const changes = diff(oldData, newData);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].from, 'up');
    assert.equal(changes[0].to, 'down');
  });

  it('detects removed models', () => {
    const oldData = {
      'api-probe': {
        models: [
          { id: 'site-a', name: 'Site A', status: 'up', ping_ms: 100 },
          { id: 'site-b', name: 'Site B', status: 'up', ping_ms: 200 },
        ],
      },
    };
    const newData = {
      source: 'api-probe',
      models: [{ id: 'site-a', name: 'Site A', status: 'up', ping_ms: 100 }],
    };
    const changes = diff(oldData, newData);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].name, 'Site B');
    assert.equal(changes[0].to, 'removed');
  });

  it('returns empty array when nothing changed', () => {
    const oldData = {
      'api-probe': {
        models: [{ id: 'site-a', name: 'Site A', status: 'up', ping_ms: 100 }],
      },
    };
    const newData = {
      source: 'api-probe',
      models: [{ id: 'site-a', name: 'Site A', status: 'up', ping_ms: 150 }],
    };
    const changes = diff(oldData, newData);
    assert.equal(changes.length, 0);
  });
});
