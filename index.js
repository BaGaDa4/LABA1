const http = require('http');
const EventEmitter = require('events');
const logger = require('./logger');

class AppServer extends EventEmitter {
    constructor() {
        super();
        this.server = null;
    }

    start(port) {
        this.server = http.createServer((req, res) => {
            this.emit('request:received', { url: req.url, method: req.method });
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Hello from Event-Driven Server!');
        });

        this.server.listen(port, () => {
            this.emit('server:started', { port });
        });
    }

    stop() {
        this.server.close(() => {
            this.emit('server:stopped');
        });
    }
}


const app = new AppServer();

app.on('server:started', (data) => {
    console.log(`🟢 Сервер запущен на порту ${data.port}`);
});

app.on('request:received', (data) => {
    console.log(`🔵 Получен запрос: ${data.method} ${data.url}`);
});

app.on('server:stopped', () => {
    console.log('🔴 Сервер остановлен');
});


logger.setupLogger(app);


app.start(3000);


setTimeout(() => {
    app.stop();
}, 10000);