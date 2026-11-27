const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'data');
fs.mkdirSync(dir, { recursive: true });

// 50 МБ для /stream
const big = path.join(dir, 'big-file.bin');
const chunk = Buffer.alloc(1024 * 1024, 'A');
const out = fs.createWriteStream(big);
for (let i = 0; i < 50; i++) out.write(chunk);
out.end(() => console.log(`Создан ${big} (50 МБ)`));

// ~2 МБ JSON для проверки ответа 413
const large = path.join(dir, 'large-file.json');
fs.writeFileSync(large, JSON.stringify({ data: 'x'.repeat(2 * 1024 * 1024) }));
console.log(`Создан ${large} (~2 МБ)`);