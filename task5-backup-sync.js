const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const VARIANT = 2;
const sourceDir = `source_${VARIANT}`;
const backupDir = `backup_${VARIANT}`;

const TEXT_EXTENSIONS = ['.txt', '.js', '.json'];
const BINARY_EXTENSIONS = ['.jpg', '.png', '.gif'];
const CHUNK_SIZE = 512 * 1024; // 512 КБ
const LARGE_FILE_THRESHOLD = 1024 * 1024; // 1 МБ

// ---------- Шаг 1: создание тестовой структуры ----------
async function createTestStructure() {
    await fsPromises.mkdir(sourceDir, { recursive: true });

    const manifest = { files: [] };
    const extensions = ['.txt', '.js', '.json', '.png', '.jpg'];

    // 20 файлов в корне source_N с разными расширениями/размерами
    for (let i = 1; i <= 20; i++) {
        const ext = extensions[i % extensions.length];
        const fileName = `file${i}${ext}`;
        const filePath = path.join(sourceDir, fileName);

        // Текстовым файлам делаем "лишние пробелы", чтобы потом продемонстрировать сжатие
        const content = TEXT_EXTENSIONS.includes(ext)
            ? `Содержимое   файла    ${i}.   Тут    много   лишних   пробелов.  `.repeat(5)
            : Buffer.alloc(1024 * (i + 1), i % 256); // "бинарное" содержимое разного размера

        await fsPromises.writeFile(filePath, content);
        manifest.files.push({ name: fileName, size: (await fsPromises.stat(filePath)).size });
    }

    // 3 подпапки с файлами внутри
    for (let i = 1; i <= 3; i++) {
        const subDir = path.join(sourceDir, `sub${i}`);
        await fsPromises.mkdir(subDir, { recursive: true });
        const filePath = path.join(subDir, `nested${i}.txt`);
        await fsPromises.writeFile(filePath, `Вложенный   файл   ${i}   с   пробелами.`);
        manifest.files.push({ name: path.join(`sub${i}`, `nested${i}.txt`), size: (await fsPromises.stat(filePath)).size });
    }

    await fsPromises.writeFile(
        path.join(sourceDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    console.log(`✅ Тестовая структура создана: ${sourceDir}`);
}

// ---------- Копирование одного файла через поток ----------
function copyFileWithStream(src, dest) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(src);
        const writeStream = fs.createWriteStream(dest);
        readStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        readStream.on('error', reject);
    });
}

// ---------- Копирование текстового файла со сжатием (убираем лишние пробелы) ----------
async function copyTextFileCompressed(src, dest) {
    const content = await fsPromises.readFile(src, 'utf8');
    // Заменяем любую последовательность пробелов на один пробел
    const compressed = content.replace(/[ \t]+/g, ' ').trim();
    await fsPromises.writeFile(dest, compressed, 'utf8');
}

// ---------- Копирование большого файла чанками по 512 КБ ----------
async function copyFileInChunks(src, dest) {
    const readStream = fs.createReadStream(src, { highWaterMark: CHUNK_SIZE });
    const writeStream = fs.createWriteStream(dest);
    return new Promise((resolve, reject) => {
        readStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

// ---------- Шаг 2: копирование с фильтрацией по типу ----------
async function copyRecursive(srcDir, destDir, statsAcc) {
    await fsPromises.mkdir(destDir, { recursive: true });
    const entries = await fsPromises.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            await copyRecursive(srcPath, destPath, statsAcc);
            continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        const fileStat = await fsPromises.stat(srcPath);

        if (fileStat.size > LARGE_FILE_THRESHOLD) {
            // Большие файлы — копируем чанками по 512 КБ
            await copyFileInChunks(srcPath, destPath);
            statsAcc.streamCopied++;
        } else if (TEXT_EXTENSIONS.includes(ext)) {
            // Текстовые файлы — через поток, плюс сжатие лишних пробелов (доп. условие вариант 1-5)
            await copyTextFileCompressed(srcPath, destPath);
            statsAcc.streamCopied++;
        } else if (BINARY_EXTENSIONS.includes(ext)) {
            // Картинки — обычным способом (fs.copyFile)
            await fsPromises.copyFile(srcPath, destPath);
            statsAcc.regularCopied++;
        } else {
            // Всё остальное — тоже обычным способом
            await fsPromises.copyFile(srcPath, destPath);
            statsAcc.regularCopied++;
        }

        statsAcc.totalFiles++;
        statsAcc.totalSize += fileStat.size;
        console.log(`⏳ Скопировано: ${statsAcc.totalFiles} файлов`);
    }
}

// ---------- Подсчёт MD5 контрольной суммы (пригодится для сравнения) ----------
async function getFileHash(filePath) {
    const content = await fsPromises.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

// ---------- Шаг 3: сравнение source и backup ----------
async function collectFilesList(dir, base = dir) {
    const result = new Map();
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(base, fullPath);

        if (entry.isDirectory()) {
            const nested = await collectFilesList(fullPath, base);
            for (const [key, value] of nested) result.set(key, value);
        } else {
            const stat = await fsPromises.stat(fullPath);
            result.set(relativePath, { size: stat.size, mtime: stat.mtime.getTime() });
        }
    }
    return result;
}

async function syncCompare() {
    const sourceFiles = await collectFilesList(sourceDir);
    const backupFiles = await collectFilesList(backupDir);

    const added = [];
    const removed = [];
    const changed = [];
    let matched = 0;

    for (const [relPath, srcInfo] of sourceFiles) {
        if (!backupFiles.has(relPath)) {
            added.push(relPath); // есть в source, но нет в backup — новый файл
        } else {
            const backupInfo = backupFiles.get(relPath);
            // Сравниваем по размеру (упрощённо, без учёта сжатия текстовых файлов)
            if (srcInfo.size !== backupInfo.size) {
                changed.push(relPath);
            } else {
                matched++;
            }
        }
    }

    for (const relPath of backupFiles.keys()) {
        if (!sourceFiles.has(relPath)) {
            removed.push(relPath); // есть в backup, но нет в source
        }
    }

    const reportLines = [
        `Отчёт синхронизации: ${sourceDir} <-> ${backupDir}`,
        `Дата: ${new Date().toISOString()}`,
        '',
        `Совпадают: ${matched} файлов`,
        `Изменены: ${changed.length} файлов`,
        ...changed.map(f => `  - ${f}`),
        `Добавлены: ${added.length} файлов`,
        ...added.map(f => `  - ${f}`),
        `Удалены: ${removed.length} файлов`,
        ...removed.map(f => `  - ${f}`)
    ];

    const reportName = `sync_report_${VARIANT}.txt`;
    await fsPromises.writeFile(reportName, reportLines.join('\n'), 'utf8');

    console.log('\n📊 Сравнение директорий:');
    console.log(`  - Совпадают: ${matched} файлов`);
    console.log(`  - Изменены: ${changed.length} файлов`);
    console.log(`  - Добавлены: ${added.length} файлов`);
    console.log(`  - Удалены: ${removed.length} файлов`);
    console.log(`\n📝 Отчёт сохранён: ${reportName}`);
}

async function main() {
    try {
        const start = process.hrtime.bigint();

        console.log(`📂 Исходная директория: ${sourceDir}`);
        console.log(`📂 Директория назначения: ${backupDir}\n`);

        await createTestStructure();

        const statsAcc = { totalFiles: 0, totalSize: 0, streamCopied: 0, regularCopied: 0 };
        await copyRecursive(sourceDir, backupDir, statsAcc);

        console.log('\n✅ Копирование завершено!');
        console.log('📈 Статистика:');
        console.log(`  - Скопировано файлов: ${statsAcc.totalFiles}`);
        console.log(`  - Потоковое копирование: ${statsAcc.streamCopied} файлов`);
        console.log(`  - Обычное копирование: ${statsAcc.regularCopied} файлов`);
        console.log(`  - Общий размер: ${(statsAcc.totalSize / (1024 * 1024)).toFixed(2)} МБ`);

        await syncCompare();

        const end = process.hrtime.bigint();
        console.log(`⏱ Время выполнения: ${(Number(end - start) / 1_000_000_000).toFixed(2)} сек`);

    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
}

main();