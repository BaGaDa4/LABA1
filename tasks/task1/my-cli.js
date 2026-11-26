#!/usr/bin/env node
const [cmd, ...rest] = process.argv.slice(2);

function help() {
  console.log(`Использование: my-cli <команда> [аргументы]
Доступные команды:
  greet <имя>    - поприветствовать пользователя
  info           - вывести информацию о группе`);
}

if (!cmd || cmd === '--help') {
  help();
  process.exit(0);
}

if (cmd === 'greet') {
  if (!rest[0]) {
    console.error('Ошибка: укажите имя. Пример: my-cli greet "EGOR"');
    process.exit(1);
  }
  console.log(`Привет, ${rest[0]}! Добро пожаловать в CLI-приложение группы ББМО-01-23.`);
  process.exit(0);
}

if (cmd === 'info') {
  console.log('Группа: ББМО-01-23');
  console.log('Студент: BAGADAAAAAAAAA4');
  console.log('Лабораторная работа: №17');
  console.log(`Дата: ${new Date().toISOString().slice(0, 10)}`);
  process.exit(0);
}

console.error(`Ошибка: неизвестная команда "${cmd}"`);
console.error('Для справки используйте: my-cli --help');
process.exit(1);