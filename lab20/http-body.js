const http = require('http');
const {
  GROUP, MAX_BODY, HttpError,
  timestamp, sendJson, sendText, readBody, parseJson,
} = require('./lib/common');

const PORT = Number(process.env.PORT) || 3000;

async function handle(req, res) {
  const pathname = req.url.split('?')[0];

  if (pathname !== '/echo' && pathname !== '/form') throw new HttpError(404);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    throw new HttpError(405);
  }

  const contentType = req.headers['content-type'] || 'application/octet-stream';
  const mime = contentType.split(';')[0].trim().toLowerCase();

  // POST /echo: принимает любое тело и возвращает его обратно
  if (pathname === '/echo') {
    const body = await readBody(req);

    if (mime === 'application/json') {
      let data = parseJson(body);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = { ...data, group: GROUP };       // эхо-сервер для группы
      }
      return sendJson(res, 200, data);
    }

    // text/plain, form-urlencoded, octet-stream и прочее: как есть, с тем же Content-Type
    res.writeHead(200, { 'Content-Type': contentType });
    return res.end(body);
  }

  // POST /form: парсинг application/x-www-form-urlencoded
  if (mime !== 'application/x-www-form-urlencoded') {
    throw new HttpError(415, 'Нужен Content-Type: application/x-www-form-urlencoded');
  }
  const body = await readBody(req);
  const data = Object.fromEntries(new URLSearchParams(body.toString('utf8')));
  sendJson(res, 200, data);
}

const server = http.createServer((req, res) => {
  res.on('finish', () => {
    const size = req.bodySize !== undefined ? ` (тело: ${req.bodySize} байт)` : '';
    console.log(`[${timestamp()}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode}${size}`);
  });

  handle(req, res).catch((err) => {
    if (res.headersSent) return res.destroy();
    if (err instanceof HttpError) return sendText(res, err.status, `${err.status} ${err.message}\n`);
    console.error(err);
    sendText(res, 500, '500 Internal Server Error\n');
  });
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Порт ${PORT} занят` : err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT} (лимит тела: ${MAX_BODY / 1024 / 1024} МБ)`);
});