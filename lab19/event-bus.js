const http = require('http');
const os = require('os');
const EventBus = require('./lib/EventBus');

const GROUP = 'ББМО-01-23';
const PORT = Number(process.env.PORT) || 3000;
const bus = new EventBus({ group: GROUP });

const section = (title) => console.log(`\n--- ${title} ---`);
const tick = () => new Promise((r) => setImmediate(r));

async function demo() {
  console.log(`=== EventBus (группа ${GROUP}) ===`);

  // ---- Приоритеты ----
  section('Приоритеты');
  bus.on('prio', () => console.log('[priority 0]  Низкий приоритет'));            // по умолчанию 0
  bus.on('prio', () => console.log('[priority 10] Высокий приоритет'), 10);
  bus.on('prio', () => console.log('[priority 5]  Средний приоритет'), 5);
  bus.emit('prio');

  // ---- Wildcard ----
  section('Wildcard');
  const anyLogger = (event, ...args) =>
    console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
  bus.onAny(anyLogger);
  bus.on('greet', () => {});
  bus.emit('greet', 'Иван');
  bus.emit('info', GROUP);
  bus.offAny(anyLogger);

  // ---- Once-кэш ----
  section('Once-кэш');
  let onceCalls = 0;
  bus.on('tick', (n) => console.log(`[tick] Вызов ${n}`));
  bus.once('tick', () => { onceCalls++; });
  for (let i = 1; i <= 3; i++) bus.emit('tick', i);
  console.log(`once-слушатель вызван: ${onceCalls} раз`);

  // ---- Обработка ошибок ----
  section('Обработка ошибок');
  bus.on('error', (err, event) =>
    console.error(`[ERROR] [${GROUP}] Ошибка в слушателе "${event}": ${err.message}`), 100);
  bus.on('test', () => { throw new Error('синхронная ошибка'); });
  bus.on('test', async () => { throw new Error('асинхронная ошибка'); });
  bus.on('test', () => console.log('[test] третий слушатель отработал, несмотря на ошибки'));
  bus.emit('test');
  await tick();   // дождаться асинхронной ошибки

  // ---- Метрики ----
  section('Метрики');
  const m = bus.getMetrics();
  for (const [event, count] of Object.entries(m.events)) {
    const errs = m.errors[event];
    console.log(`${event}:\t${count} вызов(ов)${errs ? ` (${errs} ошибки)` : ''}`);
  }
  console.log(`Всего событий: ${m.total}`);
  console.log(`Последний вызов: ${m.lastEventAt}`);

  // ---- Интеграция с os ----
  section('Интеграция с os');
  bus.on('os:stats', (s) =>
    console.log(`[os:stats] ядер: ${s.cpus}, свободно RAM: ${s.freeGb} ГБ, uptime: ${s.uptimeMin} мин`));
  const publishStats = () => bus.emit('os:stats', {
    cpus: os.cpus().length,
    freeGb: (os.freemem() / 1024 ** 3).toFixed(2),
    uptimeMin: Math.floor(os.uptime() / 60),
  });
  publishStats();
  setInterval(publishStats, 10000);   // мониторинг системы каждые 10 с
}

// ---- Интеграция с http ----
function startServer() {
  bus.on('request', (method, url) => console.log(`[request] ${method} ${url}`));

  const server = http.createServer((req, res) => {
    bus.emit('request', req.method, req.url);   // каждый запрос = событие
    if (req.method === 'GET' && req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(bus.getMetrics(), null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.on('error', (err) => {
    console.error(`Не удалось запустить сервер: ${err.message}`);
    process.exit(1);
  });

  server.listen(PORT, () => {
    section('Интеграция с http');
    console.log(`HTTP-сервер: http://localhost:${PORT}/metrics (Ctrl+C для выхода)`);
  });

  process.on('SIGINT', () => {
    console.log(`\n[${GROUP}] Остановка сервера. Всего событий: ${bus.getMetrics().total}`);
    server.close();
    process.exit(0);
  });
}

demo().then(startServer);