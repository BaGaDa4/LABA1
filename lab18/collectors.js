const os = require('os');

const GROUP = 'ББМО-01-23';
const toGB = (bytes) => (bytes / 1024 ** 3).toFixed(2);

function formatUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d ? d + ' д ' : ''}${h} ч ${m} мин ${s} сек`;
}

// ---- Задание 1 ----
function getPlatformInfo() {
  return {
    platform: os.platform(),
    type: os.type(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    uptime: os.uptime(),
  };
}

function platformMessage(platform) {
  switch (platform) {
    case 'win32': return 'Вы работаете в Windows';
    case 'linux': return 'Вы работаете в Linux';
    case 'darwin': return 'Вы работаете в macOS';
    default: return 'Неизвестная платформа';
  }
}

// ---- Задание 2 ----
function getCpuInfo() {
  const cpus = os.cpus();
  const speeds = cpus.map((c) => c.speed);
  const avgSpeed = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);
  return { count: cpus.length, model: cpus[0].model.trim(), speeds, avgSpeed };
}

function getMemoryInfo(simulateLow = false) {
  const total = os.totalmem();
  const free = simulateLow ? total * 0.1 : os.freemem();   // simulateLow нужен только для скриншота
  const used = total - free;
  return {
    total, free, used,
    usedPercent: (used / total) * 100,
    freePercent: (free / total) * 100,
  };
}

function getLoadAvg() {
  return os.loadavg();   // [1 мин, 5 мин, 15 мин]; в Windows всегда [0, 0, 0]
}

// ---- Задание 3 ----
function famName(f) {
  return f === 4 || f === 'IPv4' ? 'IPv4' : 'IPv6';
}

function maskMac(mac) {
  const p = mac.toUpperCase().split(':');
  return p.length === 6 ? [...p.slice(0, 3), '**', '**', '**'].join(':') : mac;
}

function getNetworkInfo() {
  const raw = os.networkInterfaces();
  const interfaces = Object.entries(raw).map(([name, list]) => ({
    name,
    addresses: list.map((a) => ({
      family: famName(a.family),
      address: a.address,
      mac: maskMac(a.mac),
      internal: a.internal,
    })),
  }));

  let main = null;   // первый внешний IPv4
  for (const i of interfaces) {
    const a = i.addresses.find((x) => x.family === 'IPv4' && !x.internal);
    if (a) { main = { name: i.name, address: a.address }; break; }
  }
  return { interfaces, main };
}

function getUserInfo() {
  const u = os.userInfo();
  const isWin = os.platform() === 'win32';
  return {
    username: u.username,
    uid: u.uid,
    gid: u.gid,
    homedir: u.homedir,
    shell: u.shell || (isWin ? process.env.ComSpec : null),
    isWin,
    isRoot: !isWin && u.uid === 0,
  };
}

// ---- Задание 4 ----
function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total, busy: total - idle };
}

function cpuLoad(prev, next) {
  const busyDiff = next.busy - prev.busy;
  const totalDiff = next.total - prev.total;
  return { busyDiff, totalDiff, percent: totalDiff > 0 ? (busyDiff / totalDiff) * 100 : 0 };
}

function collectSnapshot(simulateLow = false) {
  return {
    timestamp: new Date().toISOString(),
    group: GROUP,
    platform: getPlatformInfo(),
    cpu: getCpuInfo(),
    memory: getMemoryInfo(simulateLow),
    loadavg: getLoadAvg(),
    network: getNetworkInfo(),
    user: getUserInfo(),
  };
}

module.exports = {
  GROUP, toGB, formatUptime,
  getPlatformInfo, platformMessage,
  getCpuInfo, getMemoryInfo, getLoadAvg,
  getNetworkInfo, getUserInfo,
  cpuTimes, cpuLoad, collectSnapshot,
};