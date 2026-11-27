const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const {
  GROUP, MAX_BODY, HttpError,
  timestamp, sendJson, sendHtml, sendText, readJson,
} = require('./lib/common');

const HTTP_PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const PUBLIC_DIR = path.join(__dirname, 'public');
const BIG_FILE = path.join(__dirname, 'data', 'big-file.bin');
const PFX_PATH = path.join(__dirname, 'certs', 'server.pfx');
const PFX_PASS = process.env.CERT_PASS || 'lab20pass';
const ACCESS_LOG = path.join(__dirname, 'access.log');
const CACHE_TTL_MS = 60 * 1000;
const TRACE = process.argv.includes('--trace');

// Node не принимает кириллицу в значениях заголовков, поэтому передаём байты UTF-8 как latin1-строку
const GROUP_HEADER = Buffer.from(GROUP, 'utf8').toString('latin1');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};
const mimeFor = (file) => MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

// ---------- метрики и лог ----------
const metrics = { total: 0, byMethod: {}, byStatus: {}, clientErrors: 0, cacheHits: 0, cacheMisses: 0 };
const accessLog = fs.createWriteStream(ACCESS_LOG, { flags: 'a' });

// ---------- данные и in-memory кэш ----------
const items = [{ id: 1, title: 'Первый элемент' }];
let nextItemId = 2;
const cache = new Map();   // url -> { expires, body }

function fail(res, status, extra) {
  sendText(res, status, `${status} ${http.STATUS_CODES[status]}${extra ? `\n${extra}` : ''}\n`);
}

// ---------- middleware-система ----------
const stack = [];
const use = (name, fn) => stack.push({ name, fn });

function handle(req, res) {
  let i = 0;
  const next = (err) => {
    if (err) return errorHandler(err, req, res);
    const layer = stack[i++];
    if (!layer) return fail(res, 404);   // никто не обработал запрос
    if (TRACE) console.log(`[mw] ${req.method} ${req.url} -> ${layer.name}`);
    try {
      const result = layer.fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);   // async middleware
    } catch (e) {
      next(e);
    }
  };
  next();
}

function errorHandler(err, req, res) {
  const status = err instanceof HttpError ? err.status : 500;
  console.error(`[ERROR] [${GROUP}] ${req.method} ${req.url}: ${err.message}`);
  if (res.headersSent) return res.destroy();
  fail(res, status, status === 500 ? undefined : err.message);
}

// 1. Общие заголовки, разбор пути, лог и метрики
use('meta', (req, res, next) => {
  res.setHeader('X-Powered-By', 'Node.js');
  res.setHeader('X-Group', GROUP_HEADER);          // X-Group во всех ответах

  const qi = req.url.indexOf('?');
  req.rawPath = qi === -1 ? req.url : req.url.slice(0, qi);   // путь без нормализации (для защиты от ../)

  res.on('finish', () => {
    metrics.total++;
    metrics.byMethod[req.method] = (metrics.byMethod[req.method] || 0) + 1;
    metrics.byStatus[res.statusCode] = (metrics.byStatus[res.statusCode] || 0) + 1;
    const line = `[${timestamp()}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode}`;
    console.log(line);
    accessLog.write(line + '\n');
  });
  next();
});

// 2. Статические файлы: GET /static/* из public/
use('static', (req, res, next) => {
  if (!req.rawPath.startsWith('/static/')) return next();
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405);

  let rel;
  try {
    rel = decodeURIComponent(req.rawPath.slice('/static/'.length));
  } catch {
    return fail(res, 400);
  }
  if (rel.includes('\0')) return fail(res, 400);

  const filePath = path.resolve(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return fail(res, 403);   // path traversal

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return fail(res, 404);

    const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    res.setHeader('Content-Type', mimeFor(filePath));
    res.setHeader('Cache-Control', 'max-age=60');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', st.mtime.toUTCString());

    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    const notModified = inm
      ? inm.split(',').some((t) => t.trim() === '*' || t.trim().replace(/^W\//, '') === etag)
      : ims && Math.floor(new Date(ims).getTime() / 1000) >= Math.floor(st.mtimeMs / 1000);

    if (notModified) {
      res.statusCode = 304;
      return res.end();
    }

    res.setHeader('Content-Length', st.size);
    if (req.method === 'HEAD') return res.end();

    const stream = fs.createReadStream(filePath);
    stream.on('error', next);
    stream.pipe(res);
  });
});

// 3. Маршруты приложения
use('routes', async (req, res, next) => {
  const p = req.rawPath;
  const readOnly = req.method === 'GET' || req.method === 'HEAD';

  if (p === '/' && readOnly) {
    const secure = Boolean(req.socket.encrypted);
    const tls = secure ? ` (${req.socket.getProtocol()})` : '';
    return sendHtml(res, 200, `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Server</title></head>
<body>
<h1>=== ${secure ? 'HTTPS работает!' : 'HTTP работает'} ===</h1>
<p>Группа: ${GROUP}</p>
<p>Протокол: ${secure ? 'HTTPS' : 'HTTP'}${tls}</p>
</body></html>`);
  }

  if (p === '/metrics' && readOnly) {
    return sendJson(res, 200, {
      group: GROUP,
      total: metrics.total,
      byMethod: metrics.byMethod,
      byStatus: metrics.byStatus,
      clientErrors: metrics.clientErrors,
      cache: { hits: metrics.cacheHits, misses: metrics.cacheMisses, entries: cache.size },
      uptime: Math.floor(process.uptime()),
    });
  }

  // Кэширование: GET кэшируется на 60 с, POST инвалидирует кэш
  if (p === '/api/items') {
    if (readOnly) {
      const hit = cache.get(req.url);
      let body;
      if (hit && hit.expires > Date.now()) {
        metrics.cacheHits++;
        body = hit.body;
        res.setHeader('X-Cache', 'HIT');
      } else {
        metrics.cacheMisses++;
        body = JSON.stringify(items, null, 2);
        cache.set(req.url, { expires: Date.now() + CACHE_TTL_MS, body });
        res.setHeader('X-Cache', 'MISS');
      }
      res.setHeader('Cache-Control', 'max-age=60');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(body);
    }
    if (req.method === 'POST') {
      const data = await readJson(req);
      if (!data || typeof data.title !== 'string' || !data.title.trim()) {
        throw new HttpError(400, 'Поле title обязательно');
      }
      const item = { id: nextItemId++, title: data.title.trim() };
      items.push(item);
      cache.clear();                                    // инвалидация при изменении данных
      res.setHeader('Cache-Control', 'no-store');
      return sendJson(res, 201, item);
    }
    res.setHeader('Allow', 'GET, HEAD, POST');
    return fail(res, 405);
  }

  // Стриминг большого файла с прогрессом
  if (p === '/stream' && readOnly) return streamFile(req, res);

  // Проверка обработки ошибок в middleware
  if (p === '/boom') throw new Error('Тестовая ошибка в middleware');

  next();
});

function streamFile(req, res) {
  fs.stat(BIG_FILE, (err, st) => {
    if (err) return fail(res, 404, 'Создайте файл: node lab20\\make-test-files.js');

    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();

    const stream = fs.createReadStream(BIG_FILE, { highWaterMark: 64 * 1024 });
    let sent = 0;
    let mark = 10;

    stream.on('data', (chunk) => {
      sent += chunk.length;
      const percent = Math.floor((sent / st.size) * 100);
      while (mark <= 100 && percent >= mark) {
        console.log(`[stream] ${mark}% (${mb(sent)} / ${mb(st.size)} МБ)`);
        mark += 10;
      }
    });
    stream.on('error', (e) => {
      console.error(`[ERROR] [${GROUP}] stream: ${e.message}`);
      res.destroy(e);
    });
    res.on('close', () => stream.destroy());   // клиент оборвал загрузку
    stream.pipe(res);
  });
}

// ---------- запуск серверов ----------
const servers = [];

function start(server, label, port) {
  server.on('error', (err) => {
    console.error(`[ERROR] ${label}-сервер: ${err.code === 'EADDRINUSE' ? `порт ${port} занят` : err.message}`);
    process.exit(1);
  });

  // некорректные запросы клиента (мусор вместо HTTP)
  server.on('clientError', (err, socket) => {
    metrics.clientErrors++;
    console.error(`[CLIENT ERROR] [${GROUP}] ${label}: ${err.code || err.message}`);
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    else socket.destroy();
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[INFO] ${label}-сервер запущен на порту ${port}`);
      servers.push(server);
      resolve();
    });
  });
}

function createHttpsServer() {
  try {
    return https.createServer({ pfx: fs.readFileSync(PFX_PATH), passphrase: PFX_PASS }, handle);
  } catch (err) {
    console.warn(`[WARN] HTTPS отключён: ${err.code === 'ENOENT' ? 'не найден lab20/certs/server.pfx' : err.message}`);
    return null;
  }
}

async function main() {
  await start(http.createServer(handle), 'HTTP', HTTP_PORT);
  const httpsServer = createHttpsServer();
  if (httpsServer) await start(httpsServer, 'HTTPS', HTTPS_PORT);
  console.log(`[INFO] Группа: ${GROUP}`);
  if (TRACE) console.log(`[INFO] Режим --trace: порядок middleware: ${stack.map((l) => l.name).join(' -> ')}`);
}

// ---------- корректное завершение по SIGINT ----------
let closing = false;
process.on('SIGINT', () => {
  if (closing) return;
  closing = true;
  console.log('\n[INFO] Получен SIGINT, останавливаем серверы...');

  setTimeout(() => {
    console.error('[WARN] Принудительное завершение');
    process.exit(1);
  }, 5000).unref();

  let pending = servers.length;
  const finish = () => {
    if (--pending > 0) return;
    accessLog.end(() => {
      console.log(`[INFO] Серверы остановлены. Обработано запросов: ${metrics.total}`);
      process.exit(0);
    });
  };
  servers.forEach((s) => {
    s.close(finish);
    if (s.closeIdleConnections) s.closeIdleConnections();
  });
});

main();