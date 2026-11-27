const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class DatabaseConnection extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
  }

  async connect() {
    this.emit('connecting');
    await sleep(300);
    this.connected = true;
    this.emit('connect');
  }

  async query(sql) {
    if (!this.connected) {
      this.error(new Error('Нет соединения с БД'));
      return null;
    }
    await sleep(200);
    const result = /^\s*select/i.test(sql) ? '50 записей' : '1 запись добавлена';
    this.emit('query', sql, result);
    return result;
  }

  async close() {
    this.emit('closing');
    await sleep(200);
    this.connected = false;
    this.emit('close');
  }

  error(err) {
    this.emit('error', err instanceof Error ? err : new Error(String(err)));
  }
}

async function main() {
  const log = (msg) => console.log(`[EVENT] [${GROUP}] ${msg}`);

  console.log(`=== DatabaseConnection (группа ${GROUP}) ===`);
  const db = new DatabaseConnection();

  db.on('connecting', () => log('Подключение к БД...'));
  db.on('connect', () => log('Соединение установлено'));
  db.on('query', (sql, result) => {
    log(`Выполнение запроса: ${sql}`);
    log(`Результат: ${result}`);
  });
  db.on('closing', () => log('Закрытие соединения'));
  db.on('close', () => log('Соединение закрыто'));
  db.on('error', (err) => log(`Ошибка: ${err.message}`));

  await db.connect();
  await db.query('SELECT * FROM students');
  await db.query('INSERT INTO students VALUES (...)');
  await db.close();

  console.log('\n=== Демонстрация ошибки ===');
  db.error(new Error('Connection timeout'));

  console.log('\n=== Ошибка без слушателя error ===');
  const bare = new DatabaseConnection();   // слушателя error нет

  if (process.argv.includes('--crash')) {
    console.log(`[${GROUP}] Запуск с --crash: слушателя error нет, процесс упадёт...`);
    setImmediate(() => bare.error(new Error('Connection timeout')));   // необработанное исключение
  } else {
    try {
      bare.error(new Error('Connection timeout'));
    } catch (e) {
      console.log(`[${GROUP}] Node.js выбросил исключение: ${e.message}`);
      console.log('(без слушателя error процесс упал бы; запустите с --crash, чтобы увидеть падение)');
    }
  }
}

main();