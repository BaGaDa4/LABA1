const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';

// ---- on и once ----
console.log('=== Сравнение on и once ===');
const ticker = new EventEmitter();
let onCount = 0;
let onceCount = 0;

ticker.on('tick', (n) => {
  onCount++;
  console.log(`[tick #${n}] on-слушатель`);
});
ticker.once('tick', (n) => {
  onceCount++;
  console.log(`[tick #${n}] once-слушатель`);
});

for (let i = 1; i <= 3; i++) ticker.emit('tick', i);

console.log('');
console.log(`on-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);

// ---- управление подписками ----
console.log('\n=== Управление подписками ===');
const manager = new EventEmitter();

function listenerA() {}
function listenerB() {}
function listenerC() {}

manager.addListener('data', listenerA);
manager.on('data', listenerB);
manager.on('data', listenerC);

console.log(`Слушателей до удаления: ${manager.listenerCount('data')}`);
console.log(`Массив слушателей (listeners): [${manager.listeners('data').map((f) => f.name).join(', ')}]`);

manager.removeListener('data', listenerA);
console.log(`Слушателей после удаления одного: ${manager.listenerCount('data')}`);
console.log(`Массив слушателей после удаления: [${manager.listeners('data').map((f) => f.name).join(', ')}]`);

manager.removeAllListeners('data');
console.log(`Слушателей после removeAllListeners: ${manager.listenerCount('data')}`);

// ---- порядок вызова ----
console.log('\n=== Порядок вызова ===');
const order = new EventEmitter();
order.on('order', () => console.log(`1. Первый слушатель (группа ${GROUP})`));
order.on('order', () => console.log('2. Второй слушатель'));
order.on('order', () => console.log('3. Третий слушатель'));
order.emit('order');