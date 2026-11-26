const ora = require('ora');
const log = require('../utils/logger');
const sleep = require('../utils/sleep');
const { build } = require('../services/buildService');

module.exports = (program) => {
  program
    .command('build')
    .description('сборка проекта')
    .option('--config <path>', 'путь к config.json', 'config.json')
    .option('--dry-run', 'ничего не менять')
    .action(async (opts) => {
      const spinner = ora({ text: 'Сборка проекта...', stream: process.stderr }).start();
      const t = Date.now();
      await sleep(800);
      try {
        const r = build({ configPath: opts.config, dryRun: opts.dryRun });
        spinner.succeed(`Сборка завершена за ${((Date.now() - t) / 1000).toFixed(1)}s`);
        log.info(`Результат: ${r.out}`);
      } catch (e) {
        spinner.stop();
        throw e;
      }
    });
};