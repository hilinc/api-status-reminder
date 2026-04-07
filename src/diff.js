const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '..', 'data', 'last-status.json');

function loadLastStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStatus(status) {
  fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function diff(oldData, newData) {
  const changes = [];
  const source = newData.source;

  const oldModels = {};
  if (oldData[source]?.models) {
    for (const m of oldData[source].models) {
      oldModels[m.id] = m;
    }
  }

  for (const m of newData.models) {
    const old = oldModels[m.id];
    if (!old) {
      changes.push({ name: m.name, from: 'new', to: m.status, ping_ms: m.ping_ms });
    } else if (old.status !== m.status) {
      changes.push({ name: m.name, from: old.status, to: m.status, ping_ms: m.ping_ms });
    }
  }

  return changes;
}

module.exports = { loadLastStatus, saveStatus, diff };
