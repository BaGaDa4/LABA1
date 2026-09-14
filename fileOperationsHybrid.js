const fs = require('fs');
const path = require('path');
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const unlinkAsync = util.promisify(fs.unlink);
const readdirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);

class FileManagerHybrid {
    constructor(baseDir = './data-hybrid') {
        this.baseDir = baseDir;
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
            console.log(`Создана директория: ${baseDir}`);
        }
    }

    // Универсальный метод: если передан callback — используем колбэк-стиль,
    // если нет — возвращаем промис
    createFile(filename, content, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = writeFileAsync(filePath, content, 'utf8').then(() => filePath);

        if (typeof callback === 'function') {
            promise
                .then((result) => callback(null, result))
                .catch((err) => callback(err, null));
            return; // при колбэк-режиме ничего не возвращаем
        }

        return promise; // при промис-режиме возвращаем промис
    }

    readFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = readFileAsync(filePath, 'utf8');

        if (typeof callback === 'function') {
            promise
                .then((data) => callback(null, data))
                .catch((err) => callback(err, null));
            return;
        }
        return promise;
    }

    deleteFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = unlinkAsync(filePath);

        if (typeof callback === 'function') {
            promise
                .then(() => callback(null))
                .catch((err) => callback(err));
            return;
        }
        return promise;
    }

    async listFiles(callback) {
        try {
            const files = await readdirAsync(this.baseDir);
            const stats = await Promise.all(
                files.map(async (file) => {
                    const s = await statAsync(path.join(this.baseDir, file));
                    return { name: file, isFile: s.isFile() };
                })
            );
            const result = stats.filter(s => s.isFile).map(s => s.name);

            if (typeof callback === 'function') {
                callback(null, result);
                return;
            }
            return result;
        } catch (err) {
            if (typeof callback === 'function') {
                callback(err, null);
                return;
            }
            throw err; // если промис-режим — пробрасываем ошибку дальше
        }
    }
}

module.exports = FileManagerHybrid;