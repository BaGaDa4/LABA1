const fs = require('fs');
const path = require('path');
const { CliError } = require('../utils/errors');

function parseConfig(text) {
  let cfg;
  try { cfg = JSON.parse(text); }
  catch { throw new CliError('config.json содержит некорректный JSON'); }
  if (!cfg.name || !cfg.entry) throw new CliError('в config.json должны быть поля name и entry');
  return cfg;
}

function outputPath(cfg) {
  return path.join('dist', `${cfg.name}.js`);
}

function readConfig(cwd = process.cwd(), configPath = 'config.json') {
  return parseConfig(fs.readFileSync(path.resolve(cwd, configPath), 'utf8'));
}

function build({ cwd = process.cwd(), configPath = 'config.json', dryRun = false } = {}) {
  const cfg = readConfig(cwd, configPath);
  const out = outputPath(cfg);
  if (!dryRun) {
    fs.mkdirSync(path.resolve(cwd, 'dist'), { recursive: true });
    fs.copyFileSync(path.resolve(cwd, cfg.entry), path.resolve(cwd, out));
  }
  return { out, dryRun };
}

module.exports = { parseConfig, outputPath, readConfig, build };