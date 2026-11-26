const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BIN = path.join(__dirname, '..', '..', 'bin', 'my-cli.js');
const run = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd });

describe('CLI', () => {
  test('--help выводит справку', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage: my-cli/);
  });

  test('--version выводит версию', () => {
    const r = run(['--version']);
    expect(r.stdout.trim()).toBe(require('../../package.json').version);
  });

  test('неизвестная команда возвращает код 1', () => {
    expect(run(['nope']).status).toBe(1);
  });

  test('build без config.json возвращает код 1 и без стектрейса', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-'));
    const r = run(['build'], dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/config\.json не найден/);
    expect(r.stderr).not.toMatch(/at /);
  });

  test('build с --dry-run не создаёт dist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-'));
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log(1)');
    fs.writeFileSync(path.join(dir, 'config.json'), '{"name":"app","entry":"src/index.js"}');
    const r = run(['build', '--dry-run'], dir);
    expect(r.status).toBe(0);
    expect(fs.existsSync(path.join(dir, 'dist'))).toBe(false);
  });
});