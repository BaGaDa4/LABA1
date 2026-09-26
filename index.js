const express = require('express');
const compression = require('compression');
const app = express();
const PORT = 3000;

function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function renderPage(title, content) {
    return `
        <html><head><meta charset="UTF-8"><title>${title}</title>
        <style>body{font-family:Arial;background:#f4f4f4;padding:40px}.card{background:white;padding:30px;border-radius:10px;max-width:600px;margin:auto}</style>
        </head><body><div class="card">${content}</div></body></html>
    `;
}

// ---------- Middleware 1: логирование (регистрируем первым, чтобы засечь ВЕСЬ запрос) ----------
app.use((req, res, next) => {
    const start = Date.now();

    // 'finish' — событие, которое срабатывает, когда Express реально отправил ответ клиенту
    res.on('finish', () => {
        const ms = Date.now() - start;
        const time = formatDate(new Date());
        console.log(`[${time}] ${req.method} ${req.path} ${res.statusCode} - ${ms}ms`);
    });

    next(); // передаём управление дальше
});

// ---------- Middleware 2: сжатие ответов (gzip/deflate) ----------
app.use(compression());

// ---------- Middleware 3: ограничение скорости запросов (простая реализация без библиотек) ----------
const requestCounts = new Map(); // ключ — IP, значение — { count, resetTime }
const RATE_LIMIT = 100; // максимум запросов
const RATE_WINDOW_MS = 60 * 1000; // за 1 минуту

app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
        next();
        return;
    }

    const record = requestCounts.get(ip);

    // Если окно времени истекло — сбрасываем счётчик
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_WINDOW_MS;
        next();
        return;
    }

    record.count++;

    // Информация о лимите в заголовках ответа
    res.set('X-RateLimit-Limit', RATE_LIMIT);
    res.set('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - record.count));

    if (record.count > RATE_LIMIT) {
        res.status(429).json({ error: 'Слишком много запросов, попробуйте позже', status: 429 });
        return;
    }

    next();
});

app.use(express.json());

// ---------- Главная страница ----------
app.get('/', (req, res) => {
    const now = formatDate(new Date());
    const content = `
        <h1>Лабораторная работа №16</h1>
        <p><strong>Группа:</strong> ББМО-01-23</p>
        <p><strong>Дата и время:</strong> ${now}</p>
        <p>Добро пожаловать!</p>
    `;
    res.send(renderPage('Лабораторная работа №16', content));
});

app.get('/about', (req, res) => {
    res.send(renderPage('О разработчике', '<h1>О разработчике</h1><p>Гринкевич Егор Русланович, ББМО-01-23</p><p><a href="/">← На главную</a></p>'));
});

app.get('/contacts', (req, res) => {
    res.send(renderPage('Контакты', '<h1>Контакты</h1><p>Email: student@example.com</p><p><a href="/">← На главную</a></p>'));
});

// ---------- Тестовые маршруты для проверки обработчика ошибок ----------
app.get('/error', (req, res) => {
    throw new Error('Тестовая синхронная ошибка сервера');
});

app.get('/async-error', async (req, res, next) => {
    try {
        await Promise.reject(new Error('Тестовая асинхронная ошибка сервера'));
    } catch (err) {
        next(err); // в Express асинхронные ошибки нужно передавать в next() вручную
    }
});

// ---------- API книг (Задание 2) ----------
let books = [
    { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
    { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 }
];
let nextId = 3;

app.get('/api/books/search', (req, res) => {
    const { author } = req.query;
    if (!author) {
        res.status(400).json({ error: 'Параметр author обязателен', status: 400 });
        return;
    }
    const found = books.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
    res.json(found);
});

app.get('/api/books', (req, res) => {
    res.json(books);
});

app.get('/api/books/:id', (req, res) => {
    const id = Number(req.params.id);
    const book = books.find(b => b.id === id);
    if (!book) {
        res.status(404).json({ error: 'Книга не найдена', status: 404 });
        return;
    }
    res.json(book);
});

app.post('/api/books', (req, res) => {
    const { title, author, year } = req.body;
    if (!title || !author || !year) {
        res.status(400).json({ error: 'Поля title, author и year обязательны', status: 400 });
        return;
    }
    const newBook = { id: nextId++, title, author, year };
    books.push(newBook);
    res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
    const id = Number(req.params.id);
    const book = books.find(b => b.id === id);
    if (!book) {
        res.status(404).json({ error: 'Книга не найдена', status: 404 });
        return;
    }
    const { title, author, year } = req.body;
    if (title) book.title = title;
    if (author) book.author = author;
    if (year) book.year = year;
    res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
    const id = Number(req.params.id);
    const index = books.findIndex(b => b.id === id);
    if (index === -1) {
        res.status(404).json({ error: 'Книга не найдена', status: 404 });
        return;
    }
    books.splice(index, 1);
    res.json({ message: 'Книга успешно удалена' });
});

// ---------- Middleware обработки ошибок (ОБЯЗАТЕЛЬНО последним, с 4 параметрами!) ----------
app.use((err, req, res, next) => {
    console.error(`❌ Ошибка: ${err.message}`);
    res.status(err.status || 500).json({
        error: err.message || 'Внутренняя ошибка сервера',
        status: err.status || 500
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}: http://localhost:${PORT}`);
});