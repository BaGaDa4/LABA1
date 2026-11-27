const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const TAG = `[${GROUP}]`;

// ---------- Система плагинов ----------
class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
  }

  register(plugin) {
    this.plugins.set(plugin.name, plugin);
    this.emit('plugin:registered', plugin.name);
    if (plugin.init) plugin.init(this);
  }

  unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    if (plugin.destroy) plugin.destroy(this);
    this.plugins.delete(name);
    this.emit('plugin:removed', name);
    return true;
  }
}

const LoggerPlugin = {
  name: 'LoggerPlugin',
  init(manager) {
    this.handler = (msg) => console.log(`[LoggerPlugin] ${msg}`);
    manager.on('log', this.handler);
  },
  destroy(manager) {
    manager.removeListener('log', this.handler);
  },
};

const AlertPlugin = {
  name: 'AlertPlugin',
  init(manager) {
    this.handler = (msg) => console.log(`[AlertPlugin] ${msg}`);
    manager.on('alert', this.handler);
  },
  destroy(manager) {
    manager.removeListener('alert', this.handler);
  },
};

console.log('=== Система плагинов ===');
const pm = new PluginManager();

// newListener срабатывает ДО добавления каждого слушателя, removeListener — ПОСЛЕ удаления
pm.on('newListener', (event) => console.log(`[newListener] Добавлен слушатель "${event}"`));
pm.on('removeListener', (event) => console.log(`[removeListener] Удалён слушатель "${event}"`));

pm.on('plugin:registered', (name) => console.log(`[PLUGIN] Зарегистрирован: ${name}`));
pm.on('plugin:removed', (name) => console.log(`[PLUGIN] Удалён: ${name}`));

console.log('');
pm.register(LoggerPlugin);
console.log('');
pm.register(AlertPlugin);
console.log('');
pm.unregister('LoggerPlugin');

pm.emit('alert', 'Проверка работы AlertPlugin');

// ---------- Утечка памяти ----------
console.log('\n=== Демонстрация утечки ===');
const leak = new EventEmitter();

for (let i = 0; i < 10; i++) leak.on('data', () => {});
console.log(`Слушателей до: ${leak.listenerCount('data')}`);

const handlers = [];
for (let i = 0; i < 1000; i++) {
  const h = () => {};
  handlers.push(h);
  leak.on('data', h);        // слушатели копятся и не удаляются — утечка
}
console.log(`Слушателей после добавления 1000: ${leak.listenerCount('data')}`);

handlers.forEach((h) => leak.removeListener('data', h));
console.log(`Слушателей после removeListener (1000 шт.): ${leak.listenerCount('data')}`);

leak.removeAllListeners('data');
console.log(`Слушателей после removeAllListeners: ${leak.listenerCount('data')}`);

// ---------- Асинхронные слушатели ----------
console.log('\n=== Асинхронные слушатели ===');
const asyncEmitter = new EventEmitter();

asyncEmitter.on('work', async () => {
  await new Promise((r) => setTimeout(r, 100));
  console.log(`${TAG} async-слушатель завершён через 100ms`);
});

asyncEmitter.on('work', () => {
  setImmediate(() => console.log(`${TAG} setImmediate: отложенное выполнение`));
});

asyncEmitter.emit('work');
console.log(`${TAG} emit вызван (не ждёт async-слушатель)`);