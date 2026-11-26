const { Command } = require('commander');
const inquirer = require('inquirer');

const TYPES = { web: 'Web-приложение', cli: 'CLI-утилита', lib: 'Библиотека', service: 'Микросервис' };
const LABELS = { typescript: 'TypeScript', eslint: 'ESLint', prettier: 'Prettier', jest: 'Jest' };

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

function fail(msg) {
  console.error(`Ошибка: ${msg}`);
  process.exit(1);
}

const program = new Command().name('my-cli').version('1.0.0');

program
  .command('init')
  .description('инициализация проекта')
  .option('--name <name>', 'название проекта')
  .option('--type <type>', 'web | cli | lib | service')
  .option('--typescript').option('--eslint').option('--prettier').option('--jest')
  .option('--git', 'использовать Git')
  .option('--no-interactive', 'отключить вопросы (для CI/CD)')
  .action(async (opts) => {
    const piped = !process.stdin.isTTY;
    const interactive = opts.interactive && !piped;

    if (piped && !opts.name) {
      const s = (await readStdin()).replace(/^["']|["']$/g, '');
      if (s) opts.name = s;
    }

    const missing = [];
    if (!opts.name) missing.push('--name');
    if (!opts.type) missing.push('--type');

    let answers = {};
    if (missing.length) {
      if (!interactive) {
        fail(missing.length === 2
          ? 'в неинтерактивном режиме необходимо указать --name и --type'
          : `недостаточно данных. Укажите ${missing[0]}`);
      }
      answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Введите название проекта:',
          when: !opts.name, validate: (v) => (v.trim() ? true : 'Название не может быть пустым') },
        { type: 'list', name: 'type', message: 'Выберите тип проекта:', when: !opts.type,
          choices: Object.entries(TYPES).map(([value, name]) => ({ name, value })) },
        { type: 'checkbox', name: 'options', message: 'Выберите дополнительные опции:',
          choices: Object.entries(LABELS).map(([value, name]) => ({ name, value })) },
        { type: 'confirm', name: 'git', message: 'Использовать Git?', default: true },
        { type: 'password', name: 'token', message: 'Введите токен доступа:', mask: '*' },
      ]);
    }

    const name = opts.name ?? answers.name;
    const type = opts.type ?? answers.type;
    if (!TYPES[type]) fail(`неизвестный тип "${type}". Допустимо: ${Object.keys(TYPES).join(', ')}`);

    const selected = answers.options ?? Object.keys(LABELS).filter((k) => opts[k]);
    const git = answers.git ?? Boolean(opts.git);

    console.log(`✓ Проект "${name}" успешно инициализирован!`);
    console.log(`Тип: ${TYPES[type]}`);
    console.log(`Опции: ${selected.map((k) => LABELS[k]).join(', ') || 'нет'}`);
    console.log(`Git: ${git ? 'да' : 'нет'}`);
  });

program.parseAsync(process.argv);