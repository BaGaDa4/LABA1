const fs = require('fs').promises;
const path = require('path');

const VARIANT = 2;
const projectRoot = path.join('.', `project_${VARIANT}`);


const folders = [
    'src',
    path.join('src', 'modules'),
    path.join('src', 'components'),
    path.join('src', 'utils'),
    'data',
    path.join('data', 'input'),
    path.join('data', 'output'),
    'temp'
];


const descriptions = {
    'src': 'Исходный код проекта',
    [path.join('src', 'modules')]: 'Модули приложения',
    [path.join('src', 'components')]: 'Компоненты интерфейса',
    [path.join('src', 'utils')]: 'Вспомогательные утилиты',
    'data': 'Данные проекта',
    [path.join('data', 'input')]: 'Входные данные',
    [path.join('data', 'output')]: 'Выходные данные',
    'temp': 'Временные файлы'
};

async function createStructure() {
    for (const folder of folders) {
        const fullPath = path.join(projectRoot, folder);
        
        await fs.mkdir(fullPath, { recursive: true });

        
        const infoPath = path.join(fullPath, 'info.txt');
        await fs.writeFile(infoPath, `Назначение папки: ${descriptions[folder]}`, 'utf8');

        
        if (VARIANT % 2 === 0) {
            const readmePath = path.join(fullPath, 'README.md');
            await fs.writeFile(readmePath, `# ${folder}\n\nСоздано: ${new Date().toISOString()}`, 'utf8');
        }
    }
    console.log(`Структура создана в папке: project_${VARIANT}`);
}


async function printTree(dirPath, prefix = '') {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        console.log(`${prefix}${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
        if (entry.isDirectory()) {
            await printTree(path.join(dirPath, entry.name), prefix + '  ');
        }
    }
}

async function moveTempIntoData() {
    const from = path.join(projectRoot, 'temp');
    const to = path.join(projectRoot, 'data', 'temp');
    
    await fs.rename(from, to);
    console.log('Папка temp перемещена внутрь data');
}

async function renameOutputToResults() {
    const from = path.join(projectRoot, 'data', 'output');
    const to = path.join(projectRoot, 'data', 'results');
    await fs.rename(from, to);
    console.log('Папка data/output переименована в data/results');
}


async function removeTempFolder() {
    const tempPath = path.join(projectRoot, 'data', 'temp');
    
    await fs.rm(tempPath, { recursive: true, force: true });
    console.log('Папка temp удалена');
}

async function main() {
    try {
        await createStructure();

        console.log('\nИсходное дерево структуры:');
        await printTree(projectRoot);

        await moveTempIntoData();
        await renameOutputToResults();
        await removeTempFolder();

        console.log('\nОбновлённое дерево структуры:');
        await printTree(projectRoot);

    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
}

main();