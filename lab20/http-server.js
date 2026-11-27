const http = require('http');
const { GROUP, STUDENT, timestamp, escapeHtml, htmlPage, sendHtml } = require('./lib/common');

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];

  // логируем после отправки ответа: метод, URL, время, статус
  res.on('finish', () => {
    console.log(`[${timestamp()}] ${req.method} ${req.url} ${res.statusCode}`);
  });

  if (req.method === 'GET' && pathname === '/') {
    return sendHtml(res, 200, htmlPage('Лабораторная работа №20', `<h1>=== Лабораторная работа №20 ===</h1>
<p>Группа: ${GROUP}</p>
<p>Метод: ${req.method}</p>
<p>URL: ${escapeHtml(req.url)}</p>`));
  }

  if (req.method === 'GET' && pathname === '/about') {
    return sendHtml(res, 200, htmlPage('О студенте', `<h1>=== О студенте ===</h1>
<p>Группа: ${GROUP}</p>
<p>Студент: ${escapeHtml(STUDENT)}</p>`));
  }

  sendHtml(res, 404, htmlPage('404 Not Found', `<h1>=== 404 Not Found ===</h1>
<p>Путь ${escapeHtml(pathname)} не найден</p>`));
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE'
    ? `Порт ${PORT} занят: остановите другой сервер или задайте другой PORT`
    : err.message);
  process.exit(1);
});

server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));