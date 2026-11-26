const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CliError } = require('../utils/errors');

const TYPES = ['web', 'cli', 'lib', 'service'];

function validateName(name) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name || '')) {
    throw new CliError(`недопустимое имя проекта "${name}"`, { hint: 'Используйте буквы, цифры, - и _' });
  }
}
function validateType(type) {
  if (!TYPES.includes(type)) {
    throw new CliError(`неизвестный тип "${type}"`, { hint: `Допустимо: ${TYPES.join(', ')}` });
  }
}

function createProject({ name, type, git = false, baseDir = process.cwd() }) {
  validateName(name);
  validateType(type);
  const dir = path.join(baseDir, name);
  if (fs.existsSync(dir)) throw new CliError(`папка "${name}" уже существует`);

  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tests'));
  fs.writeFileSync(path.join(dir, 'config.json'),
    JSON.stringify({ name, type, entry: 'src/index.js' }, null, 2));
  fs.writeFileSync(path.join(dir, 'src', 'index.js'), `console.log('Hello from ${name}');\n`);
  fs.writeFileSync(path.join(dir, 'tests', 'sample.test.js'),
    "const assert = require('assert');\nassert.strictEqual(1 + 1, 2);\n");
  if (git) execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

module.exports = { createProject, validateName, validateType, TYPES };