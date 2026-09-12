const fs = require('fs');

function setupLogger(app) {
    const events = ['server:started', 'server:stopped', 'request:received'];

    events.forEach((eventName) => {
        app.on(eventName, (data) => {
            const time = new Date().toISOString();
            const dataStr = data ? JSON.stringify(data) : '';
            const line = `[${time}] ${eventName}: ${dataStr}\n`;

            fs.appendFile('logs.txt', line, (err) => {
                if (err) console.error('Ошибка записи в лог:', err);
            });
        });
    });
}

module.exports = { setupLogger };