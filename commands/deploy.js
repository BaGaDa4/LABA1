const ora = require('ora');
const inquirer = require('inquirer');
const log = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { readConfig } = require('../services/buildService');
const { deploy } = require('../services/deployService');

module.exports = (program) => {
  program
    .command('deploy')
    .description('развёртывание проекта')
    .option('--env <env>', 'окружение', 'staging')
    .option('--force', 'не спрашивать подтверждение')
    .action(async (opts) => {
      const cfg = readConfig();
      if (opts.env === 'production' && !opts.force) {
        log.warn('Вы собираетесь развернуть проект в production!');
        if (!process.stdin.isTTY) throw new CliError('в неинтерактивном режиме используйте --force');
        const { ok } = await inquirer.prompt([
          { type: 'confirm', name: 'ok', message: 'Продолжить?', default: false },
        ]);
        if (!ok) { log.info('Отменено'); process.exitCode = 1; return; }
      }
      const spinner = ora({ text: 'Развёртывание...', stream: process.stderr }).start();
      const { url } = await deploy({ name: cfg.name, env: opts.env });
      spinner.succeed('Развёрнуто успешно');
      console.log(`URL: ${url}`);
    });
};