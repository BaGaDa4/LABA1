const fs = require('fs').promises;
const path = require('path');

const VARIANT = 2;
const fileName = `student_${VARIANT}.txt`;
const filePath = path.join('.', fileName);


function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function createStudentFile() {
    try {
        const now = formatDate(new Date());

        
        const lines = [
            'Студент: Гринкевич Егор Русланович',
            'Группа: 401 группа',
            `Вариант: ${VARIANT}`,
            `Дата: ${now}`,
            'Любимые книги:',
            '1. "Мастер и Маргарита" - М. Булгаков',
            '2. "1984" - Дж. Оруэлл',
            '3. "Преступление и наказание" - Ф. Достоевский',
            '4. "Гарри Поттер" - Дж. Роулинг',
            '5. "Война и мир" - Л. Толстой'
        ];

       
        lines.push(`Количество записей: ${lines.length}`);

        
        await fs.writeFile(filePath, lines.join('\n'), 'utf8');
        console.log(`Создан файл: ${fileName}`);

        // Читаем файл обратно и выводим в консоль
        const content = await fs.readFile(filePath, 'utf8');
        const separator = '─'.repeat(35);
        console.log('Содержимое файла:');
        console.log(separator);
        console.log(content);
        console.log(separator);

    } catch (err) {
        console.error('❌ Ошибка при работе с файлом:', err.message);
    }
}

createStudentFile();