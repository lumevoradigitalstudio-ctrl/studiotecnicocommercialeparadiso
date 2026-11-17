'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadConfig(file) {
  const target = file || process.env.CONFIG_FILE || path.join(ROOT, 'config.json');
  const source = fs.existsSync(target) ? target : path.join(ROOT, 'config.example.json');
  const cfg = JSON.parse(fs.readFileSync(source, 'utf8'));
  cfg._source = source;
  return cfg;
}

module.exports = { loadConfig, ROOT };
