const fs = require('fs').promises;
const path = require('path');

const VARIANT = 2;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 МБ — файлы больше этого размера игнорируем

// Директория берётся из аргументов командной строки, либо текущая
const targetDir = process.argv[2] || '.';

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' КБ';
    return bytes + ' байт';
}

async function scanDirectory(dirPath, stats) {
    let entries;
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (err) {
        console.error(`⚠️  Не удалось прочитать папку ${dirPath}: ${err.message}`);
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            stats.folderCount++;
            await scanDirectory(fullPath, stats); // рекурсивный обход подпапок
        } else if (entry.isFile()) {
            try {
                const fileStat = await fs.stat(fullPath);

                // Доп. условие: игнорируем файлы больше 10 МБ
                if (fileStat.size > MAX_SIZE_BYTES) continue;

                stats.fileCount++;
                stats.totalSize += fileStat.size;

                const ext = path.extname(entry.name).toLowerCase() || 'без расширения';
                if (!stats.extensions[ext]) {
                    stats.extensions[ext] = { count: 0, size: 0 };
                }
                stats.extensions[ext].count++;
                stats.extensions[ext].size += fileStat.size;

                stats.allFiles.push({
                    name: entry.name,
                    path: fullPath,
                    size: fileStat.size
                });
            } catch (err) {
                console.error(`⚠️  Не удалось получить статистику файла ${fullPath}: ${err.message}`);
            }
        }
    }
}

async function analyze() {
    try {
        const stats = {
            fileCount: 0,
            folderCount: 0,
            totalSize: 0,
            extensions: {},
            allFiles: []
        };

        console.log(`🔍 Анализ директории: ${targetDir}\n`);
        await scanDirectory(targetDir, stats);

        console.log(`📁 Общее количество папок: ${stats.folderCount}`);
        console.log(`📄 Общее количество файлов: ${stats.fileCount}`);
        console.log(`💾 Общий размер: ${formatSize(stats.totalSize)} (${stats.totalSize.toLocaleString()} байт)\n`);

        console.log('📊 Расширения файлов:');
        for (const [ext, data] of Object.entries(stats.extensions)) {
            console.log(`  ${ext}: ${data.count} файлов (${formatSize(data.size)})`);
        }

        // Сортировка по размеру для топ-5
        const sortedBySize = [...stats.allFiles].sort((a, b) => b.size - a.size);
        const top5Largest = sortedBySize.slice(0, 5);
        const top5Smallest = sortedBySize.slice(-5).reverse();

        console.log('\n🔝 Топ-5 самых больших файлов:');
        top5Largest.forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`);
        });

        console.log('\n🔽 Топ-5 самых маленьких файлов:');
        top5Smallest.forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`);
        });

        // Формируем JSON-отчёт
        const report = {
            directory: targetDir,
            date: new Date().toISOString(),
            totalFolders: stats.folderCount,
            totalFiles: stats.fileCount,
            totalSizeBytes: stats.totalSize,
            totalSizeFormatted: formatSize(stats.totalSize),
            extensions: stats.extensions,
            top5Largest,
            top5Smallest
        };

        const reportName = `report_${VARIANT}.json`;
        await fs.writeFile(reportName, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\n📝 Отчёт сохранён: ${reportName}`);

    } catch (err) {
        console.error('❌ Ошибка анализа:', err.message);
    }
}

analyze();