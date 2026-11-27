const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const { GROUP, toGB, collectSnapshot, cpuTimes, cpuLoad, getMemoryInfo } = require('./collectors');

const LOG_FILE = path.join(process.cwd(), 'monitor.log');
const INTERVAL_MS = 2000;
const stress = process.argv.includes('--stress');   // нагрузка на CPU для демонстрации предупреждений

// --- 1. Первичный сбор данных ---
const snapshot = collectSnapshot();
console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.`);
console.log('');
console.log('--- Первичный сбор данных ---');
console.log(`Метка времени: ${snapshot.timestamp}`);
console.log(`Группа: ${snapshot.group}`);
console.log(`Платформа: ${snapshot.platform.platform} (${snapshot.platform.type}, ${snapshot.platform.arch}), хост ${snapshot.platform.hostname}`);
console.log(`CPU: ${snapshot.cpu.count} ядер, ${snapshot.cpu.model}, средняя частота ${snapshot.cpu.avgSpeed} МГц`);
console.log(`RAM: всего ${toGB(snapshot.memory.total)} ГБ, свободно ${toGB(snapshot.memory.free)} ГБ`);
console.log(`Сеть: ${snapshot.network.main ? `${snapshot.network.main.name} (${snapshot.network.main.address})` : 'нет внешнего интерфейса'}`);
console.log(`Пользователь: ${snapshot.user.username}`);
console.log('');

// --- нагрузка (по флагу) ---
const children = [];
if (stress) {
  for (let i = 0; i < os.cpus().length; i++) {
    children.push(spawn(process.execPath, ['-e', 'while(true){}'], { stdio: 'ignore' }));
  }
  console.log(`(режим --stress: запущено ${children.length} процессов нагрузки)`);
}

// --- логирование ---
let warnings = 0;
function pad(n) { return String(n).padStart(2, '0'); }
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function logWarning(text) {
  warnings++;
  fs.appendFileSync(LOG_FILE, `[${stamp()}] [${GROUP}] Предупреждение: ${text}\n`);
}

// --- 2–3. Периодический мониторинг ---
let prev = cpuTimes();
let first = true;

const timer = setInterval(() => {
  const next = cpuTimes();
  const load = cpuLoad(prev, next);
  prev = next;
  const mem = getMemoryInfo();

  if (first) {
    console.log(`Расчёт CPU: busy_diff=${load.busyDiff.toFixed(0)}, total_diff=${load.totalDiff.toFixed(0)} -> ${load.busyDiff.toFixed(0)} / ${load.totalDiff.toFixed(0)} * 100 = ${load.percent.toFixed(1)}%`);
    console.log('');
    first = false;
  }

  // --- 4. Адаптивное поведение ---
  let mark = '';
  if (load.percent > 80) {
    mark = '  ⚠⚠ критично';
    logWarning(`критическая загрузка CPU ${load.percent.toFixed(1)}%`);
  } else if (load.percent > 50) {
    mark = '  ⚠ предупреждение';
    logWarning(`повышенная загрузка CPU ${load.percent.toFixed(1)}%`);
  }
  if (mem.freePercent < 10) {
    mark += '  ⚠ мало памяти';
    logWarning(`свободной памяти меньше 10% (${mem.freePercent.toFixed(1)}%)`);
  }

  const line = `CPU: ${load.percent.toFixed(1)}% | RAM: ${mem.usedPercent.toFixed(1)}% (${toGB(mem.free)} ГБ свободно)${mark}`;
  process.stdout.write('\r' + line.padEnd(95));   // перерисовка в одной строке
}, INTERVAL_MS);

// --- выход по Ctrl+C ---
function shutdown() {
  clearInterval(timer);
  children.forEach((c) => c.kill());
  console.log(`\nМониторинг остановлен. Предупреждений: ${warnings}`);
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('exit', () => children.forEach((c) => c.kill()));