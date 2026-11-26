const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { CliError } = require('../utils/errors');

function runTests(cwd = process.cwd()) {
  const dir = path.join(cwd, 'tests');
  if (!fs.existsSync(dir)) throw new CliError('папка tests не найдена', { hint: 'Запустите команду в корне проекта' });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));
  let passed = 0;
  for (const f of files) {
    if (spawnSync('node', [path.join(dir, f)]).status === 0) passed++;
  }
  return { total: files.length, passed };
}

module.exports = { runTests };