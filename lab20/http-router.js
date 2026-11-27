const http = require('http');
const { GROUP, HttpError, timestamp, sendJson, sendText, readJson } = require('./lib/common');

const PORT = Number(process.env.PORT) || 3000;

// ---------- данные ----------
const students = [
  { id: 1, name: 'Иван', group: GROUP },
  { id: 2, name: 'Мария', group: 'ББМО-02-23' },
];
let nextId = 3;

const findStudent = (id) => students.find((s) => s.id === Number(id));

// ---------- таблица маршрутов { method, pattern, handler } ----------
const routes = [];

function compile(pattern) {
  const keys = [];
  const source = pattern.replace(/\/:([A-Za-z_]\w*)/g, (_, key) => {
    keys.push(key);
    return '/([^/]+)';
  });
  return { regex: new RegExp(`^${source}$`), keys };
}

function route(method, pattern, handler) {
  routes.push({ method, pattern, ...compile(pattern), handler });
}

route('GET', '/', (req, res) =>
  sendJson(res, 200, { group: GROUP, routes: routes.map((r) => `${r.method} ${r.pattern}`) }));

// параметры пути
route('GET', '/users/:id', (req, res, { params }) => sendJson(res, 200, params));
route('GET', '/users/:userId/posts/:postId', (req, res, { params }) => sendJson(res, 200, params));

// query-параметры со значениями по умолчанию
route('GET', '/search', (req, res, { query }) => {
  const q = query.get('q') ?? '';
  const parsed = Number.parseInt(query.get('limit') ?? '', 10);
  const limit = Number.isNaN(parsed) || parsed < 1 ? 10 : parsed;
  sendJson(res, 200, { q, limit });
});

// REST API студентов
route('GET', '/api/students', (req, res, { query }) => {
  const group = query.get('group');
  sendJson(res, 200, group ? students.filter((s) => s.group === group) : students);
});

route('GET', '/api/students/:id', (req, res, { params }) => {
  const student = findStudent(params.id);
  if (!student) throw new HttpError(404, 'Студент не найден');
  sendJson(res, 200, student);
});

route('POST', '/api/students', async (req, res) => {
  const data = await readJson(req);
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new HttpError(400, 'Поле name обязательно');
  }
  const student = {
    id: nextId++,
    name: data.name.trim(),
    group: typeof data.group === 'string' && data.group ? data.group : GROUP,
  };
  students.push(student);
  sendJson(res, 201, student);
});

route('PUT', '/api/students/:id', async (req, res, { params }) => {
  const student = findStudent(params.id);
  if (!student) throw new HttpError(404, 'Студент не найден');
  const data = await readJson(req);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'Ожидается JSON-объект');
  }
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) throw new HttpError(400, 'Некорректное поле name');
    student.name = data.name.trim();
  }
  if (data.group !== undefined) {
    if (typeof data.group !== 'string' || !data.group) throw new HttpError(400, 'Некорректное поле group');
    student.group = data.group;
  }
  sendJson(res, 200, student);
});

route('DELETE', '/api/students/:id', (req, res, { params }) => {
  const index = students.findIndex((s) => s.id === Number(params.id));
  if (index === -1) throw new HttpError(404, 'Студент не найден');
  students.splice(index, 1);
  sendJson(res, 200, { deleted: true, id: Number(params.id) });
});

// ---------- диспетчер ----------
async function dispatch(req, res) {
  const url = new URL(req.url, 'http://localhost');                      // разбор URL
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

  const allowed = new Set();
  for (const r of routes) {
    const match = r.regex.exec(pathname);
    if (!match) continue;
    allowed.add(r.method);
    if (r.method !== req.method) continue;

    const params = {};
    r.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });
    return r.handler(req, res, { params, query: url.searchParams });
  }

  if (allowed.size > 0) {                                                // путь есть, метод не поддерживается
    res.setHeader('Allow', [...allowed].join(', '));
    throw new HttpError(405);
  }
  throw new HttpError(404);
}

const server = http.createServer((req, res) => {
  res.on('finish', () => {
    console.log(`[${timestamp()}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode}`);
  });

  dispatch(req, res).catch((err) => {
    if (res.headersSent) return res.destroy();
    if (err instanceof URIError) return sendText(res, 400, '400 Bad Request\n');
    if (err instanceof HttpError) {
      return err.status === 404 || err.status === 405
        ? sendText(res, err.status, `${err.status} ${err.message}\n`)
        : sendJson(res, err.status, { error: err.message });
    }
    console.error(err);
    sendText(res, 500, '500 Internal Server Error\n');
  });
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Порт ${PORT} занят` : err.message);
  process.exit(1);
});

server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));