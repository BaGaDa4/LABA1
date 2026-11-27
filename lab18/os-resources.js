const os = require('os');
const { GROUP, toGB, getCpuInfo, getMemoryInfo, getLoadAvg } = require('./collectors');

const simulateLow = process.argv.includes('--simulate-low');

const cpu = getCpuInfo();
console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cpu.count}`);
console.log(`Модель процессора: ${cpu.model}`);
cpu.speeds.forEach((s, i) => console.log(`  Ядро ${i}: ${s} МГц`));
console.log(`Средняя частота: ${cpu.avgSpeed} МГц`);

const mem = getMemoryInfo(simulateLow);
console.log('');
console.log('=== Информация о памяти ===');
console.log(`Общий объём: ${toGB(mem.total)} ГБ`);
console.log(`Свободно: ${toGB(mem.free)} ГБ`);
console.log(`Использовано: ${toGB(mem.used)} ГБ (${mem.usedPercent.toFixed(1)}%)`);
if (simulateLow) console.log('(режим симуляции: свободной памяти 10%)');

console.log('');
console.log('=== Средняя загрузка системы (1, 5, 15 мин) ===');
const la = getLoadAvg();
console.log(`[${la.map((x) => x.toFixed(2)).join(', ')}]`);
if (os.platform() === 'win32') {
  console.log('Примечание: в Windows средняя загрузка недоступна (os.loadavg() возвращает нули)');
}

console.log('');
console.log(`Группа: ${GROUP}`);
if (mem.freePercent < 20) {
  console.log(`⚠ Предупреждение: свободной памяти меньше 20% (${mem.freePercent.toFixed(1)}%)`);
} else {
  console.log('Память в норме');
}