const FileManagerHybrid = require('./fileOperationsHybrid');

const fm = new FileManagerHybrid('./test-data-hybrid');

console.log('=== ТЕСТ 1: колбэк-стиль ===');
fm.createFile('a.txt', 'Данные через колбэк', (err, filePath) => {
    if (err) {
        console.error('❌', err.message);
        return;
    }
    console.log('✅ Создан (колбэк):', filePath);

    fm.deleteFile('a.txt', (err) => {
        if (err) console.error('❌', err.message);
        else console.log('✅ Удалён (колбэк): a.txt');
    });
});

console.log('\n=== ТЕСТ 2: промис-стиль ===');
async function testPromiseStyle() {
    try {
        const filePath = await fm.createFile('b.txt', 'Данные через промис');
        console.log('✅ Создан (промис):', filePath);

        await fm.deleteFile('b.txt');
        console.log('✅ Удалён (промис): b.txt');
    } catch (err) {
        console.error('❌', err.message);
    }
}
testPromiseStyle();