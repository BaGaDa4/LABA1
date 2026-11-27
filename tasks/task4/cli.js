const fs = require('fs');
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');

const TTY = Boolean(process.stdout.isTTY);
const c = new chalk.Instance({ level: TTY ? 1 : 0 });
let quiet = !TTY;

const log = {
  ok:   (m) => !quiet && console.error(c.green('✔ ' + m)),
  info: (m) => !quiet && console.error(c.blue('ℹ ' + m)),
  warn: (m) => console.error(c.yellow('⚠ ' + m)),
  err:  (m) => console.error(c.red('✖ ' + m)),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function expand(patterns) {
  const out = [];
  for (const p of patterns) {
    if (p.includes('*')) {
      const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      out.push(...fs.readdirSync('.').filter((f) => re.test(f)));
    } else out.push(p);
  }
  return out;
}

const program = new Command().name('my-cli').version('1.0.0');

program
  .command('process')
  .description('обработать файлы')
  .requiredOption('--files <files...>', 'список файлов')
  .option('-o, --output <path>', 'сохранить результат в файл (иначе — в stdout)')
  .option('-q, --quiet', 'выводить только предупреждения и ошибки')
  .action(async (opts) => {
    quiet = quiet || Boolean(opts.quiet);
    const files = expand(opts.files);

    const spinner = quiet ? null : ora({ text: 'Поиск файлов...', stream: process.stderr }).start();
    await sleep(1200);
    spinner && spinner.succeed(`Файлы найдены (${files.length} шт.)`);

    const bar = !quiet && files.length > 3
      ? new cliProgress.SingleBar({
          format: '[{bar}] {percentage}% | {value}/{total} | ETA: {eta_formatted}',
          barCompleteChar: '█', barIncompleteChar: '░',
          stream: process.stderr, hideCursor: true,
        }, cliProgress.Presets.shades_classic)
      : null;
    bar && bar.start(files.length, 0);

    const results = [];
    const problems = [];
    for (const f of files) {
      await sleep(300);
      if (!fs.existsSync(f)) {
        problems.push(f);
        if (!bar) log.err(`Файл ${f} не найден`);
      } else {
        const text = fs.readFileSync(f, 'utf8');
        results.push({ file: f, lines: text.split(/\r?\n/).length, bytes: Buffer.byteLength(text) });
        if (!bar) log.ok(`Файл ${f} обработан`);
      }
      bar && bar.increment();
    }
    if (bar) {
      bar.stop();
      problems.forEach((f) => log.err(`Файл ${f} не найден`));
    }
    log.ok('Обработка завершена');

    const json = JSON.stringify({ processed: results.length, files: results }, null, 2);
    if (opts.output) {
      fs.writeFileSync(opts.output, json);
      log.ok(`Результат сохранён: ${opts.output}`);
    } else {
      console.log(json);
    }

    if (problems.length) {
      log.warn(`Пропущено ${problems.length} файл(ов)`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);