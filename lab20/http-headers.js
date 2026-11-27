const http = require('http');
const { GROUP, timestamp, escapeHtml, htmlPage, sendHtml, sendJson } = require('./lib/common');

const PORT = Number(process.env.PORT) || 3000;

// Node не принимает символы вне Latin-1 в значениях заголовков (ERR_INVALID_CHAR).
// Поэтому байты UTF-8 передаём как latin1-строку: по сети уйдёт обычный UTF-8.
const GROUP_HEADER = Buffer.from(GROUP, 'utf8').toString('latin1');

const KNOWN = ['/headers', '/headers/set', '/headers/check'];

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  res.on('finish', () => console.log(`[${timestamp()}] ${req.method} ${req.url} ${res.statusCode}`));

  // заголовки ответа для всех запросов
  res.setHeader('X-Powered-By', 'Node.js');
  res.setHeader('X-Group', GROUP_HEADER);
  res.setHeader('Cache-Control', 'no-cache');

  if (!KNOWN.includes(pathname)) return sendJson(res, 404, { error: 'Not Found' });
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // GET /headers: все заголовки запроса (ключи уже в нижнем регистре)
  if (pathname === '/headers') {
    return sendJson(res, 200, {
      headers: req.headers,
      special: {
        userAgent: req.headers['user-agent'] ?? null,
        accept: req.headers.accept ?? null,
        host: req.headers.host ?? null,
        contentType: req.headers['content-type'] ?? null,
      },
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion,
    });
  }

  // GET /headers/set: setHeader / getHeader / hasHeader / removeHeader
  if (pathname === '/headers/set') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.setHeader('X-Temp', 'temporary');
    const value = res.getHeader('X-Temp');
    const hasBefore = res.hasHeader('X-Temp');
    res.removeHeader('X-Temp');                 // удаляем до отправки
    const hasAfter = res.hasHeader('X-Temp');

    return sendHtml(res, 200, htmlPage('Заголовки ответа', `<h1>Установленные заголовки ответа</h1>
<p>Группа: ${GROUP}</p>
<ul>
  <li>setHeader("X-Temp") / getHeader: ${escapeHtml(value)}</li>
  <li>hasHeader("X-Temp") до removeHeader: ${hasBefore}</li>
  <li>hasHeader("X-Temp") после removeHeader: ${hasAfter}</li>
  <li>Итоговые заголовки: ${escapeHtml(Object.keys(res.getHeaders()).join(', '))}</li>
</ul>`));
  }

  // GET /headers/check: проверка наличия заголовков в ответе
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  sendJson(res, 200, {
    hasContentType: res.hasHeader('Content-Type'),
    hasXGroup: res.hasHeader('X-Group'),
    hasUnknown: res.hasHeader('X-Unknown'),
  });
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Порт ${PORT} занят` : err.message);
  process.exit(1);
});

server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));