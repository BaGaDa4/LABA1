const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const readline = require('readline');

const VARIANT = 2;
const LINE_COUNT = 100000;
const dataFileName = `data_${VARIANT}.txt`;
const processedFileName = `processed_${VARIANT}.txt`;

// Шаг 1: генерация файла, если он ещё не существует
async function generateFileIfNeeded() {
    try {
        await fsPromises.access(dataFileName); // проверяем, существует ли файл
        console.log(`Файл ${dataFileName} уже существует, генерация пропущена`);
    } catch {
        // access выбрасывает ошибку, если файла нет — значит, генерируем
        console.log(`Генерация файла ${dataFileName}...`);

        // Пишем через поток, чтобы не собирать 100 000 строк в одну огромную строку в памяти
        const writeStream = fs.createWriteStream(dataFileName);

        for (let i = 1; i <= LINE_COUNT; i++) {
            const randomNum = Math.floor(Math.random() * 1000) + 1; // от 1 до 1000
            writeStream.write(`${i}, ${randomNum}, Вариант ${VARIANT}\n`);
        }

        writeStream.end();

        // Ждём, пока поток реально допишет данные на диск
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        console.log(`Файл ${dataFileName} создан (${LINE_COUNT} строк)`);
    }
}

// Шаг 2: потоковая обработка файла
async function processFile() {
    const stats = await fsPromises.stat(dataFileName);
    const sizeInMB = stats.size / (1024 * 1024);
    console.log(`\n📊 Обработка файла: ${dataFileName}`);
    console.log(`Размер файла: ${sizeInMB.toFixed(2)} МБ`);

    return new Promise((resolve, reject) => {
        // highWaterMark: 64 * 1024 — буфер потока чтения ровно 64 КБ, как требует задание
        const readStream = fs.createReadStream(dataFileName, {
            encoding: 'utf8',
            highWaterMark: 64 * 1024
        });

        // readline построчно разбирает поток, не загружая весь файл в память целиком
        const rl = readline.createInterface({ input: readStream });

        let sum = 0;
        let max = -Infinity;
        let min = Infinity;
        let count = 0;
        let evenCount = 0; // доп. условие для вариантов 1-5
        let oddCount = 0;

        let lastPercentReported = 0;

        rl.on('line', (line) => {
            const parts = line.split(',');
            if (parts.length < 2) return; // пропускаем пустые/некорректные строки

            const number = parseInt(parts[1].trim(), 10);
            if (isNaN(number)) return;

            sum += number;
            if (number > max) max = number;
            if (number < min) min = number;
            count++;

            if (number % 2 === 0) evenCount++;
            else oddCount++;

            // Прогресс каждые 10%
            const percent = Math.floor((count / LINE_COUNT) * 100);
            if (percent >= lastPercentReported + 10) {
                lastPercentReported = percent;
                console.log(`⏳ Прогресс: ${percent}% (${count.toLocaleString()} строк обработано)`);
            }
        });

        rl.on('close', async () => {
            const average = sum / count;

            const resultLines = [
                `Всего строк: ${count.toLocaleString()}`,
                `Сумма чисел: ${sum.toLocaleString()}`,
                `Среднее значение: ${average.toFixed(2)}`,
                `Максимальное число: ${max}`,
                `Минимальное число: ${min}`,
                `Чётных чисел: ${evenCount.toLocaleString()}`,
                `Нечётных чисел: ${oddCount.toLocaleString()}`
            ];

            try {
                await fsPromises.writeFile(processedFileName, resultLines.join('\n'), 'utf8');
                console.log('✅ Обработка завершена!\n');
                console.log('📈 Результаты:');
                resultLines.forEach(line => console.log(`  - ${line}`));
                console.log(`\n💾 Результаты сохранены в: ${processedFileName}`);
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        rl.on('error', reject);
    });
}

async function main() {
    try {
        const start = process.hrtime.bigint();

        await generateFileIfNeeded();
        await processFile();

        const end = process.hrtime.bigint();
        const seconds = Number(end - start) / 1_000_000_000;
        console.log(`⏱ Время выполнения: ${seconds.toFixed(2)} сек`);

    } catch (err) {
        console.error('❌ Ошибка обработки:', err.message);
    }
}

main();