const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// ---------- Middleware 1: обработка ошибок (регистрируем ПЕРВЫМ, чтобы ловить ошибки из всех остальных) ----------
app.use(async (ctx, next) => {
    try {
        await next(); // передаём управление дальше по цепочке middleware
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = {
            error: err.message || 'Внутренняя ошибка сервера',
            status: ctx.status
        };
        console.error(`❌ Ошибка: ${err.message}`);
    }
});

// ---------- Middleware 2: логирование ----------
app.use(async (ctx, next) => {
    const start = Date.now();
    await next(); // ждём, пока запрос дойдёт до конца цепочки и обработается
    const ms = Date.now() - start;
    const time = formatDate(new Date());
    console.log(`[${time}] ${ctx.method} ${ctx.path} - ${ms}ms`);
});

// ---------- Middleware 3: авторизация (проверяем только для /protected) ----------
app.use(async (ctx, next) => {
    if (ctx.path === '/protected') {
        const authHeader = ctx.headers['authorization'];
        if (!authHeader) {
            ctx.status = 401;
            ctx.body = { error: 'Требуется авторизация', status: 401 };
            return; // не вызываем next() — запрос дальше не пойдёт
        }
    }
    await next();
});

app.use(bodyParser());

// ---------- Маршрут для тестирования авторизации ----------
router.get('/protected', (ctx) => {
    ctx.body = { message: 'Добро пожаловать в защищённую зону!' };
});

// ---------- Маршрут для тестирования обработчика ошибок ----------
router.get('/error', (ctx) => {
    throw new Error('Тестовая ошибка сервера'); // будет поймана Middleware 1
});

// ---------- Главная страница ----------
router.get('/', (ctx) => {
    const now = formatDate(new Date());
    ctx.type = 'html';
    ctx.body = `
        <html><head><meta charset="UTF-8"><title>Лабораторная работа №15</title>
        <style>body{font-family:Arial;background:#f4f4f4;padding:40px}.card{background:white;padding:30px;border-radius:10px;max-width:500px;margin:auto}</style>
        </head><body><div class="card">
            <h1>Лабораторная работа №15</h1>
            <p><strong>Группа:</strong> ББМО-01-23</p>
            <p><strong>Дата и время:</strong> ${now}</p>
            <p>Добро пожаловать!</p>
        </div></body></html>
    `;
});

// ---------- API пользователей (Задание 2) ----------
let users = [
    { id: 1, name: 'Иванов Иван', group: 'ББМО-01-23' },
    { id: 2, name: 'Петрова Мария', group: 'ББМО-01-23' }
];
let nextId = 3;

router.get('/api/users', (ctx) => {
    ctx.body = users;
});

router.post('/api/users', (ctx) => {
    const { name, group } = ctx.request.body;
    if (!name || !group) {
        ctx.status = 400;
        ctx.body = { error: 'Поля name и group обязательны', status: 400 };
        return;
    }
    const newUser = { id: nextId++, name, group };
    users.push(newUser);
    ctx.status = 201;
    ctx.body = newUser;
});

router.put('/api/users/:id', (ctx) => {
    const id = Number(ctx.params.id);
    const user = users.find(u => u.id === id);
    if (!user) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден', status: 404 };
        return;
    }
    const { name, group } = ctx.request.body;
    if (name) user.name = name;
    if (group) user.group = group;
    ctx.body = user;
});

router.delete('/api/users/:id', (ctx) => {
    const id = Number(ctx.params.id);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден', status: 404 };
        return;
    }
    users.splice(index, 1);
    ctx.body = { message: 'Пользователь успешно удалён' };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => {
    console.log('Сервер запущен на порту 3000: http://localhost:3000');
});