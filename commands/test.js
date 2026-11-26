const ora = require('ora');
const sleep = require('../utils/sleep');
const { runTests } = require('../services/testService');

module.exports = (program) => {
  program
    .command('test')
    .description('запуск тестов проекта')
    .action(async () => {
      const spinner = ora({ text: 'Запуск тестов...', stream: process.stderr }).start();
      await sleep(800);
      let r;
      try { r = runTests(); } catch (e) { spinner.stop(); throw e; }
      if (r.passed === r.total) {
        spinner.succeed(`Пройдено: ${r.passed}/${r.total} тестов`);
      } else {
        spinner.fail(`Пройдено: ${r.passed}/${r.total} тестов`);
        process.exitCode = 1;
      }
    });
};