const { GROUP, getPlatformInfo, platformMessage, formatUptime } = require('./collectors');

const p = getPlatformInfo();

console.log(`=== Информация о системе (группа ${GROUP}) ===`);
console.log(`Платформа:\t${p.platform}`);
console.log(`Тип ОС:\t\t${p.type}`);
console.log(`Архитектура:\t${p.arch}`);
console.log(`Версия ОС:\t${p.release}`);
console.log(`Имя хоста:\t${p.hostname}`);
console.log(`Время работы:\t${formatUptime(p.uptime)}`);
console.log('');
console.log(platformMessage(p.platform));