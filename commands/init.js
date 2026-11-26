const log = require('../utils/logger');
const { createProject } = require('../services/projectService');

module.exports = (program) => {
  program
    .command('init')
    .description('инициализация проекта')
    .requiredOption('--name <name>', 'имя проекта')
    .option('--type <type>', 'тип проекта: web | cli | lib | service', 'cli')
    .option('--git', 'инициализировать Git-репозиторий')
    .action((opts) => {
      createProject({ name: opts.name, type: opts.type, git: opts.git });
      log.success(`Проект "${opts.name}" создан`);
      if (opts.git) log.success('Инициализирован Git-репозиторий');
      log.info('Проект готов к работе!');
    });
};