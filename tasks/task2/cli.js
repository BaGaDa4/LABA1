const fs = require('fs');
const { Command } = require('commander');

const TYPES = ['html', 'pdf', 'json', 'csv'];
const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version('1.0.0', '-V, --version', 'output the version number')
  .option('-v, --verbose', 'подробный вывод');

program
  .command('generate')
  .description('сгенерировать отчёт')
  .option('-t, --type <type>', 'тип отчёта', 'html')
  .option('-o, --output <path>', 'путь для сохранения')
  .option('-f, --force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((opts) => {
    const verbose = program.opts().verbose;
    const v = (m) => verbose && console.log(`[VERBOSE] ${m}`);

    if (!TYPES.includes(opts.type)) {
      console.error(`Ошибка: недопустимый тип отчёта "${opts.type}".`);
      console.error(`Допустимые значения: ${TYPES.join(', ')}`);
      process.exit(1);
    }
    const output = opts.output ?? `./output.${opts.type}`;

    if (opts.dryRun) {
      console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${opts.type}`);
      console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
      console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
      return;
    }

    v('Запуск генерации отчёта...');
    v(`Тип отчёта: ${opts.type}`);
    v(`Путь сохранения: ${output}`);

    if (fs.existsSync(output) && !opts.force) {
      console.error(`Ошибка: файл ${output} уже существует. Используйте --force`);
      process.exit(1);
    }
    fs.writeFileSync(output, `Отчёт (${opts.type})\n`);
    console.log(`Отчёт успешно сгенерирован: ${output}`);
  });

program
  .command('convert')
  .description('конвертировать файл')
  .requiredOption('-i, --input <path>', 'входной файл')
  .option('--to <format>', 'целевой формат', 'txt')
  .option('-o, --output <path>', 'выходной файл')
  .option('-f, --force', 'перезаписать существующий файл')
  .action((opts) => {
    if (!fs.existsSync(opts.input)) {
      console.error(`Ошибка: файл ${opts.input} не найден`);
      process.exit(1);
    }
    const out = opts.output ?? `${opts.input}.${opts.to}`;
    if (fs.existsSync(out) && !opts.force) {
      console.error(`Ошибка: файл ${out} уже существует. Используйте --force`);
      process.exit(1);
    }
    fs.copyFileSync(opts.input, out);
    console.log(`Файл сконвертирован: ${out}`);
  });

program.parse();