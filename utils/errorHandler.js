const path = require('path');
const log = require('./logger');

function describe(err) {
  if (err.code === 'ENOENT') {
    const file = path.basename(err.path || '');
    return { message: `файл ${file} не найден`, hint: file === 'config.json' ? 'Укажите путь через --config' : undefined };
  }
  return { message: err.message, hint: err.hint };
}

function handleFatal(reason) {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  if (process.env.NODE_ENV === 'development') {
    log.error(`Ошибка: ${err.message}`);
    console.error(String(err.stack).split('\n').slice(1).join('\n'));
  } else {
    const { message, hint } = describe(err);
    log.error(`Ошибка: ${message}`);
    if (hint) console.error(`  ${hint}`);
  }
  process.exit(1);
}

module.exports = { handleFatal };